import React, { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit form.');
      }
    } catch (err) {
      setError('Server unreachable. Please check if your backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-details">
      <h2>Find Us</h2>
      <p className="section-desc">
        Drop by for a fresh bite or get in touch for catering inquiries.
      </p>

      {submitted ? (
        <div className="contact-success">
          Thank you! We have received your message and will get back to you shortly.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="contact-form">
          {error && <div className="contact-error">{error}</div>}
          <input
            type="text"
            placeholder="Your Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Your Email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <textarea
            rows="4"
            placeholder="Message or Catering Inquiry"
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
          <button type="submit" className="btn-primary contact-submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}

      <address className="contact-info-wrapper">
        <dl className="contact-list">
          <div className="contact-row">
            <a href="#location" className="icon-link" aria-label="Location">
              <img alt="" src="/assets/icons/location.svg" className="icon-img" aria-hidden="true" />
            </a>
            <div className="text-group">
              <dt className="label">Address</dt>
              <dd className="value">Miramar, Panaji, Goa (403001)</dd>
            </div>
          </div>
          <div className="contact-row">
            <a href="#phone" className="icon-link" aria-label="Phone">
              <img alt="" src="/assets/icons/call.svg" className="icon-img" aria-hidden="true" />
            </a>
            <div className="text-group">
              <dt className="label">Phone</dt>
              <dd className="value">+91 98765 43210</dd>
            </div>
          </div>
          <div className="contact-row">
            <a href="#email" className="icon-link" aria-label="Email">
              <img alt="" src="/assets/icons/email.svg" className="icon-img" aria-hidden="true" />
            </a>
            <div className="text-group">
              <dt className="label">Email</dt>
              <dd className="value">freshbitecafe@gmail.com</dd>
            </div>
          </div>
        </dl>
      </address>
    </div>
  );
}
