if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const mongoSanitize  = require('express-mongo-sanitize');
const nodemailer     = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const crypto         = require('crypto');
const fs             = require('fs');
const path           = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI        = process.env.MONGODB_URI;
const ACKNOWLEDGE_SECRET = process.env.ACKNOWLEDGE_SECRET || 'de6076b2688b4314cee42679e8b46c5a6abd11fdbf3dbe52fef409063e10f246';

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://cdnjs.cloudflare.com"],
      fontSrc:     ["'self'",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com"],
      imgSrc:      ["'self'", "data:",
                    "https://images.unsplash.com",
                    "https://i.pravatar.cc"],
      frameSrc:    ["https://www.youtube.com", "https://www.google.com"],
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [/\.vercel\.app$/, /localhost/];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(p => p.test(origin))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

// ─── Body limits & sanitisation ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

// ─── Rate limiters ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
}));

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries from this IP. Please try again after an hour.' }
});

const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many status checks. Please try again later.' }
});

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB connection (cached for serverless) ───────────────────────────────
let db = null;

async function connectDB() {
  if (db) return db;
  if (!MONGODB_URI) return null;
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('buildmaster');
  return db;
}

// ─── Local file fallback ──────────────────────────────────────────────────────
const ENQUIRIES_FILE = path.join('/tmp', 'enquiries.json');

function ensureLocalFile() {
  if (!fs.existsSync(ENQUIRIES_FILE)) fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify([], null, 2));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function saveEnquiry(enquiry) {
  const database = await connectDB();
  if (database) {
    await database.collection('enquiries').insertOne(enquiry);
  } else {
    ensureLocalFile();
    const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
    list.push(enquiry);
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(list, null, 2));
  }
}

async function getAllEnquiries() {
  const database = await connectDB();
  if (database) {
    return database.collection('enquiries')
      .find({}, { projection: { _id: 0 } })
      .sort({ submittedAt: -1 })
      .toArray();
  }
  ensureLocalFile();
  return JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
}

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function findByUniqueKey(uniqueKey) {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const database = await connectDB();
  if (database) {
    return database.collection('enquiries')
      .find({ uniqueKey, submittedAt: { $gte: cutoff } }, { projection: { _id: 0 } })
      .sort({ submittedAt: -1 })
      .limit(1)
      .next();
  }
  ensureLocalFile();
  const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
  return list
    .filter(e => e.uniqueKey === uniqueKey && e.submittedAt >= cutoff)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] || null;
}

async function findById(id) {
  const database = await connectDB();
  if (database) {
    return database.collection('enquiries').findOne({ id }, { projection: { _id: 0 } });
  }
  ensureLocalFile();
  const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
  return list.find(e => e.id === id) || null;
}

async function findByNormalized(normPhone, normName, normSvc) {
  const database = await connectDB();
  if (database) {
    return database.collection('enquiries')
      .find({ normPhone, normName, normSvc }, { projection: { _id: 0 } })
      .sort({ submittedAt: -1 })
      .limit(1)
      .next();
  }
  ensureLocalFile();
  const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
  return list
    .filter(e => e.normPhone === normPhone && e.normName === normName && e.normSvc === normSvc)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] || null;
}

async function updateEnquiryMessage(id, message) {
  const updatedAt = new Date().toISOString();
  const database = await connectDB();
  if (database) {
    await database.collection('enquiries').updateOne({ id }, { $set: { message, updatedAt } });
  } else {
    ensureLocalFile();
    const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) { list[idx].message = message; list[idx].updatedAt = updatedAt; }
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(list, null, 2));
  }
}

async function acknowledgeEnquiry(id) {
  const acknowledgedAt = new Date().toISOString();
  const database = await connectDB();
  if (database) {
    await database.collection('enquiries').updateOne(
      { id }, { $set: { status: 'acknowledged', acknowledgedAt } }
    );
  } else {
    ensureLocalFile();
    const list = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) { list[idx].status = 'acknowledged'; list[idx].acknowledgedAt = acknowledgedAt; }
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(list, null, 2));
  }
  return acknowledgedAt;
}

// ─── HMAC token helpers ───────────────────────────────────────────────────────
function generateAckToken(id) {
  return crypto.createHmac('sha256', ACKNOWLEDGE_SECRET).update(id).digest('hex');
}

