if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- MongoDB connection (cached for serverless) ----------
let db = null;

async function connectDB() {
  if (db) return db;
  if (!MONGODB_URI) return null;
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('buildmaster');
  console.log('Connected to MongoDB Atlas');
  return db;
}

// ---------- Storage abstraction ----------
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
// -----------------------------------------

app.post('/api/enquiry', async (req, res) => {
  const { name, email, phone, service, message, projectType, budget } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const enquiry = {
    id: uuidv4(),
    name,
    email,
    phone,
    service: service || 'General',
    projectType: projectType || 'Not specified',
    budget: budget || 'Not specified',
    message,
    submittedAt: new Date().toISOString(),
    status: 'new'
  };

  await saveEnquiry(enquiry);
  console.log(`New enquiry from: ${name} (${email}) - ${service}`);

  res.json({
    success: true,
    message: 'Thank you! Your enquiry has been received. We will contact you within 24 hours.',
    enquiryId: enquiry.id
  });
});

app.get('/api/enquiries', async (req, res) => {
  const enquiries = await getAllEnquiries();
  res.json({ success: true, data: enquiries, total: enquiries.length });
});

app.get('/api/contact', (req, res) => {
  res.json({
    phone1: process.env.CONTACT_PHONE1 || '',
    phone1Display: process.env.CONTACT_PHONE1_DISPLAY || '',
    phone2: process.env.CONTACT_PHONE2 || '',
    phone2Display: process.env.CONTACT_PHONE2_DISPLAY || '',
    instagram: process.env.CONTACT_INSTAGRAM || '',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start (local dev) or export (Vercel) ----------
if (require.main === module) {
  app.listen(PORT, () => console.log(`\nBuildMaster running on http://localhost:${PORT}\n`));
}

module.exports = app;
