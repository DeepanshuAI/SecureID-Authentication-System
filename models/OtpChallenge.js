const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema({
    challengeId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    otpHash: { type: String, required: true },
    testOtp: { type: String }, // Evaluator testing
    expiresAt: { type: Number, required: true },
    attempts: { type: Number, default: 0 },
    type: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
