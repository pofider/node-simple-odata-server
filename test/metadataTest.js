/* eslint-env mocha */
require('should')
const model = require('./model.js')
const metadata = require('../lib/metadata.js')
const xml2js = require('xml2js')

describe('metadata', function () {
  it('xml should be parseable', function (done) {
    const xml = metadata({ model })

    xml2js.Parser().parseString(xml, function (err, data) {
      if (err) done(err)

      data['edmx:Edmx'].should.be.ok()
      data['edmx:Edmx'].$.Version.should.be.eql('4.0')

      data['edmx:Edmx']['edmx:DataServices'].should.be.ok()
      data['edmx:Edmx']['edmx:DataServices'][0].Schema.should.be.ok()
      data['edmx:Edmx']['edmx:DataServices'][0].Schema[0].should.be.ok()

      const schema = data['edmx:Edmx']['edmx:DataServices'][0].Schema[0]
      schema.$.Namespace.should.be.eql('jsreport')

      const entityType = schema.EntityType[0]
      entityType.should.be.ok()
      entityType.$.Name.should.be.eql('UserType')
      entityType.Key[0].PropertyRef[0].$.Name.should.be.eql('_id')
      entityType.Property[0].$.Name.should.be.eql('_id')
      entityType.Property[0].$.Type.should.be.eql('Edm.String')
      entityType.Property[0].$.Nullable.should.be.eql('false')
      entityType.Property[1].$.Name.should.be.eql('test')
      entityType.Property[1].$.Type.should.be.eql('Edm.String')
      entityType.Property[2].$.Name.should.be.eql('num')
      entityType.Property[2].$.Type.should.be.eql('Edm.Int32')
      entityType.Property[3].$.Name.should.be.eql('addresses')
      entityType.Property[3].$.Type.should.be.eql('Collection(jsreport.AddressType)')

      const complexType = schema.ComplexType[0]
      complexType.should.be.ok()
      complexType.$.Name.should.be.eql('AddressType')
      complexType.Property[0].$.Name.should.be.eql('street')
      complexType.Property[0].$.Type.should.be.eql('Edm.String')

      const entityContainer = schema.EntityContainer[0]
      entityContainer.should.be.ok()
      entityContainer.EntitySet[0].$.Name.should.be.eql('users')
      entityContainer.EntitySet[0].$.EntityType.should.be.eql('jsreport.UserType')

      done()
    })
  })
})
