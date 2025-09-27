"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordField = exports.validateEmailField = exports.validateRequired = exports.validateUUID = exports.validatePassword = exports.validateEmail = void 0;
const response_1 = require("./response");
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.validatePassword = validatePassword;
const validateUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.validateUUID = validateUUID;
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missingFields = [];
        for (const field of fields) {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            (0, response_1.sendError)(res, `Missing required fields: ${missingFields.join(', ')}`, undefined, 400);
            return;
        }
        next();
    };
};
exports.validateRequired = validateRequired;
const validateEmailField = (req, res, next) => {
    const { email } = req.body;
    if (email && !(0, exports.validateEmail)(email)) {
        (0, response_1.sendError)(res, 'Invalid email format', undefined, 400);
        return;
    }
    next();
};
exports.validateEmailField = validateEmailField;
const validatePasswordField = (req, res, next) => {
    const { password } = req.body;
    if (password && !(0, exports.validatePassword)(password)) {
        (0, response_1.sendError)(res, 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number', undefined, 400);
        return;
    }
    next();
};
exports.validatePasswordField = validatePasswordField;
//# sourceMappingURL=validation.js.map