const session = require('express-session');
const Session = require('../models/Session');

function resolveExpiry(sessionData) {
  if (sessionData?.cookie?.expires) {
    return new Date(sessionData.cookie.expires);
  }

  const maxAge = sessionData?.cookie?.maxAge;

  if (typeof maxAge === 'number') {
    return new Date(Date.now() + maxAge);
  }

  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

class MongoSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const record = await Session.findOne({ sid }).lean();

      if (!record) {
        callback(null, null);
        return;
      }

      callback(null, JSON.parse(record.session));
    } catch (error) {
      callback(error);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const expiresAt = resolveExpiry(sessionData);

      await Session.findOneAndUpdate(
        { sid },
        {
          sid,
          session: JSON.stringify(sessionData),
          expiresAt
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  async destroy(sid, callback) {
    try {
      await Session.deleteOne({ sid });
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      const expiresAt = resolveExpiry(sessionData);

      await Session.updateOne(
        { sid },
        {
          $set: {
            expiresAt,
            session: JSON.stringify(sessionData)
          }
        }
      );

      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }
}

module.exports = MongoSessionStore;
