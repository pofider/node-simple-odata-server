function keys (o) {
  const res = []
  const k = Object.keys(o)
  for (const i in k) {
    if (k[i].lastIndexOf('@', 0) === 0) {
      res.splice(0, 0, k[i])
    } else {
      res.push(k[i])
    }
  }
  return res
};

function sortProperties (o) {
  const res = {}
  const props = keys(o)

  for (let i = 0; i < props.length; i++) {
    res[props[i]] = o[props[i]]
  }
  return res
};

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

function processBody (data, cfg, req, res) {
  try {
    removeOdataType(data)
    cfg.base64ToBuffer(req.params.collection, data)
    cfg.executeInsert(req.params.collection, data, req, function (err, entity) {
      if (err) {
        return res.odataError(err)
      }

      res.statusCode = 201
      res.setHeader('Content-Type', 'application/json;odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false;charset=utf-8')
      res.setHeader('OData-Version', '4.0')
      res.setHeader('Location', cfg.serviceUrl + '/' + req.params.collection + "/('" + encodeURI(entity._id) + "')")
      cfg.addCorsToResponse(res)

      cfg.pruneResults(req.params.collection, entity)

      // odata.context must be first
      entity['@odata.id'] = cfg.serviceUrl + '/' + req.params.collection + "('" + entity._id + "')"
      entity['@odata.editLink'] = cfg.serviceUrl + '/' + req.params.collection + "('" + entity._id + "')"
      entity['@odata.context'] = cfg.serviceUrl + '/$metadata#' + req.params.collection + '/$entity'

      entity = sortProperties(entity)
      cfg.bufferToBase64(req.params.collection, [entity])

      return res.end(JSON.stringify(entity))
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
