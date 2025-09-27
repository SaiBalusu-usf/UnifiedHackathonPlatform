import { Pool } from 'pg';
import mongoose from 'mongoose';

// PostgreSQL configuration
const pgConfig = {
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'hackathon_platform',
  password: process.env.PG_PASSWORD || 'password',
  port: parseInt(process.env.PG_PORT || '5432'),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// MongoDB configuration
const mongoConfig = {
  uri: process.env.MONGO_URI || 'mongodb://localhost:27017/hackathon_platform',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
};

// PostgreSQL connection pool
export const pgPool = new Pool(pgConfig);

// MongoDB connection
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// PostgreSQL connection test
export const connectPostgreSQL = async (): Promise<void> => {
  try {
    const client = await pgPool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await pgPool.end();
    await mongoose.connection.close();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};

