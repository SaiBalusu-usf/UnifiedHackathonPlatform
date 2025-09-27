"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("../routes"));
const setup_1 = require("../../../shared/tests/setup");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/users', routes_1.default);
describe('UserController', () => {
    beforeAll(async () => {
        await (0, setup_1.setupTestDatabases)();
    });
    afterAll(async () => {
        await (0, setup_1.teardownTestDatabases)();
    });
    beforeEach(async () => {
        await (0, setup_1.cleanupTestData)();
    });
    describe('POST /api/users/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123',
                first_name: 'Test',
                last_name: 'User'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.data).toHaveProperty('userId');
            expect(response.body.data.email).toBe(userData.email);
            expect(response.body.data.username).toBe(userData.username);
        });
        it('should return error for invalid email', async () => {
            const userData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'TestPassword123',
                first_name: 'Test',
                last_name: 'User'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(userData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email format');
        });
        it('should return error for weak password', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weak',
                first_name: 'Test',
                last_name: 'User'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(userData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Password must be at least 8 characters');
        });
        it('should return error for missing required fields', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com'
                // Missing password, first_name, last_name
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(userData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Missing required fields');
        });
    });
    describe('POST /api/users/login', () => {
        beforeEach(async () => {
            // Register a test user first
            await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123',
                first_name: 'Test',
                last_name: 'User'
            });
        });
        it('should login successfully with valid credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/login')
                .send({
                email: 'test@example.com',
                password: 'TestPassword123'
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.data).toHaveProperty('token');
        });
        it('should return error for invalid credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/login')
                .send({
                email: 'test@example.com',
                password: 'WrongPassword'
            })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });
        it('should return error for non-existent user', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'TestPassword123'
            })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });
    });
});
//# sourceMappingURL=controller.test.js.map