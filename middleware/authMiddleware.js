const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secureid_jwt_secret_456';

// Middleware to check if user has an active session
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }
};

// Middleware to verify JWT token
const requireJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
            }
            req.user = decoded;
            next();
        });
    } else {
        res.status(401).json({ success: false, message: 'Authorization header missing or malformed.' });
    }
};

module.exports = {
    requireAuth,
    requireJwt,
    JWT_SECRET
};
