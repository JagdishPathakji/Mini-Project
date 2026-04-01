const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized: No token provided. Please login."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        if (decoded.role !== "admin") {
            return res.status(403).json({
                status: false,
                message: "Forbidden: Admin access required."
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: false,
            message: "Unauthorized: Invalid or expired token."
        });
    }
};

module.exports = adminAuth;