function verifyAckToken(id, token) {
  try {
    const expected = generateAckToken(id);
    if (expected.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  } catch { return false; }
}

// ─── Input helpers ────────────────────────────────────────────────────────────
function clean(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
}

function normalizeFields(phone, name, service) {
  return {
    normPhone: phone.replace(/\D/g, ''),
    normName:  name.toLowerCase().trim().replace(/\s+/g, ' '),
    normSvc:   (service || 'general').toLowerCase().trim()
  };
}

// ─── Admin auth ───────────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// ─── Acknowledge page HTML ────────────────────────────────────────────────────
function ackHtml(title, message, success) {
  const color = success ? '#1a2b4a' : '#c0392b';
  const icon  = success ? '&#x2705;' : '&#x274C;';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} – Navin Construction</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{background:#fff;border-radius:12px;padding:40px 32px;max-width:460px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .icon{font-size:56px;margin-bottom:16px;line-height:1}
    h2{color:${color};font-size:22px;margin:0 0 12px;font-family:Georgia,serif}
    p{color:#555;line-height:1.6;font-size:15px}
    .btn{display:inline-block;margin-top:24px;background:#1a2b4a;color:#c9a84c;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px}
  </style></head>
  <body><div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    <a href="/" class="btn">Back to Website</a>
  </div></body></html>`;
}

// ─── Email helpers ────────────────────────────────────────────────────────────
async function sendEmailNotification(enquiry, ackUrl) {
  if (!process.env.NOTIFY_EMAIL || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
    });
    await transporter.sendMail({
      from: `"Navin Construction Website" <${process.env.NOTIFY_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Enquiry from ${enquiry.name} – ${enquiry.service}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
          <div style="background:#1a2b4a;padding:24px;text-align:center">
            <h2 style="color:#c9a84c;margin:0">New Enquiry Received</h2>
            <p style="color:#fff;margin:4px 0 0">Navin Developer &amp; Construction</p>
          </div>
          <div style="padding:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;font-weight:bold;width:140px;color:#555">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.name}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.phone}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Service</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.service}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Budget</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.budget}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Location</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.projectType}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Message</td><td style="padding:8px;border-bottom:1px solid #eee">${enquiry.message}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Time</td><td style="padding:8px">${new Date(enquiry.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
            </table>
          </div>
          <div style="padding:0 24px 24px;text-align:center">
            <a href="${ackUrl}" style="display:inline-block;background:#1a2b4a;color:#c9a84c;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:0.5px">
              &#x2713; Mark as Acknowledged
            </a>
            <p style="margin-top:12px;font-size:12px;color:#888">Clicking this updates the status and notifies ${enquiry.name} that their enquiry has been seen.</p>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center">
            <p style="margin:0;color:#888;font-size:13px">Enquiry ID: ${enquiry.id}</p>
          </div>
        </div>`
    });
    console.log(`Email notification sent to ${process.env.NOTIFY_EMAIL}`);
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

async function sendCustomerAcknowledgedEmail(enquiry) {
  if (!process.env.NOTIFY_EMAIL || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
    });
    await transporter.sendMail({
      from: `"Navin Developer & Construction" <${process.env.NOTIFY_EMAIL}>`,
      to: enquiry.email,
      subject: 'Your Enquiry Has Been Seen – Navin Developer & Construction',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
          <div style="background:#1a2b4a;padding:24px;text-align:center">
            <h2 style="color:#c9a84c;margin:0">Enquiry Acknowledged</h2>
            <p style="color:#fff;margin:4px 0 0">Navin Developer &amp; Construction</p>
          </div>
          <div style="padding:32px 24px;text-align:center">
            <div style="font-size:52px;margin-bottom:16px">&#x2705;</div>
            <h3 style="color:#1a2b4a;margin-bottom:8px;font-family:Georgia,serif">Hello ${enquiry.name},</h3>
            <p style="color:#555;line-height:1.6">Your construction enquiry for <strong>${enquiry.service}</strong> has been seen and acknowledged by Navin ji.</p>
            <p style="color:#555;line-height:1.6;margin-top:8px">You can expect a call <strong>within 24 hours</strong> to discuss your project and schedule a free site visit.</p>
            <div style="background:#f9f6f0;border-left:4px solid #c9a84c;padding:12px 16px;text-align:left;margin:20px auto;border-radius:4px;max-width:360px">
              <p style="margin:0;font-size:13px;color:#777">Reference ID:</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#333;font-family:monospace">${enquiry.id}</p>
            </div>
          </div>
          <div style="background:#1a2b4a;padding:16px;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px">Navin Developer &amp; Construction | Najafgarh, New Delhi</p>
          </div>
        </div>`
    });
    console.log(`Acknowledgement email sent to ${enquiry.email}`);
  } catch (err) {
    console.error('Customer acknowledgement email failed:', err.message);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/enquiry', enquiryLimiter, async (req, res) => {
  const name        = clean(req.body.name);
  const email       = clean(req.body.email);
  const phone       = clean(req.body.phone);
  const service     = clean(req.body.service);
  const message     = clean(req.body.message, 2000);
  const projectType = clean(req.body.projectType);
  const budget      = clean(req.body.budget);

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (!/^[0-9+\-\s]{7,15}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
  }

  const { normPhone, normName, normSvc } = normalizeFields(phone, name, service);
  const uniqueKey = `${normPhone}|${normName}|${normSvc}`;

  // Deduplicate within 24-hour window
  const existing = await findByUniqueKey(uniqueKey);
  if (existing) {
    if (message !== existing.message) {
      await updateEnquiryMessage(existing.id, message);
    }
    return res.json({
      success: true,
      isDuplicate: true,
      enquiryId: existing.id,
      message: 'Your enquiry is already registered. We will contact you within 24 hours.'
    });
  }

  const enquiry = {
    id: uuidv4(),
    name, email, phone,
    service:     service     || 'General',
    projectType: projectType || 'Not specified',
    budget:      budget      || 'Not specified',
    message,
    submittedAt: new Date().toISOString(),
    status: 'new',
    uniqueKey, normPhone, normName, normSvc
  };

  await saveEnquiry(enquiry);
  console.log(`New enquiry: ${name} (${email})`);

  const proto   = req.headers['x-forwarded-proto'] || req.protocol;
  const host    = req.headers['x-forwarded-host']  || req.headers.host;
  const ackUrl  = `${proto}://${host}/api/acknowledge?id=${enquiry.id}&token=${generateAckToken(enquiry.id)}`;

  sendEmailNotification(enquiry, ackUrl).catch(() => {});

  res.json({
    success: true,
    isDuplicate: false,
    message: 'Thank you! Your enquiry has been received. We will contact you within 24 hours.',
    enquiryId: enquiry.id
  });
});

