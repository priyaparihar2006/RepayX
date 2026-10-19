import nodemailer from 'nodemailer';

const SHARED_SECRET = process.env.EMAIL_RELAY_SECRET || 'YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Relay-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    const secretHeader = req.headers['x-relay-secret'] || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (bearer !== SHARED_SECRET && secretHeader !== SHARED_SECRET && req.body?.secret !== SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized: invalid relay token' });
    }

    const { to, subject, html, text, from, replyTo, idempotencyKey } = req.body || {};

    if (!to || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields: to, and text or html.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USERNAME || 'priiiiicaptures@gmail.com',
        pass: process.env.SMTP_PASSWORD || 'nzfa armr fuko flzj',
      },
    });

    const mailOptions = {
      from: from || '"RepayX" <priiiiicaptures@gmail.com>',
      to,
      subject: subject || 'Payment Reminder — RepayX',
      text: text || '',
      html: html || undefined,
      replyTo: replyTo || 'priiiiicaptures@gmail.com',
      headers: idempotencyKey ? { 'X-RepayX-Idempotency-Key': idempotencyKey } : undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    console.error('Email relay failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal error sending email',
    });
  }
}
