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

    it("get collection", function (done) {
        odataServer.query(function (col, query, cb) {
            cb(null, [ { test: "a"}]);
        });

        odataServer.on("odata-error", done);

        request(server)
            .get("/users")
            .expect("Content-Type", /application\/json/)
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value.length.should.be.eql(1);
                res.body.value[0].test.should.be.eql("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("get should ignore invalid query string", function (done) {
        odataServer.query(function (col, query, cb) {
            cb(null, [ { test: "a"}]);
        });

        odataServer.on("odata-error", done);

        request(server)
            .get("/users?foo=a")
            .expect("Content-Type", /application\/json/)
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value.length.should.be.eql(1);
                res.body.value[0].test.should.be.eql("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("get should prune properties", function (done) {
        odataServer.query(function (col, query, cb) {
            cb(null, [{ test: "a", "a": "b"}]);
        });

        odataServer.on("odata-error", done);

        request(server)
            .get("/users")
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value[0].should.have.property("test");
                res.body.value[0].should.not.have.property("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("post should prune properties", function (done) {
        odataServer.insert(function (collection, doc, cb) {
            cb(null, { test: "foo", _id: "aa", a: "a" });
        });

        request(server)
            .post("/users")
            .expect("Content-Type", /application\/json/)
            .send({ test: "foo" })
            .expect(201)
            .expect(function(res) {
                res.body.should.be.ok;
                res.body._id.should.be.ok;
                res.body.should.not.have.property("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("get should prune properties also with by id query", function (done) {
        odataServer.query(function (col, query, cb) {
            cb(null, [{ test: "a", "a": "b", _id: "foo"}]);
        });

        odataServer.on("odata-error", done);

        request(server)
            .get("/users('foo')")
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value[0].should.have.property("test");
                res.body.value[0].should.not.have.property("a");
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("get should prune properties also with count enabled", function (done) {
        odataServer.query(function (col, query, cb) {
            cb(null, {
                count: 1,
                value: [{ test: "a", "a": "b"}]
            });
        });

        odataServer.on("odata-error", done);

        request(server)
            .get("/users?$count=true")
            .expect(200)
            .expect(function(res) {
                res.body.value.should.be.ok;
                res.body.value[0].should.have.property("test");
                res.body.value[0].should.not.have.property("a");
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

    it("post document", function (done) {
        odataServer.insert(function (collection, doc, cb) {
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

    it("post with base64 should store buffer and return base64", function (done) {
        odataServer.insert(function (collection, doc, cb) {
            doc.image.should.be.instanceOf(Buffer);
            doc._id = "xx";
            cb(null, doc);
        });

        request(server)
            .post("/users")
            .expect("Content-Type", /application\/json/)
            .send({ image: "aaaa" })
            .expect(201)
            .expect(function(res) {
                res.body.should.be.ok;
                res.body.image.should.be.instanceOf(String);
            })
            .end(function(err, res) {
                done(err);
            });
    });

    it("patch with base64 should store buffer", function (done) {
        odataServer.update(function (collection, query, update, cb) {
            update.$set.image.should.be.instanceOf(Buffer);
            cb(null);
        });

        request(server)
            .patch("/users('1')")
            .send({ image: "aaaa" })
            .expect(204)
            .end(function(err, res) {
                done(err);
            });
    });

    it("post with error should be propagated to the response", function (done) {
        odataServer.insert(function (collection, doc, cb) {
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

    it("patch document", function (done) {
        odataServer.update(function (collection, query, update, cb) {
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

    it("patch error should be propagated to response", function (done) {
        odataServer.update(function (query, update, cb) {
            cb(new Error("test"));
        });

        request(server)
            .patch("/users(1)")
            .send({ test: "foo" })
            .expect(500)
            .end(function(err, res) {
                done(err);
            });
    });

    it("delete document", function (done) {
        odataServer.remove(function (collection, query, cb) {
            cb(null);
        });

        request(server)
            .delete("/users('1')")
            .expect(204)
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