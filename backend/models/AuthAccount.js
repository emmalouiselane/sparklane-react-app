const mongoose = require('mongoose');

function isValidStoredToken(value) {
  return value === null ||
    (typeof value === 'object' && typeof value.iv === 'string' &&
      typeof value.authTag === 'string' && typeof value.value === 'string');
}

const AuthAccountSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  name: { givenName: String, familyName: String },
  email: { type: String, required: true },
  emails: [{ value: String, verified: Boolean }],
  photos: [{ value: String }],
  accessToken: { type: mongoose.Schema.Types.Mixed, default: null },
  refreshToken: { type: mongoose.Schema.Types.Mixed, default: null },
  refreshTokenPrefix: { type: String, default: null, index: true },
  refreshTokenDoubleHash: { type: String, default: null, index: true },
  sessionVersion: { type: Number, default: 0 },
  googleSignInDisabled: { type: Boolean, default: false },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' }
}, { timestamps: true });

AuthAccountSchema.path('accessToken').validate(isValidStoredToken, 'Invalid encrypted access token format');
AuthAccountSchema.path('refreshToken').validate(isValidStoredToken, 'Invalid encrypted refresh token format');

module.exports = mongoose.model('AuthAccount', AuthAccountSchema);
