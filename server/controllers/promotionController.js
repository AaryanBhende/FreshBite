import pool from '../config/db.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isEnabled = (value) => value === true || value === 1 || value === '1' || value === 'true';
const promoSlotLockName = (location) => `freshbite-promo-menu-${location}`;

const lockPromoSlots = async (connection, locations) => {
  const acquired = [];
  for (const location of [...new Set(locations)].sort()) {
    const [[{ acquired: result }]] = await connection.query('SELECT GET_LOCK(?, 5) AS acquired', [promoSlotLockName(location)]);
    if (Number(result) !== 1) {
      await unlockPromoSlots(connection, acquired);
      const error = new Error(`The ${location.replaceAll('_', ' ')} slot is being updated. Try again.`);
      error.code = 'PROMO_SLOT_LOCK_TIMEOUT';
      throw error;
    }
    acquired.push(location);
  }
  return acquired;
};

const unlockPromoSlots = async (connection, locations) => {
  for (const location of [...locations].reverse()) {
    await connection.query('SELECT RELEASE_LOCK(?)', [promoSlotLockName(location)]);
  }
};

const findOccupiedSlots = async (connection, locations, exceptPromoId = null) => {
  if (!locations.length) return [];
  const placeholders = locations.map(() => '?').join(',');
  const params = [...locations, ...(exceptPromoId == null ? [] : [exceptPromoId])];
  const exceptClause = exceptPromoId == null ? '' : 'AND p.id <> ?';
  const [rows] = await connection.query(
    `SELECT DISTINCT a.display_location, p.code
     FROM announcements a JOIN promotions p ON p.id = a.linked_promo_id
     WHERE a.display_page = 'menu' AND a.display_location IN (${placeholders})
       AND a.is_advertised = 1 AND a.is_active = 1 AND p.is_active = 1 AND p.is_deleted = 0
       ${exceptClause}`,
    params
  );
  return rows;
};

const slotConflictMessage = (rows) => `The ${rows[0].display_location.replaceAll('_', ' ')} slot is already assigned to active promotion ${rows[0].code}.`;

const deleteUploadedImage = (url) => {
  if (!url?.startsWith('/uploads/promos/')) return;
  const imagePath = path.join(__dirname, '../../client/public', url.slice(1));
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
};

const calculateDiscount = (promotion, subtotal) => {
  const raw = promotion.discount_type === 'percentage'
    ? subtotal * Number(promotion.discount_value) / 100
    : Number(promotion.discount_value);
  const cap = promotion.max_discount_amount == null ? subtotal : Number(promotion.max_discount_amount);
  return Number(Math.min(subtotal, raw, cap).toFixed(2));
};

