const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').MongoStore;
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/secureid';

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secureid_super_secret_key_123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// API Routes
app.use('/api', authRoutes);

// View Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/login-mfa-select', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login-mfa-select.html'));
});

app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/otp', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'otp.html'));
});

app.get('/mfa-setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mfa-setup.html'));
});

app.get('/mfa-verify', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mfa-verify.html'));
});

app.get('/register-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register-success.html'));
});

// Protected View Route
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/profile', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless Functions
module.exports = app;
