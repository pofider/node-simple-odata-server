/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData DELETE request
 */

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
