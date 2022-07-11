const ODataServer = require('simple-odata-server')
const Adapter = require('simple-odata-server-nedb')
const http = require('http')
const Datastore = require('nedb')
const db = new Datastore({ inMemoryOnly: true })

const model = {
  namespace: 'jsreport',
  entityTypes: {
    UserType: {
      _id: { type: 'Edm.String', key: true },
      test: { type: 'Edm.String' },
      num: { type: 'Edm.Int32' },
      d: { type: 'Edm.DateTimeOffset' },
      addresses: { type: 'Collection(jsreport.AddressType)' }
    }
  },
  complexTypes: {
    AddressType: {
      street: { type: 'Edm.String' }
    }
  },
  entitySets: {
    users: {
      entityType: 'jsreport.UserType'
    }
  }
}

const odataServer = ODataServer('http://localhost:1337')
  .model(model)
  .adapter(Adapter(function (es, cb) { cb(null, db) }))

http.createServer(odataServer.handle.bind(odataServer)).listen(1337)

db.insert({ _id: '1', test: 'a', num: 1, addresses: [{ street: 'a1' }] })
db.insert({ _id: '2', test: 'b', num: 2, addresses: [{ street: 'a2' }] })
db.insert({ _id: '3', test: 'c', num: 3 })
db.insert({ _id: '4', test: 'd', num: 4 })
db.insert({ _id: '5', test: 'e', num: 5 })

console.log('server running on http://localhost:1337')
