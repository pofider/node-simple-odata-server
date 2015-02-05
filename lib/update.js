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

        var query = {
            _id :   req.params.id.replace(/\"/g, "").replace(/'/g, "")
        }

        var update = {
            $set : data
        }
        cfg.update(query, update, function (e, entity) {
            if (e) {
                return res.error(e);
            }

            res.writeHead(204);
            res.end();
        });
    });
}