export const validatePromotion = async (req, res) => {
  const code = String(req.body.promo_code ?? req.body.code ?? '').trim().toUpperCase();
  const subtotal = Number(req.body.cart_total ?? req.body.subtotal);
  const userId = req.user?.id || req.body.user_id || null;
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ valid: false, error: 'Enter a promotion code and valid cart total.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, code, description, discount_type, discount_value, min_order_amount,
              max_discount_amount, usage_limit, times_used
       FROM promotions
       WHERE code = ? AND is_active = 1 AND is_deleted = 0
         AND (start_date IS NULL OR start_date <= CURRENT_DATE())
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE())`,
      [code]
    );
    const promotion = rows[0];
    if (!promotion) return res.status(404).json({ valid: false, error: 'This promotion code is invalid or not currently active.' });
    if (promotion.usage_limit != null && Number(promotion.times_used) >= Number(promotion.usage_limit)) {
      return res.status(400).json({ valid: false, error: 'This promotion has reached its usage limit.' });
    }
    if (subtotal < Number(promotion.min_order_amount)) {
      return res.status(400).json({ valid: false, error: `Minimum order for this code is ₹${Number(promotion.min_order_amount).toFixed(2)}.` });
    }
    if (userId) {
      const [uses] = await pool.query(
        'SELECT 1 FROM order_promotions WHERE promotion_id = ? AND user_id = ? LIMIT 1',
        [promotion.id, userId]
      );
      if (uses.length) return res.status(400).json({ valid: false, error: 'You have already used this promotion.' });
    }

    const discount = calculateDiscount(promotion, subtotal);
    res.json({
      valid: true,
      code: promotion.code,
      description: promotion.description,
      discount_amount: discount,
      grand_total: Number((subtotal - discount).toFixed(2)),
      // Retain the original checkout response names for existing clients.
      discount,
      total: Number((subtotal - discount).toFixed(2)),
    });
  } catch (error) {
    console.error('Promotion validation failed:', error.message);
    res.status(500).json({ error: 'Could not validate promotion.' });
  }
};

export const getPromotions = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, SUM(a.is_advertised = 1) AS announcement_count,
              MAX(a.title) AS announcement_title, MAX(a.message) AS announcement_message,
              MAX(a.background_image_url) AS background_image_url,
              GROUP_CONCAT(DISTINCT a.display_location) AS display_locations,
              (SELECT COUNT(*) FROM order_promotions op WHERE op.promotion_id = p.id) AS redeemed_count
       FROM promotions p LEFT JOIN announcements a ON a.linked_promo_id = p.id
       WHERE p.is_deleted = 0
       GROUP BY p.id ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Could not load promotions.' });
  }
};

export const createPromotion = async (req, res) => {
  const {
    code, description = '', discount_type: discountType, discount_value: discountValue,
    min_order_amount: minOrderAmount = 0, max_discount_amount: maxDiscountAmount = null,
    start_date: startDate = null, expiry_date: expiryDate = null, usage_limit: usageLimit = null,
    is_active: isActive = true, advertise = false, announcement_title: announcementTitle = '',
    announcement_message: announcementMessage = '',
  } = req.body;
  const normalizedCode = String(code || '').trim().toUpperCase();
  const value = Number(discountValue);
  const minimum = Number(minOrderAmount);
  const discountCap = maxDiscountAmount === '' || maxDiscountAmount == null ? null : Number(maxDiscountAmount);
  if (!normalizedCode || normalizedCode.length > 50 || !['percentage', 'fixed'].includes(discountType) || !Number.isFinite(value) || value <= 0 || (discountType === 'percentage' && value > 100)) {
    return res.status(400).json({ error: 'Enter a code and valid discount type and value.' });
  }
  if (!Number.isFinite(minimum) || minimum < 0 || (discountCap !== null && (!Number.isFinite(discountCap) || discountCap <= 0))) {
    return res.status(400).json({ error: 'Minimum order must be zero or more and the discount cap must be greater than zero.' });
  }
  if (startDate && expiryDate && startDate > expiryDate) {
    return res.status(400).json({ error: 'Expiry date must be the same as or later than the start date.' });
  }
  const locations = isEnabled(advertise) ? ['hero_section'] : [];
  if (isEnabled(advertise) && (!announcementTitle.trim() || !announcementMessage.trim())) {
    return res.status(400).json({ error: 'Add announcement title and message.' });
  }
  if (usageLimit !== null && usageLimit !== '' && (!Number.isInteger(Number(usageLimit)) || Number(usageLimit) < 1)) {
    return res.status(400).json({ error: 'Usage limit must be a positive whole number.' });
  }

  const connection = await pool.getConnection();
  let lockedSlots = [];
  try {
    await connection.beginTransaction();
    if (isEnabled(advertise) && isEnabled(isActive)) {
      lockedSlots = await lockPromoSlots(connection, locations);
      const conflicts = await findOccupiedSlots(connection, locations);
      if (conflicts.length) {
        await connection.rollback();
        return res.status(409).json({ error: slotConflictMessage(conflicts) });
      }
    }
    const [result] = await connection.query(
      `INSERT INTO promotions
       (code, description, discount_type, discount_value, min_order_amount, max_discount_amount,
        start_date, expiry_date, usage_limit, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [normalizedCode, String(description).trim(), discountType, value, minimum,
        discountCap, startDate || null, expiryDate || null,
        usageLimit === '' ? null : usageLimit, isEnabled(isActive) ? 1 : 0]
    );
    if (isEnabled(advertise)) {
      const imageUrl = req.file ? `/uploads/promos/${req.file.filename}` : null;
      const announcementRows = locations.map((location) => [announcementTitle.trim(), announcementMessage.trim(), result.insertId, 'menu', location, imageUrl, isEnabled(isActive) ? 1 : 0, 1]);
      await connection.query(
        'INSERT INTO announcements (title, message, linked_promo_id, display_page, display_location, background_image_url, is_active, is_advertised) VALUES ?',
        [announcementRows]
      );
    }
    await connection.commit();
    if (!isEnabled(advertise) && req.file) deleteUploadedImage(`/uploads/promos/${req.file.filename}`);
    res.status(201).json({ success: true, id: result.insertId, code: normalizedCode });
  } catch (error) {
    await connection.rollback();
    if (req.file) deleteUploadedImage(`/uploads/promos/${req.file.filename}`);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A promotion with this code already exists.' });
    if (error.code === 'PROMO_SLOT_LOCK_TIMEOUT') return res.status(409).json({ error: error.message });
    console.error('Promotion creation failed:', error.message);
    res.status(500).json({ error: 'Could not create promotion.' });
  } finally {
    await unlockPromoSlots(connection, lockedSlots);
    connection.release();
  }
};

