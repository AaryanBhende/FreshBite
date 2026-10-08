import pool from '../config/db.js';

/**
 * GET /api/ratings/item/:itemId
 * Fetch unmoderated reviews for a specific menu item, along with reviewer's name.
 */
export const getItemReviews = async (req, res) => {
  const { itemId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
         r.id,
         r.menu_item_id,
         r.user_id,
         r.rating,
         r.review_text,
         r.tags,
         r.created_at,
         COALESCE(u.name, 'Verified Customer') AS author_name
       FROM ratings r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.menu_item_id = ? AND r.is_moderated = 0
       ORDER BY r.created_at DESC`,
      [itemId]
    );

    // Compute item summary
    const [summaryRows] = await pool.query(
      `SELECT 
         ROUND(COALESCE(AVG(rating), 0), 1) AS avg_rating,
         COUNT(id) AS review_count
       FROM ratings
       WHERE menu_item_id = ? AND is_moderated = 0`,
      [itemId]
    );

    res.json({
      reviews: rows,
      avg_rating: Number(summaryRows[0]?.avg_rating || 0),
      review_count: Number(summaryRows[0]?.review_count || 0),
    });
  } catch (error) {
    console.error('getItemReviews error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/ratings/item/:itemId
 * Add a rating and review for a menu item (supports authenticated users or guests with optional name/email).
 */
export const createItemReview = async (req, res) => {
  const { itemId } = req.params;
  const { rating, review_text, tags } = req.body;

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5 stars.' });
  }

  const cleanReview = review_text ? String(review_text).trim() : null;
  const cleanTags = tags ? (Array.isArray(tags) ? tags.join(',') : String(tags).trim()) : null;
  const userId = req.user ? req.user.id : null;

  try {
    // Verify item exists
    const [itemRows] = await pool.query('SELECT id FROM menu_items WHERE id = ?', [itemId]);
    if (itemRows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await pool.query(
      `INSERT INTO ratings (id, menu_item_id, user_id, rating, review_text, tags, is_moderated)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [reviewId, itemId, userId, numRating, cleanReview, cleanTags]
    );

    // Return the newly inserted review
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review: {
        id: reviewId,
        menu_item_id: itemId,
        user_id: userId,
        rating: numRating,
        review_text: cleanReview,
        tags: cleanTags,
        created_at: new Date(),
        is_moderated: 0,
        author_name: req.user ? req.user.name : 'Verified Customer',
      },
    });
  } catch (error) {
    console.error('createItemReview error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/ratings/admin
 * Admin route: Get all ratings/reviews across items with menu item title, user details, and moderation status.
 * Supports filters: ?status=all|active|flagged & ?search=text
 */
export const getAdminReviews = async (req, res) => {
  const { status = 'all', search } = req.query;

  try {
    let sql = `
      SELECT 
        r.id,
        r.menu_item_id,
        r.user_id,
        r.rating,
        r.review_text,
        r.tags,
        r.created_at,
        r.is_moderated,
        m.title AS menu_item_title,
        m.img AS menu_item_img,
        COALESCE(u.name, 'Guest Customer') AS author_name,
        u.email AS author_email
      FROM ratings r
      LEFT JOIN menu_items m ON r.menu_item_id = m.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'flagged') {
      sql += ' AND r.is_moderated = 1';
    } else if (status === 'active') {
      sql += ' AND r.is_moderated = 0';
    }

    if (search && search.trim()) {
      sql += ' AND (r.review_text LIKE ? OR m.title LIKE ? OR u.name LIKE ? OR r.tags LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('getAdminReviews error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/ratings/admin/:id/moderate
 * Admin route: Soft-delete/flag inappropriate review (is_moderated = 1) or restore (is_moderated = 0).
 */
export const moderateReview = async (req, res) => {
  const { id } = req.params;
  const { is_moderated } = req.body;

  const modValue = is_moderated === true || is_moderated === 1 || is_moderated === '1' ? 1 : 0;

  try {
    const [result] = await pool.query(
      'UPDATE ratings SET is_moderated = ? WHERE id = ?',
      [modValue, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    res.json({
      success: true,
      message: modValue === 1 ? 'Review flagged/soft-deleted.' : 'Review approved/restored.',
      is_moderated: modValue,
    });
  } catch (error) {
    console.error('moderateReview error:', error);
    res.status(500).json({ error: error.message });
  }
};
