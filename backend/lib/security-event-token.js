const { createPublicKey } = require('crypto');
const jwt = require('jsonwebtoken');

function verifySecurityEventToken(token, certs, issuer, audience) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string') {
    throw new Error('Invalid security event header');
  }
  const kid = decoded.header.kid;
  const jwk = Array.isArray(certs.keys) ? certs.keys.find(key => key.kid === kid && key.kty === 'RSA') : null;
  const key = jwk ? createPublicKey({ key: jwk, format: 'jwk' })
    : Object.hasOwn(certs, kid) && typeof certs[kid] === 'string' ? certs[kid] : null;
  if (!key || !issuer || !audience) throw new Error('Missing security event verification key or configuration');
  // RISC events are historical records, not expiring login credentials.
  const payload = jwt.verify(token, key, { algorithms: ['RS256'], issuer, audience, ignoreExpiration: true });
  if (!Number.isFinite(payload.iat) || payload.iat > Date.now() / 1000 + 300 ||
      typeof payload.jti !== 'string' || !payload.jti ||
      !payload.events || typeof payload.events !== 'object' || Array.isArray(payload.events)) {
    throw new Error('Invalid security event payload');
  }
  return payload;
}

module.exports = { verifySecurityEventToken };
