/* eslint-env mocha */
var Datastore = require('nedb')
var ODataServer = require('../index.js')
var model = require('./model.js')
require('should')
var http = require('http')
var request = require('supertest')
var Buffer = require('safe-buffer').Buffer

describe('neDBAdapter', function () {
  var odataServer
  var db
  beforeEach(function () {
    db = new Datastore({inMemoryOnly: true})
    odataServer = ODataServer('http://localhost:1234')
    odataServer.model(model)
    odataServer.onNeDB(function (coll, cb) {
      cb(null, db)
    })
  })

  it('insert should add _id', function (done) {
    odataServer.cfg.insert('users', {foo: 'Hello'}, function (err, doc) {
      if (err) {
        return done(err)
      }

      doc.should.have.property('_id')
      done()
    })
  })

  it('remove should remove', function (done) {
    db.insert({foo: 'Hello'}, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.remove('users', {}, function (err) {
        if (err) {
          return done(err)
        }

        db.count({}, function (err, val) {
          if (err) {
            return done(err)
          }

          val.should.be.eql(0)
          done()
        })
      })
    })
  })

  it('update should update', function (done) {
    db.insert({foo: 'Hello'}, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.update('users', {foo: 'Hello'}, {$set: {foo: 'updated'}}, function (err) {
        if (err) {
          return done(err)
        }

        db.find({}, function (err, val) {
          if (err) {
            return done(err)
          }

          val[0].foo.should.be.eql('updated')
          done()
        })
      })
    })
  })

  it('query should be able to filter in', function (done) {
    db.insert({foo: 'Hello'}, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', {$filter: {foo: 'Hello'}}, function (err, res) {
        if (err) {
          return done(err)
        }

        res.should.have.length(1)
        done()
      })
    })
  })

  it('query should be able to filter out', function (done) {
    db.insert({foo: 'Hello'}, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', { $filter: { foo: 'different' } }, function (err, res) {
        if (err) {
          return done(err)
        }

        res.should.have.length(0)
        done()
      })
    })
  })

  it('query should do projections', function (done) {
    db.insert({foo: 'Hello', x: 'x'}, function (err) {
      if (err) {
        return done(err)
      }

      odataServer.cfg.query('users', { $select: { 'foo': 1, '_id': 1 } }, function (err, res) {
        if (err) {
          return done(err)
        }

        res[0].should.have.property('_id')
        res[0].should.have.property('foo')
        res[0].should.not.have.property('x')
        done()
      })
    })
  })

  it('handle inconsistency on nedb with node 4 where object is returned instead of buffer', function (done) {
    var server = http.createServer(function (req, res) {
      odataServer.handle(req, res)
    })

    db.insert({image: Buffer.from([1, 2, 3])}, function (err, doc) {
      if (err) {
        return done(err)
      }

      request(server)
        .get('/users')
        .expect('Content-Type', /application\/json/)
        .expect(200)
        .expect(function (res) {
          res.body.should.be.ok()
          res.body.value[0].image.should.be.instanceOf(String)
          res.body.value[0].image.should.be.eql(Buffer.from([1, 2, 3]).toString('base64'))
        })
        .end(function (err, res) {
          done(err)
        })
    })
  })
})
