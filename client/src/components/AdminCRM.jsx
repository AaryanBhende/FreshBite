import { useEffect, useState } from 'react';
import '../assets/style/admin-crm.css';

export default function AdminCRM({ token }) {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users/admin/segments', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load customer segments.');
        setCustomers(data);
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  return (
    <section className="sidebar-card admin-card">
      <h2>Customer segments</h2>
      <p>Segments update automatically from order history.</p>
      {error && <p role="alert">{error}</p>}
      {!error && customers.length === 0 ? <p>No customers to show yet.</p> : (
        <div className="crm-table-wrap">
          <table className="crm-customer-table">
            <thead><tr><th>Customer</th><th>Orders</th><th>Last 30 days</th><th>Lifetime spend</th><th>Last order</th><th>Segments</th></tr></thead>
            <tbody>{customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}<br /><small>{customer.email}</small></td>
                <td>{customer.order_count}</td>
                <td>{customer.orders_last_30_days}</td>
                <td>₹{customer.lifetime_spend.toFixed(2)}</td>
                <td>{customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-IN') : '—'}</td>
                <td>{customer.segments.length ? customer.segments.join(', ') : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
