import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Configure Nodemailer with Mailtrap Sandbox SMTP credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send test email directly into Mailtrap Sandbox
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: 'freshbitecafe@gmail.com', // Dummy recipient (Sandbox catches it regardless)
      subject: `New Catering/Contact Request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Message captured in Sandbox!' });
  } catch (error) {
    console.error('Mailtrap Sandbox Error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;