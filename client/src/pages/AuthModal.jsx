import React, { useState, useContext, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { readJsonResponse } from '../utils/readJsonResponse';

export default function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' });
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
    };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      login(data.user, data.token);
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || 'Google login failed');
      }
      login(data.user, data.token);
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-modal">
        <h3 className="auth-title">{isRegister ? 'Create Account' : 'Welcome Back'}</h3>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-form-group">
              <label className="auth-label">Name</label>
              <input
                type="text"
                required
                placeholder="Your Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="auth-input"
              />
            </div>
          )}
          <div className="auth-form-group">
            <label className="auth-label">Email</label>
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="auth-input"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              required
              placeholder=""
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="auth-input"
            />
          </div>

          <button type="submit" className="auth-btn-primary">
            {isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="auth-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-In was unsuccessful.')}
            useOneTap
          />
        </div>

        <button
          className="auth-btn-toggle"
          onClick={() => {
            setIsRegister(!isRegister);
            resetForm();
          }}
        >
          {isRegister ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </button>

        <button className="auth-btn-cancel" onClick={handleClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
