/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Configure ODataServer to run on mongodb
 */

var ObjectId = require('mongodb').ObjectID

function _convertStringsToObjectIds (o) {
  for (var i in o) {
    if (i === '_id' && (typeof o[i] === 'string' || o[i] instanceof String)) {
      o[i] = new ObjectId(o[i])
    }

    if (o[i] !== null && typeof (o[i]) === 'object') {
      _convertStringsToObjectIds(o[i])
    }
  }
};

function update (collection, query, update, cb) {
  _convertStringsToObjectIds(query)

  if (update.$set) {
    delete update.$set._id
  }

  this.getDB(function (err, db) {
    if (err) {
      return cb(err)
    }

    db.collection(collection).updateOne(query, update, function (err, res) {
      if (err) {
        return cb(err)
      }

      if (res.matchedCount !== 1) {
        return cb(new Error('Update not successful'))
      }
      return cb(null, res.matchedCount)
    })
  })
}

function remove (collection, query, cb) {
  _convertStringsToObjectIds(query)

  this.getDB(function (err, db) {
    if (err) {
      return cb(err)
    }

    db.collection(collection).remove(query, cb)
  })
}

function insert (collection, doc, cb) {
  this.getDB(function (err, db) {
    if (err) {
      return cb(err)
    }

    db.collection(collection).insert(doc, function (err, res) {
      if (err) {
        return cb(err)
      }

      if (res.ops.length !== 1) {
        return cb(new Error('Mongo insert should return single document'))
      }

      cb(null, res.ops[0])
    })
  })
}

function query (collection, query, cb) {
  _convertStringsToObjectIds(query)

  this.getDB(function (err, db) {
    if (err) {
      return cb(err)
    }

    var qr = db.collection(collection).find(query.$filter, query.$select || {})

    if (query.$sort) {
      qr = qr.sort(query.$sort)
    }
    if (query.$skip) {
      qr = qr.skip(query.$skip)
    }
    if (query.$limit) {
      qr = qr.limit(query.$limit)
    }

    if (query.$count) {
      return qr.count(cb)
    }

    if (!query.$inlinecount) {
      return qr.toArray(cb)
    }

    qr.toArray(function (err, res) {
      if (err) {
        return cb(err)
      }

      db.collection(collection).find(query.$filter).count(function (err, c) {
        if (err) {
          return cb(err)
        }

        cb(null, {
          count: c,
          value: res
        })
      })
    })
  })
}

module.exports = function (odataServer, getDB) {
  odataServer.getDB = getDB
  odataServer.update(update)
        .remove(remove)
        .query(query)
        .insert(insert)
}

