var assert = require("assert");
var should = require("should");
var model = require("./model.js")
var metadata = require("../lib/metadata.js");
xml2js = require('xml2js');


describe("metadata", function () {

    it("xml should be parseable", function (done) {
        var xml = metadata({ model: model});

        xml2js.Parser().parseString(xml, function(err, data) {
            if (err) done(err);

            data["edmx:Edmx"].should.be.ok;
            data["edmx:Edmx"].$.Version.should.be.eql("4.0");

            data["edmx:Edmx"]["edmx:DataServices"].should.be.ok;
            data["edmx:Edmx"]["edmx:DataServices"][0].Schema.should.be.ok;
            data["edmx:Edmx"]["edmx:DataServices"][0].Schema[0].should.be.ok;

            var schema = data["edmx:Edmx"]["edmx:DataServices"][0].Schema[0];
            schema.$.Namespace.should.be.eql("jsreport");


            var entityType = schema.EntityType[0];
            entityType.should.be.ok;
            entityType.$.Name.should.be.eql("UserType");
            entityType.Key[0].PropertyRef[0].$.Name.should.be.eql("_id");
            entityType.Property[0].$.Name.should.be.eql("_id");
            entityType.Property[0].$.Type.should.be.eql("Edm.String");
            entityType.Property[1].$.Name.should.be.eql("test");
            entityType.Property[1].$.Type.should.be.eql("Edm.String");
            entityType.Property[2].$.Name.should.be.eql("num");
            entityType.Property[2].$.Type.should.be.eql("Edm.Int32");
            entityType.Property[3].$.Name.should.be.eql("addresses");
            entityType.Property[3].$.Type.should.be.eql("Collection(jsreport.AddressType)");


            var complexType = schema.ComplexType[0];
            complexType.should.be.ok;
            complexType.$.Name.should.be.eql("AddressType");
            complexType.Property[0].$.Name.should.be.eql("street");
            complexType.Property[0].$.Type.should.be.eql("Edm.String");

            var entityContainer = schema.EntityContainer[0];
            entityContainer.should.be.ok;
            entityContainer.EntitySet[0].$.Name.should.be.eql("users");
            entityContainer.EntitySet[0].$.EntityType.should.be.eql("jsreport.UserType");


            done();

        });
    });

});