const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function getKeyBuffer() {
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required');
  }

  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

  if (keyBuffer.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string');
  }

  return keyBuffer;
}

function encryptToken(token) {
  if (!token) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKeyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    value: encrypted.toString('hex')
  };
}

function decryptStoredToken(tokenValue) {
  if (!tokenValue) {
    return null;
  }

  if (
    typeof tokenValue !== 'object' ||
    typeof tokenValue.iv !== 'string' ||
    typeof tokenValue.authTag !== 'string' ||
    typeof tokenValue.value !== 'string'
  ) {
    throw new Error('Stored token is not in the expected encrypted format');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKeyBuffer(),
    Buffer.from(tokenValue.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tokenValue.authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(tokenValue.value, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  decryptStoredToken,
  encryptToken
};
