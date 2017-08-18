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


var isDate = function(date) {
  return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

let transformResultToAtom = (rootUrl, collection, result, res) => {
  let atomResponse = 
  `
  <?xml version="1.0" encoding="utf-8"?>
  <feed xml:base="${rootUrl}/" xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:georss="http://www.georss.org/georss" xmlns:gml="http://www.opengis.net/gml">
  `
  res.write(atomResponse)

  let value = result.value
  if(value && value.constructor === Array) {
    let numValueItems = value.length;

    res.write(`<id>${rootUrl}/${collection}</id>`)
    res.write(`<title type="text">${collection}</title>`)
    res.write(`<link rel="self" title="${collection}" href="${collection}"/>`)
    
    for(let i = 0; i < numValueItems; i++) {      
      res.write(`<entry>`)
      res.write(`<id>${rootUrl}/${collection}(${i})</id>`)

      res.write(`<category term="tradedepot.${collection}" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />`)
      res.write(`<link rel="edit" title="${collection}" href="${collection}(${i})" />`)

      res.write(`<content type="application/xml">`)
      res.write(`<m:properties>`)
      
      let allKeysInValue = Object.keys(value[i]) || []

      let numKeysInValue = allKeysInValue.length
      for(let j = 0; j < numKeysInValue; j++) {
        let field = allKeysInValue[j]
        let fieldValue = value[i][allKeysInValue[j]]
        
        if(isDate(fieldValue)) {
          res.write(`<d:${field} m:type="Edm.DateTime">${fieldValue}</d:${field}>`)
        } else if(!isNaN(fieldValue)) {
          res.write(`<d:${field} m:type="Edm.Double">${fieldValue}</d:${field}>`)
        } else if(!fieldValue) {
          res.write(`<d:${field} m:null="true" />`)
        } else {
          res.write(`<d:${field} m:type="Edm.String">${fieldValue}</d:${field}>`)
        }
      }
      res.write(`</m:properties>`)
      res.write(`</content>`)
      
      res.write('</entry>')
    }
  }

  return res.end()
}


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

    // res.writeHead(200, {
    //   'Content-Type': 'application/json;odata.metadata=minimal',
    //   'OData-Version': '4.0'
    // })
    // return res.end(JSON.stringify(out))

    if (queryOptions.$count) {
      res.end(`${result}`)
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'OData-Version': '1.0'
      })
      return transformResultToAtom(cfg.serviceUrl, queryOptions.collection, out, res)  
    }
  })
}
