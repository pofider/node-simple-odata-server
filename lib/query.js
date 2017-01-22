/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData query GET requests
 */

/* eslint no-useless-escape: 0 */
/* eslint no-redeclare:0 */

var parser = require('odata-parser')
var queryTransform = require('./queryTransform.js')
var url = require('url')
var querystring = require('querystring')

module.exports = function (cfg, req, res) {
  if (!cfg.model.entitySets[req.params.collection]) {
    var error = new Error('Entity set not Found')
    error.code = 404
    res.odataError(error)
    return
  }

  var queryOptions = {
    $filter: {}
  }

  var _url = url.parse(req.url, true)
  if (_url.search) {
    var query = _url.query
    var fixedQS = {}
    if (query.$) fixedQS.$ = query.$
    if (query.$expand) fixedQS.$expand = query.$expand
    if (query.$filter) fixedQS.$filter = query.$filter
    if (query.$format) fixedQS.$format = query.$format
    if (query.$inlinecount) fixedQS.$inlinecount = query.$inlinecount
    if (query.$select) fixedQS.$select = query.$select
    if (query.$skip) fixedQS.$skip = query.$skip
    if (query.$top) fixedQS.$top = query.$top
    if (query.$orderby) fixedQS.$orderby = query.$orderby

    var encodedQS = decodeURIComponent(querystring.stringify(fixedQS))
    if (encodedQS) {
      queryOptions = queryTransform(parser.parse(encodedQS))
    }
    if (query.$count) {
      queryOptions.$inlinecount = true
    }
  }

  queryOptions.collection = req.params.collection

  if (req.params.$count) {
    queryOptions.$count = true
  }

  if (req.params.id) {
    req.params.id = req.params.id.replace(/\"/g, '').replace(/'/g, '')
    queryOptions.$filter = {
      _id: req.params.id
    }
  }

  cfg.executeQuery(queryOptions.collection, queryOptions, req, function (err, result) {
    if (err) {
      return res.odataError(err)
    }

    res.writeHead(200, {
      'Content-Type': 'application/json;odata.metadata=minimal',
      'OData-Version': '4.0'
    })
    var out = {}
        // define the @odataContext in case of selection
    var sAdditionIntoContext = ''
    var oSelect = queryOptions['$select']
    if (oSelect) {
      var countProp = Object.keys(oSelect).length
      var ctr = 1
      for (var key in oSelect) {
        sAdditionIntoContext += key.toString() + (ctr < countProp ? ',' : '')
        ctr++
      }
    }
    if (queryOptions['$filter'].hasOwnProperty('_id')) {
      sAdditionIntoContext = sAdditionIntoContext.length > 0 ? '(' + sAdditionIntoContext + ')/$entity' : '/$entity'
      out['@odata.context'] = cfg.serviceUrl + '/$metadata#' + req.params.collection + sAdditionIntoContext
      for (var key in result) {
        out[key] = result[key]
      }
      out['value'] = result
    } else {
      sAdditionIntoContext = sAdditionIntoContext.length > 0 ? '(' + sAdditionIntoContext + ')' : ''
      out = {
        '@odata.context': cfg.serviceUrl + '/$metadata#' + req.params.collection + sAdditionIntoContext,
        'value': result
      }
    }

    if (queryOptions.$inlinecount) {
      out['@odata.count'] = result.count
      out.value = result.value
    }
    cfg.pruneResults(queryOptions.collection, out.value)

    cfg.bufferToBase64(queryOptions.collection, out.value)

    return res.end(JSON.stringify(out))
  })
}
