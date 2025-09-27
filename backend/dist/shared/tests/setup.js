"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestData = exports.teardownTestDatabases = exports.setupTestDatabases = exports.testPgPool = void 0;
// Test setup and configuration
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const pg_1 = require("pg");
// In-memory MongoDB for testing
let mongoServer;
// Test PostgreSQL configuration
const testPgConfig = {
    user: process.env.TEST_PG_USER || 'test',
    host: process.env.TEST_PG_HOST || 'localhost',
    database: process.env.TEST_PG_DATABASE || 'hackathon_platform_test',
    password: process.env.TEST_PG_PASSWORD || 'test',
    port: parseInt(process.env.TEST_PG_PORT || '5432'),
};
const setupTestDatabases = async () => {
    // Setup MongoDB
    mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose_1.default.connect(mongoUri);
    // Setup PostgreSQL (assumes test database exists)
    exports.testPgPool = new pg_1.Pool(testPgConfig);
    // Create test tables
    await createTestTables();
};
exports.setupTestDatabases = setupTestDatabases;
const teardownTestDatabases = async () => {
    // Cleanup MongoDB
    await mongoose_1.default.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
    // Cleanup PostgreSQL
    if (exports.testPgPool) {
        await exports.testPgPool.end();
    }
};
exports.teardownTestDatabases = teardownTestDatabases;
const createTestTables = async () => {
    // Create minimal test tables
    await exports.testPgPool.query(`
    CREATE TABLE IF NOT EXISTS test_users (
      user_id UUID PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'participant',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
    await exports.testPgPool.query(`
    CREATE TABLE IF NOT EXISTS test_teams (
      team_id UUID PRIMARY KEY,
      team_name VARCHAR(255) NOT NULL,
      hackathon_id UUID NOT NULL,
      created_by UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
const cleanupTestData = async () => {
    // Clean MongoDB collections
    const collections = await mongoose_1.default.connection.db.collections();
    for (const collection of collections) {
        await collection.deleteMany({});
    }
    // Clean PostgreSQL tables
    await exports.testPgPool.query('DELETE FROM test_teams');
    await exports.testPgPool.query('DELETE FROM test_users');
};
exports.cleanupTestData = cleanupTestData;
//# sourceMappingURL=setup.js.map