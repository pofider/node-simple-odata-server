function processBody(body, cfg, req, res) {
    delete body["@odata.type"];

    var query = {
        _id: req.params.id.replace(/\"/g, "").replace(/'/g, "")
    }

    var update = {
        $set: body
    }

    try {
        cfg.update(req.params.collection, query, update, function (e, entity) {
            if (e) {
                return res.error(e);
            }

            res.writeHead(204);
            res.end();
        });
    } catch(e) {
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
