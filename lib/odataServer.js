/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * ODataServer class - main facade
 */

var Emitter = require('events').EventEmitter;
var util = require("util");
var url = require("url");
var metadata = require("./metadata.js");
var collections = require("./collections.js");
var query = require("./query.js");
var insert = require("./insert.js");
var update = require("./update.js");
var remove = require("./remove.js");
var Router = require("./router.js");
var prune = require("./prune.js");

function ODataServer(serviceUrl) {
    this.cfg = {
        serviceUrl: serviceUrl,
        afterRead: function() {},
        beforeQuery: function(col, query, cb) { cb();},
        executeQuery: ODataServer.prototype.executeQuery.bind(this),
        beforeInsert: function(col, query, cb) { cb();},
        executeInsert: ODataServer.prototype.executeInsert.bind(this),
        beforeUpdate: function(col, query, update, cb) { cb();},
        executeUpdate: ODataServer.prototype.executeUpdate.bind(this),
        beforeRemove: function(col, query, cb) { cb();},
        executeRemove: ODataServer.prototype.executeRemove.bind(this),
        base64ToBuffer: ODataServer.prototype.base64ToBuffer.bind(this),
        bufferToBase64: ODataServer.prototype.bufferToBase64.bind(this),
        pruneResults: ODataServer.prototype.pruneResults.bind(this)
    };
}

util.inherits(ODataServer, Emitter);

ODataServer.prototype.handle = function (req, res) {
    if (!this.cfg.serviceUrl && !req.protocol)
        throw new Error("Unable to determine service url from the express request or value provided in the ODataServer constructor.");

    this.cfg.serviceUrl = this.cfg.serviceUrl || (req.protocol + '://' + req.get('host') + req.originalUrl.replace(req.url, ""));
    if (!this.router) {
        this.router = new Router(url.parse(this.cfg.serviceUrl).pathname);
        this._initializeRoutes();
    }

    this.router.dispatch(req, res);
};

ODataServer.prototype._initializeRoutes = function () {
    var self = this;
    this.router.get("/\$metadata", function(req, res) {
        var result = metadata(self.cfg);
        res.writeHead(200, {'Content-Type': 'application/xml', 'DataServiceVersion': '4.0', 'OData-Version': '4.0'});
        return res.end(result);
    });
    this.router.get("/:collection/\$count/", function(req, res) {
        req.params.$count = true;
        query(self.cfg, req, res);
    });
    this.router.get("/:collection\\(:id\\)", function(req, res) {
        query(self.cfg, req, res);
    });
    this.router.get("/:collection", function(req, res) {
        query(self.cfg, req, res);
    });
    this.router.get("/", function(req, res) {
        var result = collections(self.cfg);
        res.writeHead(200, {'Content-Type': 'application/json'});
        return res.end(result);
    });
    this.router.post("/:collection", function(req, res) {
        insert(self.cfg, req, res);
    });
    this.router.patch("/:collection\\(:id\\)", function(req, res) {
        update(self.cfg, req, res);
    });
    this.router.delete("/:collection\\(:id\\)", function(req, res) {
        remove(self.cfg, req, res);
    });


    this.router.error(function(req, res, error) {
        function def(e) {
            self.emit("odata-error", e);
            res.writeHead(error.code || 500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                "error": {
                    "code": error.code || 500,
                    "message": e.message,
                    stack: e.stack,
                    "target": req.url,
                    "details": []
                },
                "innererror": { }
            }));
        }
        if (self.cfg.error) {
            self.cfg.error(req, res, error, def);
        }
        else {
            def(error);
        }
    });
};

ODataServer.prototype.error = function (fn) {
    this.cfg.error = fn.bind(this);
    return this;
};

ODataServer.prototype.query = function (fn) {
    this.cfg.query = fn.bind(this);
    return this;
};

ODataServer.prototype.beforeQuery = function (fn) {
    this.cfg.beforeQuery = fn.bind(this);
    return this;
};

ODataServer.prototype.executeQuery = function (col, query, cb) {
    var self = this;
    this.cfg.beforeQuery(col, query, function (err) {
        if (err)
          return cb(err);

        self.cfg.query(col, query, function(err, res) {
            if (err)
                return cb(err);

            self.cfg.afterRead(col, res);
            cb(null, res);
        });
    });
};

ODataServer.prototype.insert = function (fn) {
    this.cfg.insert = fn.bind(this);
    return this;
};

ODataServer.prototype.beforeInsert = function (fn) {
    this.cfg.beforeInsert = fn.bind(this);
    return this;
};

ODataServer.prototype.executeInsert = function (col, doc, cb) {
    var self = this;
    this.cfg.beforeInsert(col, doc, function (err) {
        if (err)
            return cb(err);

        self.cfg.insert(col, doc, cb);
    });
};

ODataServer.prototype.update = function (fn) {
    this.cfg.update = fn.bind(this);
    return this;
};

ODataServer.prototype.beforeUpdate = function (fn) {
    this.cfg.beforeUpdate = fn.bind(this);
    return this;
};

ODataServer.prototype.executeUpdate = function (col, query, update, cb) {
    var self = this;
    this.cfg.beforeUpdate(col, query, update, function (err) {
        if (err)
            return cb(err);

        self.cfg.update(col, query, update, cb);
    });
};

ODataServer.prototype.remove = function (fn) {
    this.cfg.remove = fn.bind(this);
    return this;
};

ODataServer.prototype.beforeRemove = function (fn) {
    this.cfg.beforeRemove = fn.bind(this);
    return this;
};

ODataServer.prototype.executeRemove = function (col, query, cb) {
    var self = this;
    this.cfg.beforeRemove(col, query, function (err) {
        if (err)
            return cb(err);

        self.cfg.remove(col, query, cb);
    });
};


ODataServer.prototype.afterRead = function (fn) {
    this.cfg.afterRead = fn;
    return this;
};

ODataServer.prototype.model = function (model) {
    this.cfg.model = model;
    return this;
};

ODataServer.prototype.onNeDB = function (getDB) {
    require("./nedbAdapter.js")(this, getDB);
    return this;
};

ODataServer.prototype.onMongo = function (getDB) {
    require("./mongoAdapter.js")(this, getDB);
    return this;
};

ODataServer.prototype.pruneResults = function(collection, res) {
    prune(this.cfg.model, collection, res);
};

ODataServer.prototype.base64ToBuffer = function(collection, doc) {
    var model = this.cfg.model;
    var entitySet = model.entitySets[collection];
    var entityType = model.entityTypes[entitySet.entityType.replace(model.namespace + ".", "")];

    for (var prop in doc) {
        if (!prop)
            continue;

        var propDef = entityType[prop];

        if (!propDef)
            continue;

        if (propDef.type === "Edm.Binary") {
            doc[prop] = new Buffer(doc[prop], 'base64');
        }
    }
}

ODataServer.prototype.bufferToBase64 = function(collection, res) {
    var model = this.cfg.model;
    var entitySet = model.entitySets[collection];
    var entityType = model.entityTypes[entitySet.entityType.replace(model.namespace + ".", "")];

    for (var i in res) {
        var doc = res[i];
        for (var prop in doc) {
            if (!prop)
                continue;

            var propDef = entityType[prop];

            if (!propDef)
                continue;

            if (propDef.type === "Edm.Binary") {
                doc[prop] = new Buffer(doc[prop]).toString("base64");
            }
        }
    }
}


module.exports = ODataServer;