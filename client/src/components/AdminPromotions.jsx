import { useEffect, useRef, useState } from 'react';

const emptyForm = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_order_amount: '0', max_discount_amount: '', start_date: '', expiry_date: '', usage_limit: '',
  advertise: false, announcement_title: '', announcement_message: '', display_locations: [], background_image_url: '',
};

export default function AdminPromotions({ token }) {
  const [form, setForm] = useState({ ...emptyForm, display_locations: [] });
  const [promotions, setPromotions] = useState([]);
  const [editingPromo, setEditingPromo] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const loadPromotions = async () => {
    const response = await fetch('/api/promotions/admin', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (response.ok) setPromotions(data);
    else setMessage(data.error || 'Could not load promotions.');
  };

  useEffect(() => { loadPromotions().catch(() => setMessage('Could not load promotions.')); }, [token]);

  const clearEditor = () => {
    setEditingPromo(null);
    setForm({ ...emptyForm, display_locations: [] });
    setImageFile(null);
    setImagePreview('');
  };

  const editPromo = (promo) => {
    setMessage('');
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount,
      max_discount_amount: promo.max_discount_amount ?? '',
      start_date: promo.start_date ? String(promo.start_date).slice(0, 10) : '',
      expiry_date: promo.expiry_date ? String(promo.expiry_date).slice(0, 10) : '',
      usage_limit: promo.usage_limit ?? '',
      advertise: Number(promo.announcement_count) > 0,
      announcement_title: promo.announcement_title || '',
      announcement_message: promo.announcement_message || '',
      display_locations: Number(promo.announcement_count) > 0 ? ['hero_section'] : [],
      background_image_url: promo.background_image_url || '',
    });
    setImageFile(null);
    setImagePreview(promo.background_image_url || '');
    window.scrollTo({ top: formRef.current?.getBoundingClientRect().top + window.scrollY - 100 || 0, behavior: 'smooth' });
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
      });
      if (imageFile) body.append('image', imageFile);
      const response = await fetch(editingPromo ? `/api/promotions/admin/${editingPromo.id}` : '/api/promotions/admin', {
        method: editingPromo ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save promotion.');
      const savedMessage = `Promotion ${result.code} ${editingPromo ? 'updated' : 'created'}${form.advertise ? ' and announced' : ''}.`;
      clearEditor();
      await loadPromotions();
      setMessage(savedMessage);
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (promo) => {
    setMessage('');
    try {
      const response = await fetch(`/api/promotions/admin/${promo.id}/active`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !promo.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update promotion.');
      await loadPromotions();
    } catch (error) { setMessage(error.message); }
  };

  const deletePromo = async (promo) => {
    const redeemed = Number(promo.redeemed_count || 0);
    const historyMessage = redeemed
      ? `This promotion was redeemed by ${redeemed} order${redeemed === 1 ? '' : 's'}. Deleting it will hide it and disable its banners, while preserving those order records.`
      : 'This promotion has no recorded redemptions. It will be hidden and its banners disabled.';
    if (!window.confirm(`${historyMessage}\n\nDelete ${promo.code}?`)) return;
    try {
      const response = await fetch(`/api/promotions/admin/${promo.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete promotion.');
      setMessage(`Promotion ${promo.code} deleted. Historical orders remain recorded.`);
      await loadPromotions();
    } catch (error) { setMessage(error.message); }
  };

  const fields = (
    <>
      <label>Promo code<input required maxLength={50} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
      <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label>Discount type<select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
      <label>Discount value<input required type="number" min="0.01" step="0.01" max={form.discount_type === 'percentage' ? 100 : undefined} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></label>
      <label>Minimum order amount<input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} /></label>
      <label>Maximum discount amount<input type="number" min="0" step="0.01" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} /></label>
      <label>Start date<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
      <label>Expiry date<input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></label>
      <label>Campaign usage limit<input type="number" min="1" step="1" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="No limit" /></label>
      <label className="promo-advertise-toggle"><input type="checkbox" checked={form.advertise} onChange={(e) => { const advertise = e.target.checked; setForm({ ...form, advertise, display_locations: advertise ? ['hero_section'] : [] }); }} /> Advertise this promotion</label>
      {form.advertise && (
        <div className="promo-announcement-fields">
          <p>This promotion will appear in the Menu hero section. Only one promotion can advertise there at a time.</p>
          <label>Banner title<input required value={form.announcement_title} onChange={(e) => setForm({ ...form, announcement_title: e.target.value })} /></label>
          <label>Banner message<textarea required value={form.announcement_message} onChange={(e) => setForm({ ...form, announcement_message: e.target.value })} /></label>
          <label>Banner background image (JPG, PNG, WEBP)<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={selectImage} /></label>
          {imagePreview && <div className="promo-image-preview"><img src={imagePreview} alt="Promotion banner preview" /><span>Preview</span></div>}
        </div>
      )}
      <div className="promo-form-actions">
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingPromo ? 'Update Promotion' : 'Create Promotion'}</button>
        {editingPromo && <button type="button" className="btn-secondary" onClick={clearEditor}>Cancel Edit</button>}
      </div>
      {message && <p role="status">{message}</p>}
    </>
  );

  return (
    <div className="admin-promotions">
      <section className="sidebar-card admin-card" ref={formRef}>
        <h2>{editingPromo ? `Edit promotion: ${editingPromo.code}` : 'Create promotion'}</h2>
        <form onSubmit={save} className="promo-admin-form">{fields}</form>
      </section>
      <section className="sidebar-card admin-card">
        <h2>Promotions</h2>
        {promotions.length === 0 ? <p>No promotions created yet.</p> : (
          <div className="promo-list">{promotions.map((promo) => (
            <details className="promo-card" key={promo.id}>
              <summary>
                <span className="promo-summary-main"><strong>{promo.code}</strong><span>{promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `₹${promo.discount_value} off`}</span></span>
                <span className={`promo-status ${promo.is_active ? 'active' : ''}`}>{promo.is_active ? 'Active' : 'Inactive'}</span>
              </summary>
              <div className="promo-details">
                <p>{promo.description || 'No description.'}</p>
                <dl>
                  <div><dt>Minimum order</dt><dd>₹{promo.min_order_amount}</dd></div>
                  <div><dt>Maximum discount</dt><dd>{promo.max_discount_amount ? `₹${promo.max_discount_amount}` : 'No cap'}</dd></div>
                  <div><dt>Starts</dt><dd>{promo.start_date ? new Date(promo.start_date).toLocaleDateString() : 'Immediately'}</dd></div>
                  <div><dt>Expires</dt><dd>{promo.expiry_date ? new Date(promo.expiry_date).toLocaleDateString() : 'No expiry'}</dd></div>
                  <div><dt>Usage</dt><dd>{promo.times_used}{promo.usage_limit ? ` / ${promo.usage_limit}` : ' / unlimited'}</dd></div>
                  <div><dt>Redeemed orders</dt><dd>{promo.redeemed_count}</dd></div>
                  <div><dt>Advertising</dt><dd>{Number(promo.announcement_count) > 0 ? 'Menu hero section' : 'Not advertised'}</dd></div>
                </dl>
                <div className="promo-actions">
                  <button type="button" className="btn-secondary" onClick={() => editPromo(promo)}>Edit</button>
                  <button type="button" className="btn-secondary" onClick={() => toggleActive(promo)}>{promo.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button type="button" className="btn-danger" onClick={() => deletePromo(promo)}>Delete</button>
                </div>
              </div>
            </details>
          ))}</div>
        )}
      </section>
    </div>
  );
}
