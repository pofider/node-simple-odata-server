/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData PATCH requests
 */

/* eslint no-useless-escape: 0 */

function removeOdataType (doc) {
  if (doc instanceof Array) {
    for (const i in doc) {
      if (typeof doc[i] === 'object' && doc[i] !== null) {
        removeOdataType(doc[i])
      }
    }
  }

  delete doc['@odata.type']

  for (const prop in doc) {
    if (typeof doc[prop] === 'object' && doc[prop] !== null) {
      removeOdataType(doc[prop])
    }
  }
}

function processBody (body, cfg, req, res) {
  removeOdataType(body)

  const query = {
    _id: req.params.id.replace(/\"/g, '').replace(/'/g, '')
  }

  const update = {
    $set: body
  }

  try {
    cfg.base64ToBuffer(req.params.collection, update.$set)
    cfg.executeUpdate(req.params.collection, query, update, req, function (e, entity) {
      if (e) {
        return res.odataError(e)
      }

      res.statusCode = 204
      cfg.addCorsToResponse(res)

      res.end()
    })
  } catch (e) {
    res.odataError(e)
  }
}

module.exports = function (cfg, req, res) {
  if (req.body) {
    return processBody(req.body, cfg, req, res)
  }
  let body = ''
  req.on('data', function (data) {
    body += data
    if (body.length > 1e6) {
      req.connection.destroy()
    }
  })
  req.on('end', function () {
    return processBody(JSON.parse(body), cfg, req, res)
  })
}
