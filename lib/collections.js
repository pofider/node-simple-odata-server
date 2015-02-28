/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Orchestrate the OData / request
 */

module.exports = function (cfg) {

    var collections = [];
    for (var key in cfg.model.entitySets) {
        collections.push({
            "kind": "EntitySet",
            "name": key,
            "url": key
        })
    }

    return JSON.stringify({
        "@odata.context": "http://localhost:1337/$metadata",
        "value": collections
    });
};