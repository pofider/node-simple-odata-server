/* eslint-env mocha */
require('should')
const request = require('supertest')
const http = require('http')
const ODataServer = require('../index.js')
const model = require('./model.js')

describe('odata server', function () {
  let odataServer
  let server

  beforeEach(function () {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model)
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })
  })

  it('get collection', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        test: 'a'
      }])
    })

    odataServer.on('odata-error', done)

    request(server)
      .get('/users')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value.length.should.be.eql(1)
        res.body.value[0].test.should.be.eql('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should ignore invalid query string', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        test: 'a'
      }])
    })

    odataServer.on('odata-error', done)

    request(server)
      .get('/users?foo=a')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value.length.should.be.eql(1)
        res.body.value[0].test.should.be.eql('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should prune properties', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        test: 'a',
        a: 'b'
      }])
    })

    odataServer.on('odata-error', done)

    request(server)
      .get('/users')
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value[0].should.have.property('test')
        res.body.value[0].should.not.have.property('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should always return response with header with odata.metadata=minimal', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        test: 'a',
        a: 'b'
      }])
    })

    odataServer.on('odata-error', done)
    request(server)
      .get('/users')
      .expect(200)
      .expect('Content-Type', /odata.metadata=minimal/)
      .end(function (err, res) {
        done(err)
      })
  })

  it('get $count should return number of entries', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, 1)
    })

    odataServer.on('odata-error', done)

    request(server)
      .get('/users/$count')
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.eql(1)
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get by _id', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        _id: '123',
        test: 'a'
      }])
    })

    request(server)
      .get('/users(\'123\')')
      .expect(200)
      .expect(function (res) {
        res.body.should.not.have.property('0')
        res.body.test.should.be.eql('a')
        Array.isArray(res.body.value).should.be.true()
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should have the selection fields in its @odata.context if $select is passed', function (done) {
    const selectedField1 = 'num'
    const selectedField2 = 'image'
    const expectedResult = {
      context: 'http://localhost:1234/$metadata#users(' + selectedField1 + ',' + selectedField2 + ')'
    }
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        num: 1,
        a: 'b'
      }])
    })
    odataServer.on('odata-error', done)
    request(server)
      .get('/users?$select=' + selectedField1 + ',' + selectedField2)
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value[0].should.have.property('num')
        res.body.value[0].should.not.have.property('a')
        res.body['@odata.context'].should.be.eql(expectedResult.context)
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should have the selection fields along with $entity in @odata.context for filtered query', function (done) {
    const key = 'someKey'
    const result = {
      num: 1
    }
    odataServer.query(function (col, query, req, cb) {
      cb(null, {
        num: 1
      })
    })

    odataServer.on('odata-error', done)
    request(server)
      .get('/users($' + key + ')?$select=num')
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body['@odata.context'].should.be.eql('http://localhost:1234/$metadata#users(num)/$entity')
        res.body.should.have.property('value')
        res.body.value.should.be.eql(result)
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('post should prune properties', function (done) {
    odataServer.insert(function (collection, doc, req, cb) {
      doc.addresses[0].should.not.have.property('@odata.type')
      cb(null, {
        test: 'foo',
        _id: 'aa',
        a: 'a'
      })
    })

    request(server)
      .post('/users')
      .expect('Content-Type', /application\/json/)
      .send({
        test: 'foo',
        addresses: [{
          street: 'street',
          '@odata.type': 'jsreport.AddressType'
        }]
      })
      .expect(201)
      .expect(function (res) {
        res.body.should.be.ok()
        res.body._id.should.be.ok()
        res.body.should.not.have.property('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should prune properties also with by id query', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, [{
        test: 'a',
        a: 'b',
        _id: 'foo'
      }])
    })

    odataServer.on('odata-error', done)

    request(server)
      .get("/users('foo')")
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value[0].should.have.property('test')
        res.body.value[0].should.not.have.property('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get should prune properties also with count enabled', function (done) {
    odataServer.query(function (col, query, req, cb) {
      cb(null, {
        count: 1,
        value: [{
          test: 'a',
          a: 'b'
        }]
      })
    })

    odataServer.on('odata-error', done)

    request(server)
      .get('/users?$count=true')
      .expect(200)
      .expect(function (res) {
        res.body.value.should.be.ok()
        res.body.value[0].should.have.property('test')
        res.body.value[0].should.not.have.property('a')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('get with error should be propagated to response', function (done) {
    odataServer.query(function (query, req, cb) {
      cb(new Error('test'))
    })

    request(server)
      .get('/users')
      .expect(500)
      .end(function (err, res) {
        done(err)
      })
  })

  it('post document', function (done) {
    odataServer.insert(function (collection, doc, req, cb) {
      cb(null, {
        test: 'foo',
        _id: 'aa'
      })
    })

    request(server)
      .post('/users')
      .expect('Content-Type', /application\/json/)
      .send({
        test: 'foo'
      })
      .expect(201)
      .expect(function (res) {
        res.body.should.be.ok()
        res.body._id.should.be.ok()
        res.body.test.should.be.eql('foo')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('post with base64 should store buffer and return base64', function (done) {
    odataServer.insert(function (collection, doc, req, cb) {
      doc.image.should.be.instanceOf(Buffer)
      doc._id = 'xx'
      cb(null, doc)
    })

    request(server)
      .post('/users')
      .expect('Content-Type', /application\/json/)
      .send({
        image: 'aaaa'
      })
      .expect(201)
      .expect(function (res) {
        res.body.should.be.ok()
        res.body.image.should.be.instanceOf(String)
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('patch with base64 should store buffer', function (done) {
    odataServer.update(function (collection, query, update, req, cb) {
      update.$set.image.should.be.instanceOf(Buffer)
      cb(null)
    })

    request(server)
      .patch("/users('1')")
      .send({
        image: 'aaaa'
      })
      .expect(204)
      .end(function (err, res) {
        done(err)
      })
  })

  it('post with error should be propagated to the response', function (done) {
    odataServer.insert(function (collection, doc, req, cb) {
      cb(new Error('test'))
    })

    request(server)
      .post('/users')
      .send({
        test: 'foo'
      })
      .expect(500)
      .end(function (err, res) {
        done(err)
      })
  })

  it('patch document', function (done) {
    odataServer.update(function (collection, query, update, req, cb) {
      query._id.should.be.eql('1')
      update.$set.test.should.be.eql('foo')
      update.$set.addresses[0].should.not.have.property('@odata.type')
      cb(null, {
        test: 'foo'
      })
    })

    request(server)
      .patch("/users('1')")
      .send({
        test: 'foo',
        addresses: [{
          street: 'street',
          '@odata.type': 'jsreport.AddressType'
        }]
      })
      .expect(204)
      .end(function (err, res) {
        done(err)
      })
  })

  it('patch error should be propagated to response', function (done) {
    odataServer.update(function (query, update, req, cb) {
      cb(new Error('test'))
    })

    request(server)
      .patch('/users(1)')
      .send({
        test: 'foo'
      })
      .expect(500)
      .end(function (err, res) {
        done(err)
      })
  })

  it('delete document', function (done) {
    odataServer.remove(function (collection, query, req, cb) {
      cb(null)
    })

    request(server)
      .delete("/users('1')")
      .expect(204)
      .end(function (err, res) {
        done(err)
      })
  })

  it('$metadata should response xml', function (done) {
    request(server)
      .get('/$metadata')
      .expect('Content-Type', /application\/xml/)
      .expect(200)
      .end(function (err, res) {
        done(err)
      })
  })

  it('/ should response collections json', function (done) {
    request(server)
      .get('/')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect(function (res) {
        res.body.value.length.should.be.eql(1)
        res.body.value[0].name.should.be.eql('users')
        res.body.value[0].name.should.be.eql('users')
        res.body.value[0].kind.should.be.eql('EntitySet')
      })
      .end(function (err, res) {
        done(err)
      })
  })

  it('executeQuery should fire beforeQuery listener', function (done) {
    odataServer.beforeQuery(function (col, query, req, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      req.isReq.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeQuery('users', {
      isQuery: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeQuery should fire beforeQuery listener when no request param is accepted', function (done) {
    odataServer.beforeQuery(function (col, query, req, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeQuery('users', {
      isQuery: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeInsert should fire beforeInsert listener', function (done) {
    odataServer.beforeInsert(function (col, doc, req, cb) {
      col.should.be.eql('users')
      doc.isDoc.should.be.ok()
      req.isReq.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeInsert('users', {
      isDoc: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeInsert should fire beforeInsert listener when no request param is accepted', function (done) {
    odataServer.beforeInsert(function (col, doc, cb) {
      col.should.be.eql('users')
      doc.isDoc.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeInsert('users', {
      isDoc: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeRemove should fire beforeRemove listener', function (done) {
    odataServer.beforeRemove(function (col, query, req, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      req.isReq.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeRemove('users', {
      isQuery: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeRemove should fire beforeRemove listener when no request param is accepted', function (done) {
    odataServer.beforeRemove(function (col, query, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeRemove('users', {
      isQuery: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeUpdate should fire beforeUpdate listener', function (done) {
    odataServer.beforeUpdate(function (col, query, update, req, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      update.isUpdate.should.be.ok()
      req.isReq.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeUpdate('users', {
      isQuery: true
    }, {
      isUpdate: true
    }, {
      isReq: true
    }, function () {})
  })

  it('executeUpdate should fire beforeUpdate listener when no request param is accepted', function (done) {
    odataServer.beforeUpdate(function (col, query, update, cb) {
      col.should.be.eql('users')
      query.isQuery.should.be.ok()
      update.isUpdate.should.be.ok()
      cb.should.be.a.Function()
      done()
    })

    odataServer.executeUpdate('users', {
      isQuery: true
    }, {
      isUpdate: true
    }, {
      isReq: true
    }, function () {})
  })
})

describe('odata server with cors', function () {
  let odataServer
  let server

  it('options on * should response 200 with Access-Control-Allow-Origin', function (done) {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).cors('test.com')
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })

    request(server)
      .options('/$metadata')
      .expect('Access-Control-Allow-Origin', /test.com/)
      .expect(200)
      .end(function (err, res) {
        done(err)
      })
  })

  it('get on * should response 200 with Access-Control-Allow-Origin', function (done) {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).cors('test.com')
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })
    odataServer.query(function (collection, query, req, cb) {
      cb(null)
    })

    request(server)
      .get('/users')
      .expect('Access-Control-Allow-Origin', /test.com/)
      .expect(200)
      .end(function (err, res) {
        done(err)
      })
  })

  it('post on * should response 200 with Access-Control-Allow-Origin', function (done) {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).cors('test.com')
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })
    odataServer.query(function (collection, query, req, cb) {
      cb(null)
    })

    odataServer.insert(function (collection, doc, req, cb) {
      cb(null, {
        test: 'foo',
        _id: 'aa',
        a: 'a'
      })
    })

    request(server)
      .post('/users')
      .expect('Access-Control-Allow-Origin', /test.com/)
      .send({
        test: 'foo'
      })
      .expect(201)
      .end(function (err, res) {
        done(err)
      })
  })

  it('delete on * should response 200 with Access-Control-Allow-Origin', function (done) {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).cors('test.com')
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })
    odataServer.remove(function (collection, query, req, cb) {
      cb(null)
    })

    request(server)
      .delete("/users('1')")
      .expect('Access-Control-Allow-Origin', /test.com/)
      .expect(204)
      .end(function (err, res) {
        done(err)
      })
  })

  it('patch on * should response 200 with Access-Control-Allow-Origin', function (done) {
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model).cors('test.com')
    server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })

    odataServer.update(function (collection, query, update, req, cb) {
      query._id.should.be.eql('1')
      update.$set.test.should.be.eql('foo')
      cb(null, {
        test: 'foo'
      })
    })

    request(server)
      .patch("/users('1')")
      .send({
        test: 'foo'
      })
      .expect('Access-Control-Allow-Origin', /test.com/)
      .expect(204)
      .end(function (err, res) {
        done(err)
      })
  })
})
