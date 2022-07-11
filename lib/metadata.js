/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData /$metadata request
 */

/* eslint no-redeclare:0 */

const builder = require('xmlbuilder')

module.exports = function (cfg) {
  return buildMetadata(cfg.model)
}

function buildMetadata (model) {
  const entityTypes = []
  for (const typeKey in model.entityTypes) {
    const entityType = {
      '@Name': typeKey,
      Property: []
    }

    for (const propKey in model.entityTypes[typeKey]) {
      const property = model.entityTypes[typeKey][propKey]
      const finalObject = { '@Name': propKey, '@Type': property.type }
      if (Object.prototype.hasOwnProperty.call(property, 'nullable')) {
        finalObject['@Nullable'] = property.nullable
      }
      entityType.Property.push(finalObject)

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

  const complexTypes = []
  for (const typeKey in model.complexTypes) {
    const complexType = {
      '@Name': typeKey,
      Property: []
    }

    for (const propKey in model.complexTypes[typeKey]) {
      const property = model.complexTypes[typeKey][propKey]

      complexType.Property.push({ '@Name': propKey, '@Type': property.type })
    }

    complexTypes.push(complexType)
  }

  const container = {
    '@Name': 'Context',
    EntitySet: []
  }

  for (const setKey in model.entitySets) {
    container.EntitySet.push({
      '@EntityType': model.entitySets[setKey].entityType,
      '@Name': setKey
    })
  }

  const returnObject = {
    'edmx:Edmx': {
      '@xmlns:edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
      '@Version': '4.0',
      'edmx:DataServices': {
        Schema: {
          '@xmlns': 'http://docs.oasis-open.org/odata/ns/edm',
          '@Namespace': model.namespace,
          EntityType: entityTypes,
          EntityContainer: container
        }
      }
    }
  }

  if (complexTypes.length) {
    returnObject['edmx:Edmx']['edmx:DataServices'].Schema.ComplexType = complexTypes
  }

  return builder.create(returnObject).end({ pretty: true })
}
