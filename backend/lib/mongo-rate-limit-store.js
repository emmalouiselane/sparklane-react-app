const { createHash } = require('node:crypto');
const RateLimitBucket = require('../models/rate-limit-bucket');

class RateLimitStoreError extends Error {
  constructor(cause) {
    super('Rate limit storage unavailable', { cause });
    this.name = 'RateLimitStoreError';
  }
}

class MongoRateLimitStore {
  constructor(prefix, model = RateLimitBucket) {
    this.prefix = prefix;
    this.model = model;
  }

  init({ windowMs }) {
    this.windowMs = windowMs;
  }

  bucketId(key) {
    return createHash('sha256').update(`${this.prefix}:${key}`).digest('hex');
  }

  async increment(key) {
    // Reset and increment in one atomic operation, using the database clock so
    // replicas agree. Expiry never depends on MongoDB's asynchronous TTL sweep.
    const expired = { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, '$$NOW'] };
    const update = [{ $set: {
      hits: { $cond: [expired, 1, { $add: ['$hits', 1] }] },
      expiresAt: { $cond: [expired, { $add: ['$$NOW', this.windowMs] }, '$expiresAt'] }
    } }];
    const increment = () => this.model.findOneAndUpdate(
      { _id: this.bucketId(key) }, update,
      { upsert: true, new: true, setDefaultsOnInsert: false, maxTimeMS: 2000 }
    ).lean();

    try {
      let bucket;
      try {
        bucket = await increment();
      } catch (error) {
        // Concurrent first requests can race on the unique _id index.
        if (error.code !== 11000) 
          throw error;
        
        bucket = await increment();
      }
      return { totalHits: bucket.hits, resetTime: bucket.expiresAt };
    } catch (error) {
      throw new RateLimitStoreError(error);
    }
  }

  async decrement(key) {
    await this.model.updateOne(
      { _id: this.bucketId(key), hits: { $gt: 0 }, expiresAt: { $gt: new Date() } },
      { $inc: { hits: -1 } }
    );
  }

  async resetKey(key) {
    await this.model.deleteOne({ _id: this.bucketId(key) });
  }
}

module.exports = { MongoRateLimitStore, RateLimitStoreError };
