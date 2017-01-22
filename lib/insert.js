function keys (o) {
  var res = []
  var k = Object.keys(o)
  for (var i in k) {
    if (k[i].lastIndexOf('@', 0) === 0) {
      res.splice(0, 0, k[i])
    } else {
      res.push(k[i])
    }
  }
  return res
};

function sortProperties (o) {
  var res = {}
  var props = keys(o)

  for (var i = 0; i < props.length; i++) {
    res[props[i]] = o[props[i]]
  }
  return res
};

function processBody (data, cfg, req, res) {
  delete data['@odata.type']

  try {
    cfg.base64ToBuffer(req.params.collection, data)
    cfg.executeInsert(req.params.collection, data, req, function (err, entity) {
      if (err) {
        return res.odataError(err)
      }

      res.writeHead(201, {
        'Content-Type': 'application/json;odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false;charset=utf-8',
        'OData-Version': '4.0',
        'Location': cfg.serviceUrl + '/' + req.params.collection + "/('" + entity._id + "')"
      })

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

  var body = ''
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
