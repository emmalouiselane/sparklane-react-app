const mongoose = require('mongoose');

function isValidStoredToken(value) {
  return (
    value === null ||
    (typeof value === 'object' &&
      typeof value.iv === 'string' &&
      typeof value.authTag === 'string' &&
      typeof value.value === 'string')
  );
}

const AuthAccountSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      required: true
    },
    name: {
      givenName: String,
      familyName: String
    },
    email: {
      type: String,
      required: true
    },
    emails: [
      {
        value: String,
        verified: Boolean
      }
    ],
    photos: [
      {
        value: String
      }
    ],
    accessToken: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    refreshToken: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

AuthAccountSchema.path('accessToken').validate((value) => {
  return isValidStoredToken(value);
}, 'Invalid encrypted access token format');

AuthAccountSchema.path('refreshToken').validate((value) => {
  return isValidStoredToken(value);
}, 'Invalid encrypted refresh token format');

module.exports = mongoose.model('AuthAccount', AuthAccountSchema);
