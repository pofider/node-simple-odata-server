/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData /$metadata request
 */

/* eslint no-redeclare:0 */

var builder = require('xmlbuilder')

module.exports = function (cfg) {
  return buildMetadata(cfg.model)
}

function buildMetadata (model) {
  var entityTypes = []
  for (var typeKey in model.entityTypes) {
    var entityType = {
      '@Name': typeKey,
      'Property': []
    }

    for (var propKey in model.entityTypes[typeKey]) {
      var property = model.entityTypes[typeKey][propKey]

      entityType.Property.push({'@Name': propKey, '@Type': property.type})

      if (property.key) {
        entityType.Key = {
          PropertyRef: {
            '@Name': propKey
          }
        }
      }
    }

    entityTypes.push(entityType)
  }

  var complexTypes = []
  for (var typeKey in model.complexTypes) {
    var complexType = {
      '@Name': typeKey,
      'Property': []
    }

    for (var propKey in model.complexTypes[typeKey]) {
      var property = model.complexTypes[typeKey][propKey]

      complexType.Property.push({'@Name': propKey, '@Type': property.type})
    }

    complexTypes.push(complexType)
  }

  var container = {
    '@Name': 'Context',
    'EntitySet': []
  }

  for (var setKey in model.entitySets) {
    container.EntitySet.push({
      '@EntityType': model.entitySets[setKey].entityType,
      '@Name': setKey
    })
  }

  return builder.create({
    'edmx:Edmx': {
      '@xmlns:edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
      '@Version': '4.0',
      'edmx:DataServices': {
        'Schema': {
          '@xmlns': 'http://docs.oasis-open.org/odata/ns/edm',
          '@Namespace': model.namespace,
          'EntityType': entityTypes,
          'ComplexType': complexTypes,
          'EntityContainer': container

        }
      }
    }
  }).end({pretty: true})
}
