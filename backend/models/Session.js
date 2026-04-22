const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    sid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    session: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', SessionSchema);
