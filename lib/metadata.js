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
    '@Name': 'TradeDepotEntities',
    '@m:IsDefaultEntityContainer': 'true',
    '@p6:LazyLoadingEnabled': 'true',
    '@xmlns:p6': 'http://schemas.microsoft.com/ado/2009/02/edm/annotation',
    'EntitySet': []
  }

  for (var setKey in model.entitySets) {
    container.EntitySet.push({
      '@EntityType': model.entitySets[setKey].entityType,
      '@Name': setKey
    })
  }

  // Adding ComplexTypes to the first Schema node is not accepted by power bi odata client

  return builder.create({
    'edmx:Edmx': {
      '@xmlns:edmx': 'http://schemas.microsoft.com/ado/2007/06/edmx',
      '@Version': '1.0',
      'edmx:DataServices': {
        '@xmlns:m': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
        '@m:DataServiceVersion': '1.0',
        '@m:MaxDataServiceVersion': '3.0',
        'Schema': [
          {
          '@xmlns': 'http://schemas.microsoft.com/ado/2008/09/edm',
          '@Namespace': model.namespace,
          'EntityType': entityTypes
          },
          {
          '@xmlns': 'http://schemas.microsoft.com/ado/2008/09/edm',
          '@Namespace': model.namespace,
          'EntityContainer': container
          }]
      }
    }
  }, { encoding: 'UTF-8' }).end({pretty: true})
}
