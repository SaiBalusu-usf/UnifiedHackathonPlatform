// Test setup and configuration
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Pool } from 'pg';

// In-memory MongoDB for testing
let mongoServer: MongoMemoryServer;

// Test PostgreSQL configuration
const testPgConfig = {
  user: process.env.TEST_PG_USER || 'test',
  host: process.env.TEST_PG_HOST || 'localhost',
  database: process.env.TEST_PG_DATABASE || 'hackathon_platform_test',
  password: process.env.TEST_PG_PASSWORD || 'test',
  port: parseInt(process.env.TEST_PG_PORT || '5432'),
};

export let testPgPool: Pool;

export const setupTestDatabases = async (): Promise<void> => {
  // Setup MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Setup PostgreSQL (assumes test database exists)
  testPgPool = new Pool(testPgConfig);
  
  // Create test tables
  await createTestTables();
};

export const teardownTestDatabases = async (): Promise<void> => {
  // Cleanup MongoDB
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }

  // Cleanup PostgreSQL
  if (testPgPool) {
    await testPgPool.end();
  }
};

const createTestTables = async (): Promise<void> => {
  // Create minimal test tables
  await testPgPool.query(`
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

  await testPgPool.query(`
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

export const cleanupTestData = async (): Promise<void> => {
  // Clean MongoDB collections
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  // Clean PostgreSQL tables
  await testPgPool.query('DELETE FROM test_teams');
  await testPgPool.query('DELETE FROM test_users');
};

