import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password.trim()
    };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content auth-modal">
        <h3>{isRegister ? 'Create Account' : 'Welcome Back'}</h3>
        {error && (
          <div style={{ color: '#d9534f', background: '#fdf7f7', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button className="btn-primary" type="submit" style={{ marginTop: '1rem', width: '100%' }}>
            {isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <button
          style={{ marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </button>

        <button className="btn-secondary" onClick={onClose} style={{ marginTop: '0.5rem', width: '100%' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}