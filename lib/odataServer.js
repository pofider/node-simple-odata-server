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

function ODataServer(serviceUrl) {
    this.cfg = {
        serviceUrl: serviceUrl
    };
    this.router = new Router(url.parse(serviceUrl).pathname);
    this._initializeRoutes();
}

util.inherits(ODataServer, Emitter);

ODataServer.prototype.handle = function (req, res) {
    this.router.dispatch(req, res);
}

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
        self.emit("odata-error", error);
        res.writeHead(error.code || 500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            "error": {
                "code": "500",
                "message": error.message,
                stack: error.stack,
                "target": req.url,
                "details": []
            },
            "innererror": { }
        }));

    });
}

ODataServer.prototype.query = function (fn) {
    this.cfg.query = fn;
    return this;
}

ODataServer.prototype.insert = function (fn) {
    this.cfg.insert = fn;
    return this;
}

ODataServer.prototype.update = function (fn) {
    this.cfg.update = fn;
    return this;
}

ODataServer.prototype.remove = function (fn) {
    this.cfg.remove = fn;
    return this;
}

ODataServer.prototype.model = function (model) {
    this.cfg.model = model;
    return this;
}


module.exports = ODataServer;