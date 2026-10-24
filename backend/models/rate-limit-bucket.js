const mongoose = require('mongoose');

const RateLimitBucketSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true },
  hits: { 
    type: Number, 
    required: true },
  expiresAt: { 
    type: Date, 
    required: true }
}, { versionKey: false, bufferCommands: false });

RateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimitBucket', RateLimitBucketSchema);
