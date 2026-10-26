import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/style/kitchen.css';

const TYPES = ['All', 'Dine In', 'Delivery', 'Takeout'];
const elapsed = (createdAt, now) => Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));

export default function KitchenDashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [menu, setMenu] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('view') || 'orders';
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const knownOrders = useRef(new Set());
  const audioContext = useRef(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const refresh = useCallback(async () => {
    try {
      const [orderRes, menuRes] = await Promise.all([
        fetch(`/api/kds/orders${filter === 'All' ? '' : `?type=${encodeURIComponent(filter)}`}`, { headers }),
        fetch('/api/menu'),
      ]);
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Could not load kitchen orders.');
      if (!menuRes.ok) throw new Error('Could not load menu availability.');
      const nextOrders = orderData.orders || [];
      const fresh = nextOrders.filter(order => !knownOrders.current.has(order.order_id));
      if (knownOrders.current.size && fresh.length) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          audioContext.current ||= new AudioCtx();
          const ctx = audioContext.current;
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.connect(gain); gain.connect(ctx.destination);
          oscillator.frequency.value = 880; gain.gain.value = 0.12;
          oscillator.start(); oscillator.stop(ctx.currentTime + 0.22);
        } catch { /* Audio may be unavailable until the user interacts with the page. */ }
      }
      nextOrders.forEach(order => knownOrders.current.add(order.order_id));
      setOrders(nextOrders);
      setMenu(await menuRes.json());
      setError('');
    } catch (e) { setError(e.message); }
  }, [filter, token]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/kds/history', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load history.');
      setHistory(data.orders || []);
    } catch (e) { setError(e.message); }
  }, [token]);

  useEffect(() => {
    if (user?.role !== 'kitchen') return undefined;
    refresh(); const poll = setInterval(refresh, 5000); const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(ticker); };
  }, [refresh, user?.role]);
  useEffect(() => { if (user?.role === 'kitchen' && tab === 'history') loadHistory(); }, [tab, loadHistory, user?.role]);

  const selectTab = (nextTab) => setSearchParams({ view: nextTab });

  const updateStatus = async (id, status) => {
    const res = await fetch(`/api/kds/orders/${encodeURIComponent(id)}/status`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Could not update order.');
    await refresh(); if (tab === 'history') await loadHistory();
  };
  const bumpItem = async (itemId) => {
    const res = await fetch(`/api/kds/orders/items/${encodeURIComponent(itemId)}/bump`, { method: 'PUT', headers, body: '{}' });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Could not update item.');
    await refresh();
  };
  const toggleAvailability = async (item) => {
    const res = await fetch(`/api/menu/${encodeURIComponent(item.id)}/availability`, { method: 'PUT', headers, body: JSON.stringify({ is_available: !Boolean(item.is_available) }) });
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Could not update availability.'); else refresh();
  };

  const shownOrders = (tab === 'history' ? history : orders).filter(order => filter === 'All' || order.order_type === filter);
  if (user?.role === 'admin') return <main className="kds-page kds-admin-employee-page">
    <header className="kds-heading"><div><p className="kds-eyebrow">FreshBite Team</p><h1>Kitchen Display</h1><p>Manage employee accounts from the admin workspace.</p></div><span className="kds-live"><i /> Admin access</span></header>
    <button type="button" className="kds-add-employee-card" onClick={() => navigate('/admin/management?view=employees')} aria-label="Add new employee. Open Employee Management">
      <span className="kds-add-employee-plus" aria-hidden="true">+</span>
      <span className="kds-add-employee-title">add new employee</span>
    </button>
  </main>;
  return <main className="kds-page">
    <header className="kds-heading"><div><p className="kds-eyebrow">FreshBite Kitchen</p><h1>Kitchen Display</h1><p>Live tickets · {orders.length} active</p></div><span className="kds-live"><i /> Live</span></header>
    {error && <p className="kds-error" role="alert">{error}</p>}
    <section className="kds-toolbar">
      <div className="kds-tabs">{[['orders', 'Active Orders'], ['history', 'Recall']].map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => selectTab(key)}>{label}</button>)}</div>
      <div className="kds-filters">{TYPES.map(type => <button key={type} className={filter === type ? 'selected' : ''} onClick={() => setFilter(type)}>{type}</button>)}</div>
    </section>
    <section className="kds-orders">{shownOrders.length ? shownOrders.map(order => {
      const seconds = elapsed(order.created_at, now);
      const urgency = seconds >= 1200 ? 'late' : seconds >= 600 ? 'warning' : 'fresh';
      return <article className={`kds-order ${tab === 'orders' ? urgency : ''}`} key={order.order_id}>
        <div className="kds-order-top"><div><span className="kds-type">{order.order_type}</span><h2>#{order.order_id.slice(-6)}</h2></div>{tab === 'orders' && <div className="kds-clock">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>}</div>
        <p className="kds-order-meta">{order.customer_name || 'Guest'}{order.table_number ? ` · Table ${order.table_number} ${order.table_zone || ''}` : ''}</p>
        <div className="kds-items">{order.items.map(item => <div className="kds-item" key={item.id}><div><strong>{item.quantity}× {item.title}</strong>{item.notes && <p className="kds-note">Note: {item.notes}</p>}</div>{order.order_type === 'Dine In' && tab === 'orders' && <button className={`kds-bump ${item.is_cooked ? 'done' : ''}`} onClick={() => bumpItem(item.id)}>{item.is_cooked ? '✓ Done' : 'Bump'}</button>}</div>)}</div>
        <footer className="kds-order-actions">{tab === 'history' ? <button onClick={() => updateStatus(order.order_id, 'preparing')}>Recall Order</button> : order.kitchen_status === 'pending' ? <button onClick={() => updateStatus(order.order_id, 'preparing')}>Start Preparing</button> : <button disabled={order.order_type === 'Dine In' && order.items.some(item => !item.is_cooked)} title={order.order_type === 'Dine In' && order.items.some(item => !item.is_cooked) ? 'Bump every item first' : ''} onClick={() => updateStatus(order.order_id, 'ready')}>Mark Ready</button>}</footer>
      </article>;
    }) : <div className="kds-empty">{tab === 'history' ? 'No completed orders in the last hour.' : 'No active orders. New tickets will appear here.'}</div>}</section>
    <section className="kds-availability"><div><p className="kds-eyebrow">Menu controls</p><h2>Item availability</h2></div><div className="kds-menu-items">{menu.map(item => <div className="kds-menu-item" key={item.id}><span>{item.title}</span><button className={item.is_available ? 'available' : 'unavailable'} onClick={() => toggleAvailability(item)}>{item.is_available ? 'Available' : 'Sold Out'}</button></div>)}</div></section>
  </main>;
}
