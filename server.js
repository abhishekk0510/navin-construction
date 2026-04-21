if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

// ─── Security Headers ────────────────────────────────────────────────────────
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

// ─── CORS – only allow your own domain ───────────────────────────────────────
const allowedOrigins = [
  /\.vercel\.app$/,
  /localhost/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(p => p.test(origin))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

// ─── Body limits ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── NoSQL injection prevention ──────────────────────────────────────────────
app.use(mongoSanitize());

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
}));

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries from this IP. Please try again after an hour.' }
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

// ─── Storage abstraction ──────────────────────────────────────────────────────
const ENQUIRIES_FILE = path.join('/tmp', 'enquiries.json');

function ensureLocalFile() {
  if (!fs.existsSync(ENQUIRIES_FILE)) fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify([], null, 2));
}

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
    return database.collection('enquiries').find({}, { projection: { _id: 0 } }).sort({ submittedAt: -1 }).toArray();
  }
  ensureLocalFile();
  return JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf8'));
}

// ─── Input sanitization ───────────────────────────────────────────────────────
function clean(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
}

// ─── Admin auth middleware ────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const phoneRegex = /^[0-9+\-\s]{7,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
  }

  const enquiry = {
    id: uuidv4(),
    name, email, phone,
    service:     service     || 'General',
    projectType: projectType || 'Not specified',
    budget:      budget      || 'Not specified',
    message,
    submittedAt: new Date().toISOString(),
    status: 'new'
  };

  await saveEnquiry(enquiry);
  console.log(`New enquiry: ${name} (${email})`);

  res.json({
    success: true,
    message: 'Thank you! Your enquiry has been received. We will contact you within 24 hours.',
    enquiryId: enquiry.id
  });
});

// Protected — requires ADMIN_API_KEY header
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

// Catch-all — serve frontend
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