export const updatePromotion = async (req, res) => {
  const id = req.params.id;
  const {
    code, description = '', discount_type: discountType, discount_value: discountValue,
    min_order_amount: minOrderAmount = 0, max_discount_amount: maxDiscountAmount = null,
    start_date: startDate = null, expiry_date: expiryDate = null, usage_limit: usageLimit = null,
    advertise: advertiseValue = false, announcement_title: announcementTitle = '', announcement_message: announcementMessage = '',
    background_image_url: existingImageUrl = null,
  } = req.body;
  const normalizedCode = String(code || '').trim().toUpperCase();
  const value = Number(discountValue);
  const minimum = Number(minOrderAmount);
  const cap = maxDiscountAmount === '' || maxDiscountAmount == null ? null : Number(maxDiscountAmount);
  const advertise = isEnabled(advertiseValue);
  const locations = advertise ? ['hero_section'] : [];
  if (!normalizedCode || normalizedCode.length > 50 || !['percentage', 'fixed'].includes(discountType) || !Number.isFinite(value) || value <= 0 || (discountType === 'percentage' && value > 100)) {
    return res.status(400).json({ error: 'Enter a code and valid discount type and value.' });
  }
  if (!Number.isFinite(minimum) || minimum < 0 || (cap !== null && (!Number.isFinite(cap) || cap <= 0)) || (startDate && expiryDate && startDate > expiryDate)) {
    return res.status(400).json({ error: 'Check the minimum, maximum discount, and date values.' });
  }
  if (usageLimit !== null && usageLimit !== '' && (!Number.isInteger(Number(usageLimit)) || Number(usageLimit) < 1)) {
    return res.status(400).json({ error: 'Usage limit must be a positive whole number.' });
  }
  if (advertise && (!String(announcementTitle).trim() || !String(announcementMessage).trim())) {
    return res.status(400).json({ error: 'Add announcement title and message.' });
  }

  const connection = await pool.getConnection();
  let oldImageUrl;
  let lockedSlots = [];
  try {
    await connection.beginTransaction();
    const [currentRows] = await connection.query('SELECT is_active FROM promotions WHERE id = ? AND is_deleted = 0 FOR UPDATE', [id]);
    if (!currentRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    const [currentAnnouncements] = await connection.query('SELECT id, display_location, background_image_url FROM announcements WHERE linked_promo_id = ? ORDER BY id', [id]);
    lockedSlots = await lockPromoSlots(connection, [...locations, ...currentAnnouncements.map((announcement) => announcement.display_location)]);
    if (advertise && Number(currentRows[0].is_active)) {
      const conflicts = await findOccupiedSlots(connection, locations, id);
      if (conflicts.length) {
        await connection.rollback();
        if (req.file) deleteUploadedImage(`/uploads/promos/${req.file.filename}`);
        return res.status(409).json({ error: slotConflictMessage(conflicts) });
      }
    }
    oldImageUrl = currentAnnouncements.find((announcement) => announcement.background_image_url)?.background_image_url;
    const imageUrl = req.file ? `/uploads/promos/${req.file.filename}` : (existingImageUrl || oldImageUrl || null);
    await connection.query(
      `UPDATE promotions SET code = ?, description = ?, discount_type = ?, discount_value = ?,
       min_order_amount = ?, max_discount_amount = ?, start_date = ?, expiry_date = ?, usage_limit = ?
       WHERE id = ?`,
      [normalizedCode, String(description).trim(), discountType, value, minimum, cap,
        startDate || null, expiryDate || null, usageLimit === '' ? null : usageLimit, id]
    );
    if (advertise) {
      const active = Number(currentRows[0].is_active);
      for (let index = 0; index < locations.length; index += 1) {
        const values = [String(announcementTitle).trim(), String(announcementMessage).trim(), 'menu', locations[index], imageUrl, active];
        if (currentAnnouncements[index]) {
          await connection.query(
            `UPDATE announcements SET title = ?, message = ?, display_page = ?, display_location = ?,
             background_image_url = ?, is_active = ?, is_advertised = 1 WHERE id = ?`,
            [...values, currentAnnouncements[index].id]
          );
        } else {
          await connection.query(
            `INSERT INTO announcements (title, message, display_page, display_location, background_image_url, is_active, linked_promo_id, is_advertised)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [...values, id]
          );
        }
      }
      const retainedIds = currentAnnouncements.slice(0, locations.length).map((announcement) => announcement.id);
      if (retainedIds.length) {
        await connection.query('UPDATE announcements SET is_advertised = 0, is_active = 0 WHERE linked_promo_id = ? AND id NOT IN (?)', [id, retainedIds]);
      } else {
        await connection.query('UPDATE announcements SET is_advertised = 0, is_active = 0 WHERE linked_promo_id = ?', [id]);
      }
    } else {
      await connection.query('UPDATE announcements SET is_advertised = 0, is_active = 0 WHERE linked_promo_id = ?', [id]);
    }
    await connection.commit();
    if (advertise && req.file && oldImageUrl && oldImageUrl !== imageUrl) {
      deleteUploadedImage(oldImageUrl);
    }
    res.json({ success: true, code: normalizedCode });
  } catch (error) {
    await connection.rollback();
    if (req.file) deleteUploadedImage(`/uploads/promos/${req.file.filename}`);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A promotion with this code already exists.' });
    if (error.code === 'PROMO_SLOT_LOCK_TIMEOUT') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: 'Could not update promotion.' });
  } finally {
    await unlockPromoSlots(connection, lockedSlots);
    connection.release();
  }
};

export const deletePromotion = async (req, res) => {
  const connection = await pool.getConnection();
  let lockedSlots = [];
  try {
    await connection.beginTransaction();
    const [promotions] = await connection.query('SELECT id FROM promotions WHERE id = ? AND is_deleted = 0 FOR UPDATE', [req.params.id]);
    if (!promotions.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    const [announcements] = await connection.query('SELECT display_location FROM announcements WHERE linked_promo_id = ?', [req.params.id]);
    lockedSlots = await lockPromoSlots(connection, announcements.map((announcement) => announcement.display_location));
    const [[{ redeemed_count: redeemedCount }]] = await connection.query(
      'SELECT COUNT(*) AS redeemed_count FROM order_promotions WHERE promotion_id = ?', [req.params.id]
    );
    await connection.query('UPDATE promotions SET is_deleted = 1, is_active = 0 WHERE id = ?', [req.params.id]);
    await connection.query('UPDATE announcements SET is_active = 0 WHERE linked_promo_id = ?', [req.params.id]);
    await connection.commit();
    res.json({ success: true, redeemed_count: Number(redeemedCount) });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'PROMO_SLOT_LOCK_TIMEOUT') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: 'Could not delete promotion.' });
  } finally {
    await unlockPromoSlots(connection, lockedSlots);
    connection.release();
  }
};

export const setPromotionActive = async (req, res) => {
  const active = req.body.is_active;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'is_active must be true or false.' });
  const connection = await pool.getConnection();
  let lockedSlots = [];
  try {
    await connection.beginTransaction();
    const [promotions] = await connection.query('SELECT id FROM promotions WHERE id = ? AND is_deleted = 0 FOR UPDATE', [req.params.id]);
    if (!promotions.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    const [announcements] = await connection.query('SELECT display_location FROM announcements WHERE linked_promo_id = ?', [req.params.id]);
    const locations = announcements.map((announcement) => announcement.display_location);
    lockedSlots = await lockPromoSlots(connection, locations);
    if (active) {
      const conflicts = await findOccupiedSlots(connection, locations, req.params.id);
      if (conflicts.length) {
        await connection.rollback();
        return res.status(409).json({ error: slotConflictMessage(conflicts) });
      }
    }
    await connection.query('UPDATE promotions SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id]);
    await connection.query('UPDATE announcements SET is_active = ? WHERE linked_promo_id = ?', [active ? 1 : 0, req.params.id]);
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'PROMO_SLOT_LOCK_TIMEOUT') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: 'Could not update promotion.' });
  } finally {
    await unlockPromoSlots(connection, lockedSlots);
    connection.release();
  }
};

export const getAnnouncements = async (req, res) => {
  const location = req.query.location;
  const allowedLocations = ['hero_section'];
  if (!allowedLocations.includes(location)) return res.status(400).json({ error: 'A valid display location is required.' });
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.message, a.display_location, a.background_image_url,
              p.code, p.expiry_date
       FROM announcements a JOIN promotions p ON p.id = a.linked_promo_id
       WHERE a.is_advertised = 1 AND a.is_active = 1 AND p.is_active = 1 AND p.is_deleted = 0
         AND a.display_page = 'menu' AND a.display_location = ?
         AND (p.start_date IS NULL OR p.start_date <= CURRENT_DATE())
         AND (p.expiry_date IS NULL OR p.expiry_date >= CURRENT_DATE())
         AND (p.usage_limit IS NULL OR p.times_used < p.usage_limit)
       ORDER BY a.created_at DESC`,
      [location]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Could not load announcements.' });
  }
};
