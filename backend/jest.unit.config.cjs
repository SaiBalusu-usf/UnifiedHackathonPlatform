const config = require('./jest.security.config.cjs');
module.exports = { ...config, roots: ['<rootDir>/src/tests/security', '<rootDir>/src/tests/unit'] };
