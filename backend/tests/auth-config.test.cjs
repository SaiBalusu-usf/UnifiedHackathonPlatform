const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function load(kind, env) {
  const calls = [];
  const jwt = { sign: (payload, secret, options) => { calls.push({ secret, options }); return 'synthetic-token'; } };
  const context = { process: { env }, console, URLSearchParams, jwt, bcrypt: {}, exports: {}, require: name => {
    if (name === 'jsonwebtoken') return jwt;
    if (name === 'bcryptjs') return {};
    throw new Error(`Unexpected dependency ${name}`);
  } };
  let code = fs.readFileSync(path.join(__dirname, kind === 'source' ? '../src/shared/middleware/auth.ts' : '../dist/shared/middleware/auth.js'), 'utf8');
  if (kind === 'source') {
    code = stripTypeScriptTypes(code).replace(/^import .*$/gm, '').replace(/^export default \{[\s\S]*$/m, '').replace(/^export /gm, '');
    code += '\nglobalThis.subject = { generateTokens };';
  }
  vm.runInNewContext(code, context);
  return { subject: kind === 'source' ? context.subject : context.exports, calls };
}

test('runtime password hashing uses its declared bcryptjs dependency', async () => {
  process.env.JWT_SECRET = 'synthetic-access-key-for-tests-only-0000';
  process.env.JWT_REFRESH_SECRET = 'synthetic-refresh-key-for-tests-only-1111';
  const auth = require('../dist/shared/middleware/auth.js');
  const hash = await auth.hashPassword('synthetic-test-password');
  assert.equal(await auth.comparePassword('synthetic-test-password', hash), true);
  assert.equal(await auth.comparePassword('wrong-test-password', hash), false);
});

for (const kind of ['source', 'dist']) {
  test(`${kind}: startup refuses missing, placeholder, short, or shared signing keys`, () => {
    for (const env of [{}, { JWT_SECRET: 'your-secret-key', JWT_REFRESH_SECRET: 'your-refresh-secret-key' },
      { JWT_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'short' },
      { JWT_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'a'.repeat(32) }]) {
      assert.throws(() => load(kind, env), /JWT_/);
    }
  });
  test(`${kind}: configured signing keys remain separate`, () => {
    const env = { JWT_SECRET: 'synthetic-access-key-for-tests-only-0000', JWT_REFRESH_SECRET: 'synthetic-refresh-key-for-tests-only-1111' };
    const { subject, calls } = load(kind, env);
    subject.generateTokens({ userId: 'test-user', tokenVersion: 0 });
    assert.equal(calls[0].secret, env.JWT_SECRET);
    assert.equal(calls[1].secret, env.JWT_REFRESH_SECRET);
  });
}
