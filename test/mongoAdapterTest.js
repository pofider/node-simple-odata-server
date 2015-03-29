var ODataServer = require("../index.js");
var model = require("./model.js");
var should = require("should");
var MongoClient = require('mongodb').MongoClient


describe("mongoAdapter", function () {
    var odataServer;
    var db;

    beforeEach(function (done) {
        MongoClient.connect("mongodb://localhost:27017/test", function(err, database) {
            if (err)
                return done(err);

            db = database;

            odataServer = ODataServer("http://localhost:1234");
            odataServer.model(model);
            odataServer.onMongo(function (cb) {
                cb(null, db);
            });

            db.collection("test").drop(function() {
                done();
            });
        });
    });

    it("insert should add _id", function (done) {
        odataServer.cfg.insert("test", {foo: "Hello"}, function (err, doc) {
            if (err)
                return done(err);

            doc.should.have.property("_id");
            done();
        });
    });

    it("remove should remove", function (done) {
        db.collection("test").insert({foo: "Hello"}, function(err) {
            if (err)
                return done(err);

            odataServer.cfg.remove("test", {}, function (err) {
                if (err)
                    return done(err);

                db.collection("test").count({}, function(err, val) {
                    if (err)
                        return done(err);

                    val.should.be.eql(0);
                    done();
                });
            });
        });
    });

    it("update should update", function (done) {
        db.collection("test").insert({foo: "Hello"}, function(err) {
            if (err)
                return done(err);

            odataServer.cfg.update("test", { foo: "Hello"}, { $set: { foo: "updated"}}, function (err) {
                if (err)
                    return done(err);

                db.collection("test").find({}).toArray(function(err, val) {
                    if (err)
                        return done(err);

                    val.should.have.length(1);
                    val[0].foo.should.be.eql("updated");
                    done();
                });
            });
        });
    });

    it("query should be able to filter in", function (done) {
        db.collection("test").insert({foo: "Hello"}, function(err) {
            if (err)
                return done(err);

            odataServer.cfg.query("test", { $filter : { foo: "Hello"} }, function (err, res) {
                if (err)
                    return done(err);

                res.should.have.length(1);
                done();
            });
        });
    });

    it("query should be able to filter out", function (done) {
        db.collection("test").insert({foo: "Hello"}, function(err) {
            if (err)
                return done(err);

            odataServer.cfg.query("test", { $filter: { foo: "different"} }, function (err, res) {
                if (err)
                    done(err);

                res.should.have.length(0);
                done();
            });
        });
    });

    it("query should do projections", function (done) {
        db.collection("test").insert({foo: "Hello", x: "x"}, function(err) {
            if (err)
                return done(err);

            odataServer.cfg.query("test", { $select : { "foo": 1 } }, function (err, res) {
                if (err)
                    return done(err);

                res[0].should.have.property("foo");
                res[0].should.not.have.property("x");
                done();
            });
        });
    });
});