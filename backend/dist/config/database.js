"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnections = exports.connectPostgreSQL = exports.connectMongoDB = exports.pgPool = void 0;
const pg_1 = require("pg");
const mongoose_1 = __importDefault(require("mongoose"));
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
exports.pgPool = new pg_1.Pool(pgConfig);
// MongoDB connection
const connectMongoDB = async () => {
    try {
        await mongoose_1.default.connect(mongoConfig.uri, mongoConfig.options);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.connectMongoDB = connectMongoDB;
// PostgreSQL connection test
const connectPostgreSQL = async () => {
    try {
        const client = await exports.pgPool.connect();
        console.log('Connected to PostgreSQL');
        client.release();
    }
    catch (error) {
        console.error('PostgreSQL connection error:', error);
        process.exit(1);
    }
};
exports.connectPostgreSQL = connectPostgreSQL;
// Graceful shutdown
const closeConnections = async () => {
    try {
        await exports.pgPool.end();
        await mongoose_1.default.connection.close();
        console.log('Database connections closed');
    }
    catch (error) {
        console.error('Error closing database connections:', error);
    }
};
exports.closeConnections = closeConnections;
//# sourceMappingURL=database.js.map