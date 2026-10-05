import express from 'express';
import nodemailer from 'nodemailer';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

const BRAND = {
  green: '#2e7d32',
  greenDark: '#1b5e20',
  greenSoft: '#e8f5e9',
  greenBorder: '#c8e6c9',
  bg: '#f4f8f4',
  text: '#2c3e50',
  muted: '#666666',
  border: '#e0e0e0',
};

const escapeHtml = (str = '') =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const singleLine = (str = '') => String(str).replace(/[\r\n]+/g, ' ').trim();

const buildContactEmail = ({ name, email, message }) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');
  const receivedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const replySubject = encodeURIComponent('Re: Your message to FreshBite');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New message from ${safeName}</title></head><body style="margin:0;padding:0;background-color:${BRAND.bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};padding:24px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.text};"><tr><td style="background-color:${BRAND.green};padding:24px 28px;"><div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:.3px;">FreshBite</div><div style="font-size:13px;color:${BRAND.greenBorder};margin-top:4px;">New message from your website</div></td></tr><tr><td style="padding:24px 28px 8px;"><h1 style="margin:0 0 6px;font-size:20px;color:${BRAND.text};">${safeName} got in touch</h1><p style="margin:0;font-size:13px;color:${BRAND.muted};">Received ${escapeHtml(receivedAt)} (IST)</p></td></tr><tr><td style="padding:16px 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};border:1px solid ${BRAND.greenBorder};border-radius:8px;"><tr><td style="padding:12px 16px;font-size:13px;font-weight:700;color:${BRAND.green};width:80px;vertical-align:top;">Name</td><td style="padding:12px 16px;font-size:15px;color:${BRAND.text};">${safeName}</td></tr><tr><td style="padding:0 16px 12px;font-size:13px;font-weight:700;color:${BRAND.green};width:80px;vertical-align:top;">Email</td><td style="padding:0 16px 12px;font-size:15px;"><a href="mailto:${safeEmail}" style="color:${BRAND.green};text-decoration:none;">${safeEmail}</a></td></tr></table></td></tr><tr><td style="padding:16px 28px 8px;"><div style="font-size:13px;font-weight:700;color:${BRAND.green};margin-bottom:8px;">Message</div><div style="background-color:${BRAND.greenSoft};border-left:4px solid ${BRAND.green};border-radius:6px;padding:14px 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">${safeMessage}</div></td></tr><tr><td align="left" style="padding:20px 28px 28px;"><a href="mailto:${safeEmail}?subject=${replySubject}" style="display:inline-block;background-color:${BRAND.green};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">Reply to ${safeName}</a></td></tr><tr><td style="background-color:${BRAND.bg};border-top:1px solid ${BRAND.border};padding:16px 28px;font-size:12px;color:${BRAND.muted};line-height:1.5;">Sent from the contact form on the FreshBite website.<br>Miramar, Panaji, Goa (403001) &middot; +91 98765 43210</td></tr></table></td></tr></table></body></html>`;
};

// 1. Contact Form Submit Endpoint
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const cleanName = singleLine(name);
    const cleanEmail = singleLine(email);

    await transporter.sendMail({
      from: `"${cleanName}" <${cleanEmail}>`,
      replyTo: cleanEmail,
      to: 'freshbitecafe@gmail.com',
      subject: `New Contact Request from ${cleanName}`,
      text: `Name: ${cleanName}\nEmail: ${cleanEmail}\n\nMessage:\n${message}`,
      html: buildContactEmail({ name: cleanName, email: cleanEmail, message }),
    });

    res.status(200).json({ success: true, message: 'Message captured in Sandbox!' });
  } catch (error) {
    console.error('Mailtrap Sandbox Error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// 2. Fetch Messages directly from Mailtrap API (Admin Only)
router.get('/mailtrap', verifyAdmin, async (req, res) => {
  try {
    const accountId = process.env.MAILTRAP_ACCOUNT_ID;
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    const apiToken = process.env.MAILTRAP_API_TOKEN;

    if (!accountId || !inboxId || !apiToken) {
      return res.status(500).json({ error: 'Mailtrap API configuration missing in environment.' });
    }

    const response = await fetch(
      `https://mailtrap.io/api/accounts/${accountId}/inboxes/${inboxId}/messages`,
      {
        headers: {
          'Api-Token': apiToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mailtrap API returned status ${response.status}`);
    }

    const messages = await response.json();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching Mailtrap messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages from Mailtrap.' });
  }
});

export default router;