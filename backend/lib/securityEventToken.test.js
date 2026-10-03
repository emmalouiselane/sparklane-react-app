const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('crypto');
const jwt = require('jsonwebtoken');
const { verifySecurityEventToken } = require('./securityEventToken');

test('RISC verifies signatures, issuer and audience without requiring expiration', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const payload = { iss: 'https://accounts.google.com/', aud: 'client', jti: 'event-1', iat: Math.floor(Date.now() / 1000) - 3600, events: { 'sessions-revoked': {} } };
  const sign = value => jwt.sign(value, privateKey, { algorithm: 'RS256', keyid: 'key-1' });
  const certs = { 'key-1': publicKey.export({ type: 'spki', format: 'pem' }) };
  const verify = token => verifySecurityEventToken(token, certs, payload.iss, payload.aud);
  assert.equal(verify(sign(payload)).jti, 'event-1');
  assert.equal(verify(sign({ ...payload, exp: payload.iat + 1 })).jti, 'event-1');
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1' };
  assert.equal(verifySecurityEventToken(sign(payload), { keys: [jwk] }, payload.iss, payload.aud).jti, 'event-1');
  for (const patch of [{ iss: 'attacker' }, { aud: 'other-client' }, { jti: '' }, { events: [] }, { iat: payload.iat + 7200 }]) {
    assert.throws(() => verify(sign({ ...payload, ...patch })));
  }
  const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => verify(jwt.sign(payload, attacker.privateKey, { algorithm: 'RS256', keyid: 'key-1' })));
});
