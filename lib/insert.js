function processBody(data, cfg, req, res) {
    delete data["@odata.type"];

    try {
        cfg.insert(req.params.collection, data, function (err, entity) {
            if (err) {
                return res.error(err);
            }

            res.writeHead(201, {
                "Content-Type": 'application/json;odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false;charset=utf-8',
                "OData-Version": '4.0',
                "Location": cfg.serviceUrl + req.params.collection + "/('" + entity._id + "')"
            });

            entity["@odata.context"] = cfg.serviceUrl + "/$metadata#" + req.params.collection + "/$entity";
            entity["@odata.id"] = cfg.serviceUrl + req.params.collection + "/('" + entity._id + "')";
            entity["@odata.editLink"] = cfg.serviceUrl + req.params.collection + "/('" + entity._id + "')";

            return res.end(JSON.stringify(entity));
        });
    }catch(e) {
        res.error(e);
    }
}

module.exports = function (cfg, req, res) {
    if (req.body) {
        return processBody(req.body, cfg, req, res);
    }

    var body = '';
    req.on('data', function (data) {
        body += data;
        if (body.length > 1e6)
            req.connection.destroy();
    });
    req.on('end', function () {
        return processBody(JSON.parse(body), cfg, req, res);
    });
}
