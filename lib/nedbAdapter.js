/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Configure ODataServer to run on nedb
 */

function update(collection, query, update, cb) {
    this.getDB(collection, function(err, db) {
        if (err)
            return cb(err);

        db.update(query, update, cb);
    });
}

function remove(collection, query, cb) {
    this.getDB(collection, function(err, db) {
        if (err)
            return cb(err);

        db.remove(query, cb);
    });
}

function insert(collection, doc, cb) {
    this.getDB(collection, function(err, db) {
        if (err)
            return cb(err);

        db.insert(doc, cb);
    });
}

function query(collection, query, cb) {
    this.getDB(collection, function(err, db) {
        if (err)
            return cb(err);

        var qr = query.$count ? db.count(query.$filter) : db.find(query.$filter);

        if (query.$sort) {
            qr = qr.sort(query.$sort);
        }
        if (query.$skip) {
            qr = qr.skip(query.$skip);
        }
        if (query.$limit) {
            qr = qr.limit(query.$limit);
        }

        qr.exec(function(err, val) {
            if (err)
              return cb(err);

            if (!query.$inlinecount)
                return cb(null, val);

            db.count(query.$filter, function(err, c) {
                if (err)
                    return cb(err);

                cb(null, {
                    count: c,
                    value: val
                });
            });
        });
    });
}

function afterRead(collection, res) {
    var model = this.model;
    var entitySet = model.entitySets[collection];
    var entityType = model.entityTypes[entitySet.type];

    for (var i in res) {
        for (var prop in res[i]) {
            if (!prop)
                continue;

            var propDef = entityType[prop];

            if (!propDef)
                continue;

            if (propDef.type === "Edm.Binary") {
                res[i][prop] = new Buffer(res[i][prop]).toString("base64");
            }
        }
    }
}

module.exports = function(odataServer, getDB) {
    odataServer.getDB = getDB;
    odataServer.update(update)
        .remove(remove)
        .query(query)
        .insert(insert)
        .afterRead(afterRead);
};
