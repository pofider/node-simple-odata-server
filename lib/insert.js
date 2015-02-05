module.exports = function (cfg, req, res) {
    var body = '';
    req.on('data', function (data) {
        body += data;
        if (body.length > 1e6)
            req.connection.destroy();
    });
    req.on('end', function () {
        var data = JSON.parse(body);
        delete data["@odata.type"];

        cfg.insert(data, function (err, entity) {
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
    });
}
