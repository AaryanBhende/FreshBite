import React, { useCallback, useEffect, useState } from 'react';
import '../assets/style/menu.css';

const emptyForm = { name: '', email: '', role: 'kitchen', password: '' };
const roleLabel = (role) => role === 'driver' ? 'Driver' : 'Kitchen';

export default function AdminEmployees({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswordStatus, setVisiblePasswordStatus] = useState({});

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/admin/employees', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load employees.');
      setEmployees(data);
      setError('');
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const startCreate = () => { setEditing(null); setForm({ ...emptyForm }); setModalOpen(true); setShowPassword(false); setError(''); setNotice(''); };
  const startEdit = (employee) => {
    setEditing(employee);
    setModalOpen(true);
    setForm({ name: employee.name, email: employee.email, role: employee.role, password: '' });
    setShowPassword(false); setError(''); setNotice('');
  };
  const closeForm = () => { setModalOpen(false); setEditing(null); setForm({ ...emptyForm }); setError(''); };

  const saveEmployee = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const url = editing ? `/api/users/admin/employees/${encodeURIComponent(editing.id)}` : '/api/users/admin/employees';
      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, password: form.password || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save employee.');
      setNotice(editing ? 'Employee updated.' : `${roleLabel(form.role)} account created.`);
      closeForm();
      await loadEmployees();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  };

  const removeEmployee = async (employee) => {
    if (!window.confirm(`Delete ${employee.name}'s ${roleLabel(employee.role).toLowerCase()} account?`)) return;
    try {
      const response = await fetch(`/api/users/admin/employees/${encodeURIComponent(employee.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete employee.');
      setNotice('Employee deleted.');
      await loadEmployees();
    } catch (deleteError) { setError(deleteError.message); }
  };

  const renderGroup = (role, title) => {
    const list = employees.filter((employee) => employee.role === role);
    return <section className="employee-group" key={role}>
      <h3>{title}<span>{list.length}</span></h3>
      {list.length === 0 ? <p className="employee-empty">No {title.toLowerCase()} accounts yet.</p> : <div className="employee-table-wrap"><table className="employee-table">
        <thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Actions</th></tr></thead>
        <tbody>{list.map((employee) => <tr key={employee.id}>
          <td data-label="Name">{employee.name}</td>
          <td data-label="Email">{employee.email}</td>
          <td data-label="Password"><span className="employee-password-mask">{visiblePasswordStatus[employee.id] ? 'Hashed securely · reset via Edit' : '••••••••'}</span><button type="button" className="employee-password-toggle" aria-label={visiblePasswordStatus[employee.id] ? 'Hide password status' : 'Show password status'} onClick={() => setVisiblePasswordStatus((state) => ({ ...state, [employee.id]: !state[employee.id] }))}>{visiblePasswordStatus[employee.id] ? 'Hide' : 'Show'}</button></td>
          <td data-label="Actions"><div className="employee-actions"><button type="button" onClick={() => startEdit(employee)}>Edit</button><button type="button" className="employee-delete" onClick={() => removeEmployee(employee)}>Delete</button></div></td>
        </tr>)}</tbody>
      </table></div>}
    </section>;
  };

  return <section className="sidebar-card admin-employees-card">
    <header className="employee-management-heading"><div><p className="admin-eyebrow">Team accounts</p><h2>Employee Management</h2><p>Manage delivery drivers and kitchen staff.</p></div><button type="button" className="employee-add-button" onClick={startCreate}>＋ Add Employee</button></header>
    <p className="employee-password-note">Passwords are stored as secure hashes and cannot be viewed later. Use Edit to set a new password.</p>
    {notice && <p className="employee-notice" role="status">{notice}</p>}
    {error && <p className="employee-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading employees…</p> : <div className="employee-groups">{renderGroup('driver', 'Drivers')}{renderGroup('kitchen', 'Kitchen Staff')}</div>}
    {modalOpen && <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
      <div className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
        <header><h3 id="employee-modal-title">{editing ? 'Edit Employee' : 'Add Employee'}</h3><button type="button" aria-label="Close" onClick={closeForm}>×</button></header>
        <form onSubmit={saveEmployee}>
          <label>Name<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          {!editing && <label>Account Type<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="kitchen">Kitchen</option><option value="driver">Driver</option></select></label>}
          <label>Password <span>{editing ? '(leave blank to keep current)' : '(minimum 8 characters)'}</span><div className="employee-password-input"><input required={!editing} minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? 'Set a new password' : 'Create a password'} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          {error && <p className="employee-error" role="alert">{error}</p>}
          <div className="employee-modal-actions"><button type="button" className="employee-cancel" onClick={closeForm}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee'}</button></div>
        </form>
      </div>
    </div>}
  </section>;
}
