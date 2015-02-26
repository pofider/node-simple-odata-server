module.exports = function (cfg, req, res) {

    try {
        cfg.executeRemove(req.params.collection, {_id: req.params.id}, function (e) {
            if (e) {
                return res.odataError(e);
            }

            res.writeHead(204);
            res.end();
        });
    } catch (e) {
        return res.odataError(e);
    }
}
