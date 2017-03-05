/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * ODataServer class - main facade
 */

/* eslint no-useless-escape: 0 */

var Emitter = require('events').EventEmitter
var util = require('util')
var url = require('url')
var metadata = require('./metadata.js')
var collections = require('./collections.js')
var query = require('./query.js')
var insert = require('./insert.js')
var update = require('./update.js')
var remove = require('./remove.js')
var Router = require('./router.js')
var prune = require('./prune.js')

function ODataServer (serviceUrl) {
  this.serviceUrl = serviceUrl

  this.cfg = {
    serviceUrl: serviceUrl,
    afterRead: function () {},
    beforeQuery: function (col, query, req, cb) { cb() },
    executeQuery: ODataServer.prototype.executeQuery.bind(this),
    beforeInsert: function (col, query, req, cb) { cb() },
    executeInsert: ODataServer.prototype.executeInsert.bind(this),
    beforeUpdate: function (col, query, update, req, cb) { cb() },
    executeUpdate: ODataServer.prototype.executeUpdate.bind(this),
    beforeRemove: function (col, query, req, cb) { cb() },
    executeRemove: ODataServer.prototype.executeRemove.bind(this),
    base64ToBuffer: ODataServer.prototype.base64ToBuffer.bind(this),
    bufferToBase64: ODataServer.prototype.bufferToBase64.bind(this),
    pruneResults: ODataServer.prototype.pruneResults.bind(this)
  }
}

util.inherits(ODataServer, Emitter)

ODataServer.prototype.handle = function (req, res) {
  if (!this.cfg.serviceUrl && !req.protocol) {
    throw new Error('Unable to determine service url from the express request or value provided in the ODataServer constructor.')
  }

  function escapeRegExp (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
  }

    // If mounted in express, trim off the subpath (req.url) giving us just the base path
  var path = (req.originalUrl || '/').replace(new RegExp(escapeRegExp(req.url) + '$'), '')
  this.cfg.serviceUrl = this.serviceUrl ? this.serviceUrl : (req.protocol + '://' + req.get('host') + path)

  var prefix = url.parse(this.cfg.serviceUrl).pathname
  if (!this.router || (prefix !== this.router.prefix)) {
    this.router = new Router(prefix)
    this._initializeRoutes()
  }

  this.router.dispatch(req, res)
}

ODataServer.prototype._initializeRoutes = function () {
  var self = this
  this.router.get('/\$metadata', function (req, res) {
    var result = metadata(self.cfg)
    res.writeHead(200, {'Content-Type': 'application/xml', 'DataServiceVersion': '4.0', 'OData-Version': '4.0'})
    return res.end(result)
  })
  this.router.get('/:collection/\$count/', function (req, res) {
    req.params.$count = true
    query(self.cfg, req, res)
  })
  this.router.get('/:collection\\(:id\\)', function (req, res) {
    query(self.cfg, req, res)
  })
  this.router.get('/:collection', function (req, res) {
    query(self.cfg, req, res)
  })
  this.router.get('/', function (req, res) {
    var result = collections(self.cfg)
    res.writeHead(200, {'Content-Type': 'application/json'})
    return res.end(result)
  })
  this.router.post('/:collection', function (req, res) {
    insert(self.cfg, req, res)
  })
  this.router.patch('/:collection\\(:id\\)', function (req, res) {
    update(self.cfg, req, res)
  })
  this.router.delete('/:collection\\(:id\\)', function (req, res) {
    remove(self.cfg, req, res)
  })

  if (this.cfg.cors) {
    this.router.options('/*', function (req, res) {
      res.writeHead(200, {'Access-Control-Allow-Origin': self.cfg.cors})
      res.end()
    })
  }

  this.router.error(function (req, res, error) {
    function def (e) {
      self.emit('odata-error', e)
      res.writeHead((error.code && error.code >= 100 && error.code < 600) ? error.code : 500, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({
        'error': {
          'code': error.code || 500,
          'message': e.message,
          stack: e.stack,
          'target': req.url,
          'details': []
        },
        'innererror': { }
      }))
    }
    if (self.cfg.error) {
      self.cfg.error(req, res, error, def)
    } else {
      def(error)
    }
  })
}

ODataServer.prototype.error = function (fn) {
  this.cfg.error = fn.bind(this)
  return this
}

ODataServer.prototype.query = function (fn) {
  this.cfg.query = fn.bind(this)
  return this
}

ODataServer.prototype.cors = function (domains) {
  this.cfg.cors = domains
  return this
}

ODataServer.prototype.beforeQuery = function (fn) {
  if (fn.length === 3) {
    console.warn('Listener function should accept request parameter.')
    var origFn = fn
    fn = function (col, query, req, cb) {
      origFn(col, query, cb)
    }
  }

  this.cfg.beforeQuery = fn.bind(this)
  return this
}

