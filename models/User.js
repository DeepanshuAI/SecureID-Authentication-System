const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // We keep string IDs for backwards compatibility with our existing JSON
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    mfaMethod: { type: String, default: 'email' },
    emailVerified: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
