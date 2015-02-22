module.exports = function (cfg, req, res) {

    try {
        cfg.remove(req.params.collection, {_id: req.params.id}, function (e) {
            if (e) {
                return res.error(e);
            }

            res.writeHead(204);
            res.end();
        });
    } catch (e) {
        return res.error(e);
    }
}
