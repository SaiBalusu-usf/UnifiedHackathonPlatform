const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

// This test creates schemas only in the disposable, loopback CI service databases.
for (const key of ['DATABASE_URL', 'MONGODB_URI']) {
  const url = new URL(process.env[key] || 'http://invalid');
  assert.equal(url.hostname, '127.0.0.1', `${key} must point to the isolated CI service`);
  assert.equal(url.pathname, '/security_ci', `${key} must use the disposable security_ci database`);
}
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run in the isolated database CI job');

const { pgPool } = require('../dist/config/database');
const authRoutes = require('../dist/services/auth/routes').default;
const resumeRoutes = require('../dist/services/resume-analysis/routes').default;
const auth = require('../dist/shared/middleware/auth');
const { getUser } = require('../dist/services/auth/repository');
const { ResumeModel } = require('../dist/services/resume-analysis/models');
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/resumes', resumeRoutes);
const fixture = { email: 'alice@example.invalid', username: 'alice', firstName: 'Alice', lastName: 'Fixture', password: 'FixturePassword123!' };

test('production routes preserve security with real PostgreSQL and MongoDB', async t => {
  t.after(async () => { await Promise.all([pgPool.end(), mongoose.disconnect()]); });
  await pgPool.query(readFileSync(path.join(__dirname, '../src/config/init-db.sql'), 'utf8'));
  await pgPool.query(readFileSync(path.join(__dirname, '../src/config/security-migration.sql'), 'utf8'));
  await mongoose.connect(process.env.MONGODB_URI);
  let alice, bob, access, refresh;

  await t.test('registration persists a password hash and never accepts a privileged role', async () => {
    await request(app).post('/auth/register').send({ ...fixture, role: 'admin' }).expect(400);
    const response = await request(app).post('/auth/register').send(fixture).expect(201);
    alice = response.body.data.user.id;
    access = response.body.data.tokens.accessToken;
    refresh = response.body.data.tokens.refreshToken;
    const stored = await getUser(alice);
    assert.equal(stored.role, 'participant');
    assert.notEqual(stored.password, fixture.password);
    assert.equal(await auth.comparePassword(fixture.password, stored.password), true);
    const other = await request(app).post('/auth/register').send({ ...fixture, email: 'bob@example.invalid', username: 'bob' }).expect(201);
    bob = other.body.data;
  });

  await t.test('profile, login and refresh read the same persisted account', async () => {
    await request(app).get('/auth/profile').set('Authorization', `Bearer ${access}`).expect(200);
    await request(app).post('/auth/login').send({ email: fixture.email, password: fixture.password }).expect(200);
    await request(app).post('/auth/login').send({ email: fixture.email, password: 'Incorrect123!' }).expect(401);
    await request(app).post('/auth/refresh-token').send({ refreshToken: refresh }).expect(200);
  });

  await t.test('Mongo resume ownership rejects another account before disclosing the document', async () => {
    await ResumeModel.create({ user_id: alice, parsed_resume: { skills: ['typescript'], experience: [], education: [] } });
    await request(app).get(`/resumes/${alice}`).set('Authorization', `Bearer ${access}`).expect(200);
    await request(app).get(`/resumes/${alice}`).set('Authorization', `Bearer ${bob.tokens.accessToken}`).expect(403);
    await request(app).post('/resumes').set('Authorization', `Bearer ${bob.tokens.accessToken}`)
      .field('userId', alice).attach('resumeFile', Buffer.from('public fixture'), { filename: 'fixture.txt', contentType: 'text/plain' }).expect(403);
    assert.deepEqual((await ResumeModel.findOne({ user_id: alice })).parsed_resume.skills, ['typescript']);
  });

  await t.test('logout revokes persisted HTTP and refresh sessions', async () => {
    await request(app).post('/auth/logout').set('Authorization', `Bearer ${access}`).expect(200);
    assert.equal((await getUser(alice)).tokenVersion, 1);
    await request(app).get('/auth/profile').set('Authorization', `Bearer ${access}`).expect(401);
    await request(app).post('/auth/refresh-token').send({ refreshToken: refresh }).expect(401);
  });

  await t.test('password reset is single use and invalidates old credentials', async () => {
    const account = await getUser(alice);
    const resetToken = auth.generatePasswordResetToken(alice, account.tokenVersion);
    const newPassword = 'ReplacementFixture123!';
    await request(app).post('/auth/reset-password').send({ token: resetToken, newPassword }).expect(200);
    await request(app).post('/auth/reset-password').send({ token: resetToken, newPassword }).expect(400);
    assert.equal(await auth.comparePassword(fixture.password, (await getUser(alice)).password), false);
    const login = await request(app).post('/auth/login').send({ email: fixture.email, password: newPassword }).expect(200);
    access = login.body.data.tokens.accessToken;
  });

  await t.test('email confirmation persists but unavailable delivery does not reveal accounts', async () => {
    const token = auth.generateVerificationToken(alice);
    await request(app).get(`/auth/verify-email/${token}`).expect(200);
    assert.equal((await getUser(alice)).isEmailVerified, true);
    const known = await request(app).post('/auth/forgot-password').send({ email: fixture.email }).expect(503);
    const unknown = await request(app).post('/auth/forgot-password').send({ email: 'absent@example.invalid' }).expect(503);
    assert.deepEqual(known.body, unknown.body);
  });

  await t.test('unfinished two-factor and OAuth paths cannot report authentication success', async () => {
    await request(app).post('/auth/2fa/enable').set('Authorization', `Bearer ${access}`).expect(501);
    await request(app).get('/auth/google/callback?code=public-fixture').expect(501);
    await pgPool.query('UPDATE users SET two_factor_enabled=true WHERE user_id=$1', [alice]);
    await request(app).post('/auth/login').send({ email: fixture.email, password: 'ReplacementFixture123!' }).expect(503);
  });
});