// Status check — public, rate-limited
app.get('/api/status', statusLimiter, async (req, res) => {
  const { ref, phone, name, service } = req.query;

  let enquiry = null;

  if (ref) {
    enquiry = await findById(clean(ref, 36));
  } else if (phone && name && service) {
    const { normPhone, normName, normSvc } = normalizeFields(
      clean(phone, 20), clean(name, 100), clean(service, 100)
    );
    enquiry = await findByNormalized(normPhone, normName, normSvc);
  } else {
    return res.status(400).json({ success: false, message: 'Provide ref ID, or phone + name + service.' });
  }

  if (!enquiry) {
    return res.status(404).json({ success: false, message: 'No enquiry found with the provided details.' });
  }

  res.json({
    success: true,
    data: {
      id:             enquiry.id,
      name:           enquiry.name,
      service:        enquiry.service,
      status:         enquiry.status,
      submittedAt:    enquiry.submittedAt,
      acknowledgedAt: enquiry.acknowledgedAt || null,
    }
  });
});

// Acknowledge — clicked from email by site owner
app.get('/api/acknowledge', async (req, res) => {
  const { id, token } = req.query;

  if (!id || !token) {
    return res.status(400).send(ackHtml('Invalid Link', 'This acknowledgement link is invalid or incomplete.', false));
  }
  if (!verifyAckToken(clean(id, 36), clean(token, 64))) {
    return res.status(403).send(ackHtml('Invalid Token', 'This acknowledgement link is invalid or has been tampered with.', false));
  }

  const enquiry = await findById(clean(id, 36));
  if (!enquiry) {
    return res.status(404).send(ackHtml('Not Found', 'Enquiry not found.', false));
  }

  if (enquiry.status === 'acknowledged') {
    const when = new Date(enquiry.acknowledgedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return res.send(ackHtml('Already Acknowledged', `This enquiry from <strong>${enquiry.name}</strong> was already acknowledged on ${when}.`, true));
  }

  await acknowledgeEnquiry(id);
  sendCustomerAcknowledgedEmail(enquiry).catch(() => {});

  res.send(ackHtml(
    'Acknowledged!',
    `Enquiry from <strong>${enquiry.name}</strong> (${enquiry.service}) has been marked as acknowledged. A notification has been sent to ${enquiry.email}.`,
    true
  ));
});

// Admin — protected
app.get('/api/enquiries', adminAuth, async (req, res) => {
  const enquiries = await getAllEnquiries();
  res.json({ success: true, data: enquiries, total: enquiries.length });
});

app.get('/api/contact', (req, res) => {
  res.json({
    phone1:        process.env.CONTACT_PHONE1         || '',
    phone1Display: process.env.CONTACT_PHONE1_DISPLAY || '',
    phone2:        process.env.CONTACT_PHONE2         || '',
    phone2Display: process.env.CONTACT_PHONE2_DISPLAY || '',
    instagram:     process.env.CONTACT_INSTAGRAM      || '',
  });
});

// Serve track page at /track
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Catch-all — serve frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ success: false, message: 'Something went wrong.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => console.log(`\nBuildMaster running on http://localhost:${PORT}\n`));
}

module.exports = app;
