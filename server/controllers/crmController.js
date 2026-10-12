import pool from '../config/db.js';

export const getCustomerSegments = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(DISTINCT o.order_id) AS order_count,
              COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL 30 DAY THEN o.order_id END) AS orders_last_30_days,
              COALESCE(SUM(o.price * o.quantity), 0) AS lifetime_spend,
              MAX(o.created_at) AS last_order_date,
              MAX(o.created_at) < NOW() - INTERVAL 30 DAY AS is_at_risk
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role <> 'admin'
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name`);

    const customersWithOrders = rows
      .filter((row) => Number(row.order_count) > 0)
      .sort((a, b) => Number(b.lifetime_spend) - Number(a.lifetime_spend));
    const vipCutoffIndex = customersWithOrders.length
      ? Math.ceil(customersWithOrders.length * 0.1) - 1
      : -1;
    const vipSpendCutoff = vipCutoffIndex >= 0
      ? Number(customersWithOrders[vipCutoffIndex].lifetime_spend)
      : Infinity;

    res.json(rows.map((customer) => {
      const orderCount = Number(customer.order_count);
      const recentCount = Number(customer.orders_last_30_days);
      const segments = [];
      if (orderCount === 1) segments.push('New');
      if (recentCount >= 3) segments.push('Regular');
      if (orderCount > 0 && Number(customer.lifetime_spend) >= vipSpendCutoff) segments.push('VIP');
      if (Number(customer.is_at_risk) === 1) segments.push('At-Risk');
      return { ...customer, order_count: orderCount, orders_last_30_days: recentCount, lifetime_spend: Number(customer.lifetime_spend), segments };
    }));
  } catch (error) {
    console.error('Customer segmentation failed:', error.message);
    res.status(500).json({ error: 'Could not load customer segments.' });
  }
};

export const getCustomerRecommendations = async (req, res) => {
  try {
    const [categoryRows] = await pool.query(
      `SELECT category, SUM(quantity) AS quantity
       FROM orders
       WHERE user_id = ? AND category IS NOT NULL AND category <> ''
       GROUP BY category
       ORDER BY quantity DESC`,
      [req.user.id]
    );
    const categoryCounts = new Map();
    for (const row of categoryRows) {
      for (const category of String(row.category).split(',')) {
        const normalized = category.trim();
        if (normalized) categoryCounts.set(normalized, (categoryCounts.get(normalized) || 0) + Number(row.quantity));
      }
    }
    const preferredCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const [menuItems] = await pool.query(
      `SELECT m.id, m.title, m.category, m.description, m.price, m.img,
              COALESCE(SUM(o.quantity), 0) AS units_sold,
              COALESCE((
                SELECT ROUND(AVG(r.rating), 1)
                FROM ratings r
                WHERE r.menu_item_id = m.id AND r.is_moderated = 0
              ), 0) AS avg_rating,
              (
                SELECT COUNT(*)
                FROM ratings r
                WHERE r.menu_item_id = m.id AND r.is_moderated = 0
              ) AS review_count
       FROM menu_items m
       LEFT JOIN orders o ON o.title = m.title
       GROUP BY m.id, m.title, m.category, m.description, m.price, m.img
       ORDER BY units_sold DESC, m.title`);
    const sortedItems = menuItems.map((item) => ({ ...item, units_sold: Number(item.units_sold) }));
    const categoryItems = preferredCategory
      ? sortedItems.filter((item) => String(item.category || '').split(',').some((category) => category.trim().toLowerCase() === preferredCategory.toLowerCase()))
      : [];
    const items = (categoryItems.length ? categoryItems : sortedItems).slice(0, 6);

    res.json({
      basis: categoryItems.length ? `Based on your favorite category: ${preferredCategory}` : 'Popular with customers',
      items,
    });
  } catch (error) {
    console.error('Customer recommendations failed:', error.message);
    res.status(500).json({ error: 'Could not load recommendations.' });
  }
};
