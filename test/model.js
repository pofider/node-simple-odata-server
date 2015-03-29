module.exports = {
    namespace: "jsreport",
    entityTypes: {
        "UserType": {
            "_id": {"type": "Edm.String", key: true},
            "test": {"type": "Edm.String"},
            "num": {"type": "Edm.Int32"},
            "addresses": { "type": "Collection(jsreport.AddressType)"},
            "image": { "type": "Edm.Binary"}
        }
    },
    complexTypes: {
        "AddressType": {
            "street": {"type": "Edm.String"}
        }
    },
    entitySets: {
        "users": {
            entityType: "jsreport.UserType"
        }
    }
}