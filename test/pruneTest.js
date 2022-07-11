/* eslint-env mocha */
require('should')
const prune = require('../lib/prune.js')

describe('prune', function () {
  let model

  beforeEach(function () {
    model = {
      namespace: 'jsreport',
      entityTypes: {
        UserType: {
          _id: {
            type: 'Edm.String',
            key: true
          },
          test: {
            type: 'Edm.String'
          },
          addresses: {
            type: 'Collection(jsreport.AddressType)'
          },
          address: {
            type: 'jsreport.AddressType'
          },
          nested: {
            type: 'jsreport.NestedType'
          }
        }
      },
      complexTypes: {
        AddressType: {
          street: {
            type: 'Edm.String'
          }
        },
        NestedInnerType: {
          name: {
            type: 'Edm.String'
          }
        },
        NestedType: {
          items: {
            type: 'jsreport.NestedInnerType'
          }
        }
      },
      entitySets: {
        users: {
          entityType: 'jsreport.UserType'
        }
      }
    }
  })

  it('should remove properties not specified in entity type', function () {
    const doc = {
      test: 'x',
      a: 'a'
    }
    prune(model, 'users', doc)
    doc.should.not.have.property('a')
    doc.should.have.property('test')
  })

  it('should accept arrays on input', function () {
    const doc = {
      test: 'x',
      a: 'a'
    }
    prune(model, 'users', [doc])
    doc.should.not.have.property('a')
    doc.should.have.property('test')
  })

  it('should prune also in nested complex types', function () {
    const doc = {
      address: {
        street: 'street',
        a: 'a'
      }
    }
    prune(model, 'users', doc)

    doc.should.have.property('address')
    doc.address.should.have.property('street')
    doc.address.should.not.have.property('a')
  })

  it('should not remove nested complex type when pruning', function () {
    const doc = {
      nested: {
        items: [{
          name: 'foo'
        }]
      }
    }
    prune(model, 'users', doc)

    doc.should.have.property('nested')
    doc.nested.should.have.property('items')
    doc.nested.items.should.have.length(1)
    doc.nested.items[0].should.have.property('name')
    doc.nested.items[0].name.should.be.eql('foo')
  })
  it('should not prune prefixes with @odata', function () {
    const doc = {
      '@odata.type': 'someEntityType',
      '@odata.id': 'someOdataEndpoint/setName/(key)',
      '@odata.editLink': "setName('key')",
      test: 'x'
    }
    prune(model, 'users', doc)
    doc.should.have.property('@odata.type')
    doc.should.have.property('@odata.id')
    doc.should.have.property('@odata.editLink')
    doc.should.have.property('test')
  })
})
