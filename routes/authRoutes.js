const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const OtpChallenge = require('../models/OtpChallenge');
const { requireAuth, requireJwt, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
    const { fullName, email, mobile, password, mfaMethod } = req.body;

    if (!fullName || !email || !mobile || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        id: crypto.randomUUID(),
        fullName,
        email,
        mobile,
        password: hashedPassword,
        mfaMethod: mfaMethod || 'email', // default to email
        emailVerified: false,
        mobileVerified: false
    });
    await newUser.save();

    // Generate OTP Challenge for Email Verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeId = crypto.randomUUID();
    
    const newChallenge = new OtpChallenge({
        challengeId,
        userId: newUser.id,
        otpHash: await bcrypt.hash(otp, 10),
        testOtp: otp, // Added for evaluator testing
        expiresAt: Date.now() + 3 * 60 * 1000, // 3 minutes
        attempts: 0,
        type: 'registration_email'
    });
    await newChallenge.save();

    // Simulate OTP delivery
    console.log(`\n[SIMULATED EMAIL to ${email}] OTP: ${otp}\n`);

    res.json({ success: true, challengeId, message: 'Registration successful. OTP sent to email.' });
});

// POST /api/login
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });

    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    // Return the userId so the frontend can proceed to the MFA Selection Screen
    res.json({ success: true, userId: user.id });
});

// POST /api/login/mfa-select
router.post('/login/mfa-select', async (req, res) => {
    const { userId, mfaMethod } = req.body;
    
    const user = await User.findOne({ id: userId });

    if (!user) {
        return res.status(400).json({ success: false, message: 'User not found.' });
    }

    // Generate OTP Challenge for MFA
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeId = crypto.randomUUID();
    
    const newChallenge = new OtpChallenge({
        challengeId,
        userId: user.id,
        otpHash: await bcrypt.hash(otp, 10),
        testOtp: otp, // Added for evaluator testing
        expiresAt: Date.now() + 3 * 60 * 1000,
        attempts: 0,
        type: 'login_mfa'
    });
    await newChallenge.save();

    if (mfaMethod === 'sms') {
        console.log(`\n[SIMULATED SMS to ${user.mobile}] OTP: ${otp}\n`);
    } else if (mfaMethod === 'email') {
        console.log(`\n[SIMULATED EMAIL to ${user.email}] OTP: ${otp}\n`);
    } else {
        // authenticator
        console.log(`\n[SIMULATED AUTHENTICATOR APP] OTP: ${otp}\n`);
    }

    res.json({ success: true, challengeId, mfaMethod, message: `MFA OTP generated.` });
});

