/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData /$metadata request
 */

var builder = require('xmlbuilder');

module.exports = function(cfg) {
    return buildMetadata(cfg.model);
}

function buildMetadata(model) {
    var schemas = [];

    for (var typeKey in model.entityTypes) {
        var entityType = {
            "EntityType": {
                "@Name": typeKey,
                "#list": []
            }
        };

        for (var propKey in model.entityTypes[typeKey]) {
            var property = model.entityTypes[typeKey][propKey];

            entityType.EntityType["#list"].push({
                "Property": {"@Name": propKey, "@Type": property.type}
            });

            if (property.key) {
                entityType.EntityType.Key = {
                    PropertyRef: {
                        "@Name": propKey
                    }
                }
            }
        }

        schemas.push(entityType);
    }

    for (var typeKey in model.complexTypes) {
        var complexType = {
            "ComplexType": {
                "@Name": typeKey,
                "#list": []
            }
        };

        for (var propKey in model.complexTypes[typeKey]) {
            var property = model.complexTypes[typeKey][propKey];

            complexType.ComplexType["#list"].push({
                "Property": {"@Name": propKey, "@Type": property.type}
            });
        }

        schemas.push(complexType);
    }

    var container = {
        "EntityContainer": {
            "@Name": "Context",
            "#list": []
        }
    };

    for (var setKey in model.entitySets) {
        container.EntityContainer["#list"].push({
            "EntitySet": {
                "@EntityType": model.entitySets[setKey].entityType,
                "@Name": setKey
            }
        });
    }

    schemas.push(container);

    return builder.create({
        "edmx:Edmx": {
            "@xmlns:edmx": "http://docs.oasis-open.org/odata/ns/edmx",
            "@Version": "4.0",
            "edmx:DataServices": {
                "Schema": {
                    "@xmlns": "http://docs.oasis-open.org/odata/ns/edm",
                    "@Namespace": model.namespace,
                    "#list": schemas
                }
            }
        }
    }).end({pretty: true});
}
