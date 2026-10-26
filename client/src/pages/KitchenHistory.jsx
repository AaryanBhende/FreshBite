import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/style/kitchen.css';

export default function KitchenHistory() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/kds/delivered?page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load delivered orders.');
        if (cancelled) return;
        setOrders(data.orders || []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.totalPages) || 0);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPage();
    return () => { cancelled = true; };
  }, [page, token]);

  const firstOrder = total ? (page - 1) * 20 + 1 : 0;
  const lastOrder = Math.min(page * 20, total);

  return <main className="kds-history-page">
    <Link className="kds-history-back" to="/kitchen">← Back to Kitchen</Link>
    <header className="kds-history-heading">
      <div><p className="kds-eyebrow">FreshBite Kitchen</p><h1>Delivered Order History</h1><p>All successfully delivered orders, in chronological order.</p></div>
      <span className="kds-history-summary">{total ? `Showing ${firstOrder}–${lastOrder} of ${total}` : `${total} orders`}</span>
    </header>

    {error && <p className="kds-error" role="alert">{error}</p>}
    {loading ? <div className="kds-empty">Loading delivered orders…</div> : !error && orders.length === 0 ? <div className="kds-empty">No delivered orders yet.</div> : (
      <section className="kds-history-list" aria-label="Delivered orders">
        {orders.map(order => <article className="kds-history-card" key={order.order_id}>
          <header className="kds-history-card-top">
            <div><span className="kds-type">{order.order_type}</span><h2>Order #{order.order_id}</h2></div>
            <time dateTime={new Date(order.created_at).toISOString()}>{new Date(order.created_at).toLocaleString()}</time>
            <span className="kds-delivered-pill">Delivered</span>
          </header>
          <div className="kds-history-items">
            {order.items.map(item => <div className="kds-history-item" key={item.id}>
              <strong>{item.quantity}× {item.title}</strong>
              {item.notes && <p className="kds-history-note">Note: {item.notes}</p>}
            </div>)}
          </div>
        </article>)}
      </section>
    )}

    {!loading && totalPages > 1 && <nav className="kds-pagination" aria-label="Order history pages">
      <button type="button" onClick={() => setPage(current => current - 1)} disabled={page <= 1}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" onClick={() => setPage(current => current + 1)} disabled={page >= totalPages}>Next</button>
    </nav>}
  </main>;
}
