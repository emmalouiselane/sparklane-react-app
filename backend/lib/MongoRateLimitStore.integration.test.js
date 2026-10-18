const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const RateLimitBucket = require('../models/RateLimitBucket');
const { MongoRateLimitStore } = require('./MongoRateLimitStore');

test('MongoDB atomically shares counts between replicas and resets expired buckets before TTL cleanup', {
  skip: !process.env.RATE_LIMIT_TEST_MONGODB_URI
}, async t => {
  // Always use an isolated database, even if the supplied server hosts app data.
  const connection = await mongoose.createConnection(process.env.RATE_LIMIT_TEST_MONGODB_URI, {
    dbName: `rate_limit_test_${randomUUID().replaceAll('-', '')}`
  }).asPromise();
  t.after(async () => {
    await connection.dropDatabase();
    await connection.close();
  });
  const model = connection.model('RateLimitBucket', RateLimitBucket.schema);
  await model.init();
  const replicaA = new MongoRateLimitStore('api', model);
  const replicaB = new MongoRateLimitStore('api', model);
  const writes = new MongoRateLimitStore('writes', model);
  for (const store of [replicaA, replicaB, writes]) store.init({ windowMs: 60000 });

  const counts = await Promise.all(Array.from({ length: 100 }, (_, index) =>
    (index % 2 ? replicaA : replicaB).increment('owner')
  ));
  assert.deepEqual(counts.map(count => count.totalHits).sort((a, b) => a - b), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.equal(new Set(counts.map(count => count.resetTime.getTime())).size, 1);
  assert.equal(await model.countDocuments(), 1);
  const restarted = new MongoRateLimitStore('api', model);
  restarted.init({ windowMs: 60000 });
  assert.equal((await restarted.increment('owner')).totalHits, 101);
  assert.equal((await writes.increment('owner')).totalHits, 1);

  // The expired record still exists; the request itself must reset it.
  await model.updateOne({ _id: replicaA.bucketId('owner') }, { $set: { expiresAt: new Date(0), hits: 500 } });
  const reset = await replicaB.increment('owner');
  assert.equal(reset.totalHits, 1);
  assert.ok(reset.resetTime > new Date());
  assert.equal((await replicaA.increment('owner')).totalHits, 2);
  await replicaA.resetKey('owner');
  assert.equal((await replicaB.increment('owner')).totalHits, 1);
  assert.equal((await writes.increment('owner')).totalHits, 2);
});
