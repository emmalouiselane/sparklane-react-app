const express = require('express');
const { verifySecurityEventToken } = require('../lib/securityEventToken');
const AuthAccount = require('../models/AuthAccount');
const RiscEvent = require('../models/RiscEvent');

const router = express.Router();
let riscConfig;
let riscConfigExpires = 0;

async function getRiscConfig() {
  if (riscConfig && riscConfigExpires > Date.now()) return riscConfig;
  const response = await fetch('https://accounts.google.com/.well-known/risc-configuration');
  if (!response.ok) throw new Error('Unable to load Google RISC configuration');
  riscConfig = await response.json();
  riscConfigExpires = Date.now() + 60 * 60 * 1000;
  return riscConfig;
}

router.post('/', async (req, res) => {
  try {
    const token = typeof req.body === 'string' ? req.body : '';
    if (!token || token.length > 64 * 1024) return res.status(400).send('Invalid event');

    const config = await getRiscConfig();
    const certResponse = await fetch(config.jwks_uri);
    if (!certResponse.ok) throw new Error('Unable to load Google RISC signing keys');
    const certs = await certResponse.json();
    const payload = verifySecurityEventToken(token, certs, config.issuer, process.env.GOOGLE_CLIENT_ID);
    if (!payload.jti || !payload.events) return res.status(400).send('Invalid event payload');

    try {
      await RiscEvent.create({
        jti: payload.jti,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      if (error.code === 11000) return res.sendStatus(202);
      throw error;
    }

    for (const [eventType, event] of Object.entries(payload.events)) {
      const subject = event.subject || {};
      const googleId = typeof subject.sub === 'string' ? subject.sub : null;

      if (eventType.endsWith('/token-revoked') && subject.token_identifier_alg && subject.token) {
        const query = subject.token_identifier_alg === 'prefix'
          ? { refreshTokenPrefix: subject.token }
          : { refreshTokenDoubleHash: subject.token };
        await AuthAccount.updateOne(query, {
          $set: {
            refreshToken: null,
            accessToken: null,
            refreshTokenPrefix: null,
            refreshTokenDoubleHash: null
          }
        });
        continue;
      }

      if (!googleId) continue;

      const revokeSessions = eventType.endsWith('/sessions-revoked') ||
        eventType.endsWith('/tokens-revoked') ||
        eventType.endsWith('/account-disabled');
      const update = {};

      if (revokeSessions) update.$inc = { sessionVersion: 1 };
      if (eventType.endsWith('/account-disabled')) update.$set = { googleSignInDisabled: true };
      if (eventType.endsWith('/account-enabled')) update.$set = { googleSignInDisabled: false };
      if (eventType.endsWith('/token-revoked') || eventType.endsWith('/tokens-revoked')) {
        update.$set = {
          ...(update.$set || {}),
          refreshToken: null,
          accessToken: null,
          refreshTokenPrefix: null,
          refreshTokenDoubleHash: null
        };
      }

      if (Object.keys(update).length) await AuthAccount.updateOne({ googleId }, update);
    }

    return res.sendStatus(202);
  } catch (error) {
    console.error('Invalid Google RISC event:', error.message);
    return res.status(400).send('Invalid event');
  }
});

module.exports = router;
