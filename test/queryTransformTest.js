var assert = require("assert");
var should = require("should");
var transform = require("../lib/queryTransform.js");


describe("transform", function () {

    it("$top to $limit", function () {
        transform({
            $top: 5
        }).$limit.should.be.eql(5);
    });

    it("$orderby to $sort asc", function () {
        transform({
            $orderby: [{"test": "asc"}]
        }).$sort.test.should.be.eql(1);
    });

    it("$orderby to $sort desc", function () {
        transform({
            $orderby: [{"test": "desc"}]
        }).$sort.test.should.be.eql(-1);
    });

    it("Name eq 'John' and LastName lt 'Doe", function () {
        var result = transform({
            $filter: {
                type: 'and',
                left: {
                    type: 'eq',
                    left: {
                        type: 'property',
                        name: 'Name'
                    },
                    right: {
                        type: 'literal',
                        value: 'John'
                    }
                },
                right: {
                    type: 'lt',
                    left: {
                        type: 'property',
                        name: 'LastName'
                    },
                    right: {
                        type: 'literal',
                        value: 'Doe'
                    }
                }
            }
        });

        result.$filter.$and.should.be.ok;
        result.$filter.$and.length.should.be.eql(2);
        result.$filter.$and[0].Name.should.be.eql("John");
        result.$filter.$and[1].LastName.$lt.should.be.eql("Doe");
    });

    it("Name eq 'John' or LastName gt 'Doe", function () {
        var result = transform({
            $filter: {
                type: 'or',
                left: {
                    type: 'eq',
                    left: {
                        type: 'property',
                        name: 'Name'
                    },
                    right: {
                        type: 'literal',
                        value: 'John'
                    }
                },
                right: {
                    type: 'gt',
                    left: {
                        type: 'property',
                        name: 'LastName'
                    },
                    right: {
                        type: 'literal',
                        value: 'Doe'
                    }
                }
            }
        });

        result.$filter.$or.should.be.ok;
        result.$filter.$or.length.should.be.eql(2);
        result.$filter.$or[0].Name.should.be.eql("John");
        result.$filter.$or[1].LastName.$gt.should.be.eql("Doe");
    });

    it("$filter substringof  to regex", function () {
        transform({
            $filter: {
                type: "functioncall",
                func: "substringof",
                args: [{ "type": "literal", "value": "foo"}, {"type": "property", "name": "data"}]
            }
        }).$filter.data.should.be.eql(/foo/);
    });

    it("$select should create mongo style projection", function () {
        var query = transform({
            $select: ["foo", "x", "_id"]
        });
        query.$select.should.have.property("_id");
        query.$select.should.have.property("x");
    });
});