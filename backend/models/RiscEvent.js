const mongoose = require('mongoose');

const RiscEventSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true }
});

RiscEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RiscEvent', RiscEventSchema);