ODataServer.prototype.executeQuery = function (col, query, req, cb) {
  var self = this

  this.cfg.beforeQuery(col, query, req, function (err) {
    if (err) {
      return cb(err)
    }

    self.cfg.query(col, query, function (err, res) {
      if (err) {
        return cb(err)
      }

      self.cfg.afterRead(col, res)
      cb(null, res)
    })
  })
}

ODataServer.prototype.insert = function (fn) {
  this.cfg.insert = fn.bind(this)
  return this
}

ODataServer.prototype.beforeInsert = function (fn) {
  if (fn.length === 3) {
    console.warn('Listener function should accept request parameter.')
    var origFn = fn
    fn = function (col, doc, req, cb) {
      origFn(col, doc, cb)
    }
  }

  this.cfg.beforeInsert = fn.bind(this)
  return this
}

ODataServer.prototype.executeInsert = function (col, doc, req, cb) {
  var self = this
  this.cfg.beforeInsert(col, doc, req, function (err) {
    if (err) {
      return cb(err)
    }

    self.cfg.insert(col, doc, cb)
  })
}

ODataServer.prototype.update = function (fn) {
  this.cfg.update = fn.bind(this)
  return this
}

ODataServer.prototype.beforeUpdate = function (fn) {
  if (fn.length === 4) {
    console.warn('Listener function should accept request parameter.')
    var origFn = fn
    fn = function (col, query, update, req, cb) {
      origFn(col, query, update, cb)
    }
  }

  this.cfg.beforeUpdate = fn.bind(this)
  return this
}

ODataServer.prototype.executeUpdate = function (col, query, update, req, cb) {
  var self = this

  this.cfg.beforeUpdate(col, query, update, req, function (err) {
    if (err) {
      return cb(err)
    }

    self.cfg.update(col, query, update, cb)
  })
}

ODataServer.prototype.remove = function (fn) {
  this.cfg.remove = fn.bind(this)
  return this
}

ODataServer.prototype.beforeRemove = function (fn) {
  if (fn.length === 3) {
    console.warn('Listener function should accept request parameter.')
    var origFn = fn
    fn = function (col, query, req, cb) {
      origFn(col, query, cb)
    }
  }

  this.cfg.beforeRemove = fn.bind(this)
  return this
}

ODataServer.prototype.executeRemove = function (col, query, req, cb) {
  var self = this
  this.cfg.beforeRemove(col, query, req, function (err) {
    if (err) {
      return cb(err)
    }

    self.cfg.remove(col, query, cb)
  })
}

ODataServer.prototype.afterRead = function (fn) {
  this.cfg.afterRead = fn
  return this
}

ODataServer.prototype.model = function (model) {
  this.cfg.model = model
  return this
}

ODataServer.prototype.onNeDB = function (getDB) {
  require('./nedbAdapter.js')(this, getDB)
  return this
}

ODataServer.prototype.onMongo = function (getDB) {
  require('./mongoAdapter.js')(this, getDB)
  return this
}

ODataServer.prototype.pruneResults = function (collection, res) {
  prune(this.cfg.model, collection, res)
}

ODataServer.prototype.base64ToBuffer = function (collection, doc) {
  var model = this.cfg.model
  var entitySet = model.entitySets[collection]
  var entityType = model.entityTypes[entitySet.entityType.replace(model.namespace + '.', '')]

  for (var prop in doc) {
    if (!prop) {
      continue
    }

    var propDef = entityType[prop]

    if (!propDef) {
      continue
    }

    if (propDef.type === 'Edm.Binary') {
      doc[prop] = new Buffer(doc[prop], 'base64')
    }
  }
}

ODataServer.prototype.bufferToBase64 = function (collection, res) {
  var model = this.cfg.model
  var entitySet = model.entitySets[collection]
  var entityType = model.entityTypes[entitySet.entityType.replace(model.namespace + '.', '')]

  for (var i in res) {
    var doc = res[i]
    for (var prop in doc) {
      if (!prop) {
        continue
      }

      var propDef = entityType[prop]

      if (!propDef) {
        continue
      }

      if (propDef.type === 'Edm.Binary') {
                // nedb returns object instead of buffer on node 4
        if (!Buffer.isBuffer(doc[prop]) && !doc[prop].length) {
          var obj = doc[prop]
          obj = obj.data || obj
          doc[prop] = Object.keys(obj).map(function (key) { return obj[key] })
        }

                // unwrap mongo style buffers
        if (doc[prop]._bsontype === 'Binary') {
          doc[prop] = doc[prop].buffer
        }

        doc[prop] = new Buffer(doc[prop]).toString('base64')
      }
    }
  }
}

module.exports = ODataServer
