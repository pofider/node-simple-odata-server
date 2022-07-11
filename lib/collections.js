/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData / request
 */

module.exports = function (cfg) {
  const collections = []
  for (const key in cfg.model.entitySets) {
    collections.push({
      kind: 'EntitySet',
      name: key,
      url: key
    })
  }

  return JSON.stringify({
    '@odata.context': cfg.serviceUrl + '/$metadata',
    value: collections
  })
}
