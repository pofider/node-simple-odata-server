var assert = require("assert");
var should = require("should");
var request = require("supertest");
var http = require("http");
var ODataServer = require("../index.js");
var model = require("./model.js");

describe("odata server", function () {
    var odataServer;
    var server;

    beforeEach(function () {
        odataServer = ODataServer("http://localhost:1234");
        odataServer.model(model);
        server = http.createServer(function (req, res) {
            odataServer.handle(req, res);
        });
    });

    it("should get collection", function (done) {
        odataServer.query(function (query, cb) {
            cb(null, [ { a: "a"}]);
        });

        request(server)
            .get("/users")
            .expect("Content-Type", /application\/json/)
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value.length.should.be.eql(1);
                res.body.value[0].a.should.be.eql("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("get with error should be propagated to response", function (done) {
        odataServer.query(function (query, cb) {
            cb(new Error("test"));
        });

        request(server)
            .get("/users")
            .expect(500)
            .end(function(err, res) {
                done(err);
            });
    });

    it("should insert document", function (done) {
        odataServer.insert(function (query, cb) {
            cb(null, { test: "foo", _id: "aa" });
        });

        request(server)
            .post("/users")
            .expect("Content-Type", /application\/json/)
            .send({ test: "foo" })
            .expect(201)
            .expect(function(res) {
                res.body.should.be.ok;
                res.body._id.should.be.ok;
                res.body.test.should.be.eql("foo");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("insert with error should be propagated to the response", function (done) {
        odataServer.insert(function (query, cb) {
            cb(new Error("test"));
        });

        request(server)
            .post("/users")
            .send({ test: "foo" })
            .expect(500)
            .end(function(err, res) {
                done(err);
            });
    });

    it("should update document", function (done) {
        odataServer.update(function (query, update, cb) {
            query._id.should.be.eql("1");
            update.$set.test.should.be.eql("foo");
            cb(null, { test: "foo" });
        });

        request(server)
            .patch("/users('1')")
            .send({ test: "foo" })
            .expect(204)
            .end(function(err, res) {
                done(err);
            });
    });

    it("update error should be propagated to response", function (done) {
        odataServer.update(function (query, update, cb) {
            cb(new Error("test"));
        });

        request(server)
            .patch("/users('1')")
            .send({ test: "foo" })
            .expect(500)
            .end(function(err, res) {
                done(err);
            });
    });

    it("$metadata should response xml", function (done) {
        request(server)
            .get("/$metadata")
            .expect("Content-Type", /application\/xml/)
            .expect(200)
            .end(function(err, res) {
                done(err);
            });
    });

    it("/ should response collections json", function (done) {
        request(server)
            .get("/")
            .expect("Content-Type", /application\/json/)
            .expect(200)
            .expect(function(res) {
                res.body.value.length.should.be.eql(1);
                res.body.value[0].name.should.be.eql("users");
                res.body.value[0].name.should.be.eql("users");
                res.body.value[0].kind.should.be.eql("EntitySet");
            })
            .end(function(err, res) {
                done(err);
            });
    });
});