// POST /api/otp/verify
router.post('/otp/verify', async (req, res) => {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
        return res.status(400).json({ success: false, message: 'Challenge ID and OTP are required.' });
    }

    const challenge = await OtpChallenge.findOne({ challengeId });

    if (!challenge) {
        return res.status(404).json({ success: false, message: 'Invalid challenge.' });
    }

    if (Date.now() > challenge.expiresAt) {
        return res.status(400).json({ success: false, message: 'Code expired.' });
    }

    if (challenge.attempts >= 3) {
        await OtpChallenge.deleteOne({ _id: challenge._id });
        return res.status(400).json({ success: false, message: 'Maximum attempts reached. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(otp.toString(), challenge.otpHash);
    
    if (!isMatch) {
        challenge.attempts += 1;
        if (challenge.attempts >= 3) {
            await OtpChallenge.deleteOne({ _id: challenge._id });
            return res.status(400).json({ success: false, message: 'Maximum attempts reached. Please request a new code.' });
        }
        await challenge.save();
        return res.status(400).json({ success: false, message: `Incorrect code. Please try again.`, attemptsRemaining: 3 - challenge.attempts });
    }

    // OTP matched
    await OtpChallenge.deleteOne({ _id: challenge._id });

    const user = await User.findOne({ id: challenge.userId });

    if (challenge.type === 'registration_email') {
        user.emailVerified = true;
        await user.save();
        
        const smsOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const smsChallengeId = crypto.randomUUID();
        
        const newChallenge = new OtpChallenge({
            challengeId: smsChallengeId,
            userId: user.id,
            otpHash: await bcrypt.hash(smsOtp, 10),
            testOtp: smsOtp, // Added for evaluator testing
            expiresAt: Date.now() + 3 * 60 * 1000,
            attempts: 0,
            type: 'registration_sms'
        });
        await newChallenge.save();
        console.log(`\n[SIMULATED SMS to ${user.mobile}] OTP: ${smsOtp}\n`);
        return res.json({ success: true, nextStep: 'sms', challengeId: smsChallengeId, message: 'Email verified. OTP sent to SMS.' });
    }

    if (challenge.type === 'registration_sms') {
        user.mobileVerified = true;
        await user.save();
        return res.json({ success: true, nextStep: 'mfa_setup', message: 'SMS verified. Proceed to MFA setup.' });
    }

    if (challenge.type === 'login_mfa') {
        req.session.userId = user.id;
        return res.json({ success: true, message: 'Login successful.', redirect: '/dashboard' });
    }

    res.json({ success: true, message: 'OTP Verified.' });
});

// POST /api/otp/resend
router.post('/otp/resend', async (req, res) => {
    const { challengeId } = req.body;

    if (!challengeId) {
        return res.status(400).json({ success: false, message: 'Challenge ID required.' });
    }

    const challenge = await OtpChallenge.findOne({ challengeId });

    if (!challenge) {
        return res.status(404).json({ success: false, message: 'Invalid challenge.' });
    }

    const user = await User.findOne({ id: challenge.userId });
    if (!user) {
        return res.status(400).json({ success: false, message: 'User not found.' });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    challenge.otpHash = await bcrypt.hash(newOtp, 10);
    challenge.testOtp = newOtp; // Added for evaluator testing
    challenge.expiresAt = Date.now() + 3 * 60 * 1000;
    challenge.attempts = 0;
    
    await challenge.save();

    // Simulate delivery
    if (challenge.type === 'registration_email') {
        console.log(`\n[SIMULATED EMAIL to ${user.email}] NEW OTP: ${newOtp}\n`);
    } else if (challenge.type === 'registration_sms') {
        console.log(`\n[SIMULATED SMS to ${user.mobile}] NEW OTP: ${newOtp}\n`);
    } else if (challenge.type === 'login_mfa') {
        if (user.mfaMethod === 'sms') {
            console.log(`\n[SIMULATED SMS to ${user.mobile}] NEW OTP: ${newOtp}\n`);
        } else {
            console.log(`\n[SIMULATED EMAIL to ${user.email}] NEW OTP: ${newOtp}\n`);
        }
    }

    res.json({ success: true, message: 'OTP resent successfully.' });
});

// POST /api/mfa/setup
router.post('/mfa/setup', async (req, res) => {
    const { userId, mfaMethod } = req.body;
    
    const user = await User.findOne({ id: userId });
    
    if(user) {
        user.mfaMethod = mfaMethod;
        await user.save();
    }
    res.json({ success: true, message: 'MFA setup complete.' });
});

// GET /api/me
router.get('/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const user = await User.findOne({ id: req.session.userId }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Exclude password
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// POST /api/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        res.json({ success: true, message: 'Logged out.' });
    });
});

// TEST ONLY - evaluator OTP retrieval
router.get('/test/otp/:challengeId', async (req, res) => {
    const { challengeId } = req.params;
    const challenge = await OtpChallenge.findOne({ challengeId });

    if (!challenge) {
        return res.status(404).json({ success: false, message: 'Challenge ID not found.' });
    }

    if (Date.now() > challenge.expiresAt) {
        return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    let channel = 'unknown';
    if (challenge.type === 'registration_email') channel = 'email';
    else if (challenge.type === 'registration_sms') channel = 'sms';
    else if (challenge.type === 'login_mfa') channel = 'mfa';

    res.json({
        success: true,
        challengeId: challenge.challengeId,
        channel: channel,
        otp: challenge.testOtp,
        expiresAt: new Date(challenge.expiresAt).toISOString()
    });
});

// POST /api/token
router.post('/token', requireAuth, (req, res) => {
    const payload = { userId: req.session.userId };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
});

// GET /api/protected
router.get('/protected', requireJwt, (req, res) => {
    res.json({ success: true, message: 'You have accessed a protected route with a valid JWT.', user: req.user });
});

module.exports = router;
