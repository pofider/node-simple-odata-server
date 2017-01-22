/* eslint no-redeclare:0 */
function prune (doc, model, type) {
  if (doc instanceof Array) {
    for (var i in doc) {
      prune(doc[i], model, type)
    }
    return
  }

  for (var prop in doc) {
    if (!prop || doc[prop] === undefined || prop.toString().substring(0, 6) === '@odata') {
      continue
    }

    var propDef = type[prop]

    if (!propDef) {
      delete doc[prop]
      continue
    }

    if (propDef.type.indexOf('Collection') === 0) {
      if (propDef.type.indexOf('Collection(Edm') === 0) {
        continue
      }
      var complexTypeName = propDef.type.replace('Collection(' + model.namespace + '.', '')
      complexTypeName = complexTypeName.substring(0, complexTypeName.length - 1)
      var complexType = model.complexTypes[complexTypeName]
      if (!complexType) {
        throw new Error('Complex type ' + complexTypeName + ' was not found.')
      }

      for (var i in doc[prop]) {
        prune(doc[prop][i], model, complexType)
      }
      continue
    }

    if (propDef.type.indexOf('Edm') !== 0) {
      var complexTypeName = propDef.type.replace(model.namespace + '.', '')
      var complexType = model.complexTypes[complexTypeName]
      if (!complexType) {
        throw new Error('Complex type ' + complexTypeName + ' was not found.')
      }
      prune(doc[prop], model, complexType)
    }
  }
}

module.exports = function (model, collection, docs) {
  var entitySet = model.entitySets[collection]
  var entityType = model.entityTypes[entitySet.entityType.replace(model.namespace + '.', '')]

  prune(docs, model, entityType)
}
