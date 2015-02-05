var parser = require("odata-parser");
var queryTransform = require("./queryTransform.js");
var url = require("url");

module.exports = function(cfg, req, res) {
    var queryOptions = {}

    var qs = url.parse(req.url).search;
    if (qs) {
        qs = decodeURIComponent(qs.substring(1, qs.length));
        queryOptions = queryTransform(parser.parse(qs));
    }

    queryOptions.collection = req.params.collection;

    if (req.params.$count) {
        queryOptions.$count = true;
    }

    if (req.params.id) {
        req.params.id = req.params.id.replace(/\"/g, "").replace(/'/g, "");
        queryOptions.$filter = { _id: req.params.id};
    }

    cfg.query(queryOptions, function(err, result) {
        if (err) {
            return res.error(err);
        }

        res.writeHead(200, {'Content-Type': 'application/json', 'OData-Version': '4.0'});

        var out = {
            "@odata.context": cfg.serviceUrl + "/$metadata#" + req.params.collection,
            "value": result
        }

        return res.end(JSON.stringify(out));
    });
}