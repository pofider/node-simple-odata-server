/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData / request
 */


let transformResultToAtom = (result, rootUrl) => {
  let atomResponse = 
  `<?xml version="1.0" encoding="utf-8"?>
  <service xml:base="${rootUrl}/" xmlns="http://www.w3.org/2007/app" xmlns:atom="http://www.w3.org/2005/Atom">
  `
  
  let value = result.value
  if(value && value.constructor === Array) {
    let numValueItems = value.length;

    atomResponse += '<workspace>'
    atomResponse += '<atom:title>Default</atom:title>'
    
    for(let i = 0; i < numValueItems; i++) {
      let valueUrl = value[i].url
      let valueName = value[i].name
      
      atomResponse += `<collection href="${valueUrl}">`
      atomResponse += `<atom:title>${valueName}</atom:title>`
      atomResponse += '</collection>'
    }
    atomResponse += '</workspace>'
  }
  atomResponse += '</service>'
  
  return atomResponse
}


module.exports = function (cfg) {
  var collections = []
  for (var key in cfg.model.entitySets) {
    collections.push({
      'kind': 'EntitySet',
      'name': key,
      'url': key
    })
  }

  let collectionsResult = {
    '@odata.context': cfg.serviceUrl + '/$metadata',
    'value': collections
  }
  
  return transformResultToAtom(collectionsResult, cfg.serviceUrl)
}
