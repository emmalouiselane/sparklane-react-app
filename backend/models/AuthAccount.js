const mongoose = require('mongoose');

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
      type: String,
      required: true
    },
    refreshToken: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AuthAccount', AuthAccountSchema);
