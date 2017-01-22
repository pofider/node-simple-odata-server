/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData DELETE request
 */

/* eslint no-useless-escape: 0 */

module.exports = function (cfg, req, res) {
  try {
    var query = {
      _id: req.params.id.replace(/\"/g, '').replace(/'/g, '')
    }

    cfg.executeRemove(req.params.collection, query, req, function (e) {
      if (e) {
        return res.odataError(e)
      }

      res.writeHead(204)
      res.end()
    })
  } catch (e) {
    return res.odataError(e)
  }
}
