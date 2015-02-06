var http = require('http');
var Datastore = require('nedb');
var db = new Datastore();
var fs = require("fs");

var model = {
    namespace: "jsreport",
    entityTypes: {
        "UserType": {
            "_id": {"type": "Edm.String", key: true},
            "test": {"type": "Edm.String"},
            "num": {"type": "Edm.Int32"},
            "addresses": { "type": "Collection(jsreport.AddressType)"}
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


var odataServer = require("./index.js")("http://localhost:1337/odata");
odataServer.model(model);
odataServer.query(function (query, cb) {
    var q = query.$count ? db.count(query.$filter) : db.find(query.$filter);

    //if (query.sort) {
    //    q = q.sort(query.sort);
    //}
    if (query.$skip) {
        q = q.skip(query.$skip);
    }
    if (query.$limit) {
        q = q.limit(query.$limit);
    }

    q.exec(cb);
});

odataServer.insert(function (data, cb) {
    db.insert(data, cb);
});

odataServer.update(function (query, update, cb) {
    db.update(query, update, cb);
});

http.createServer(function (req, res) {
    console.log(req.method + ":" + req.url);

    if (req.url === "/") {
        res.writeHead(200, {'Content-Type': 'text/html', 'DataServiceVersion': '4.0', 'OData-Version': '4.0'});
        return res.end(fs.readFileSync("index.html"));
    } else {
        odataServer.handle(req, res);
    }
}).listen(1337);

db.insert({"_id": "1", "test": "a", num: 1, addresses: [{ "street":"a1"}]});
db.insert({"_id": "2", "test": "b", num: 2, addresses: [{ "street":"a2"}] });
db.insert({"_id": "3", "test": "c", num: 3});
db.insert({"_id": "4", "test": "d", num: 4});
db.insert({"_id": "5", "test": "e", num: 5});
