/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Simple regex based http router
 */

var url = require('url')
var pathToRegexp = require('path-to-regexp')
var methods = require('methods')

function Router (prefix) {
  this.routes = {}
  this.prefix = prefix === '/' ? '' : prefix
  var self = this
  methods.forEach(function (m) {
    self.routes[m] = []
  })
}

var router = Router.prototype

module.exports = Router

methods.forEach(function (m) {
  router[m] = function (route, fn) {
    this.routes[m].push({
      route: this.prefix + route,
      fn: fn
    })
  }
})

router.error = function (fn) {
  this._errFn = fn
}

router.dispatch = function (req, res) {
  var self = this
  var m = req.method.toLowerCase()
  res.odataError = function (err) {
    self._errFn(req, res, err)
  }

  var pathname = url.parse(req.originalUrl || req.url).pathname

  var match = false

  for (var i in this.routes[m]) {
    var el = this.routes[m][i]
    var keys = []
    var re = pathToRegexp(el.route, keys)
    var ex = re.exec(pathname)

    if (ex) {
      match = true
      var args = ex.slice(1).map(decode)
      req.params = {}
      for (var j = 0; j < keys.length; j++) {
        req.params[keys[j].name] = args[j]
      }

      try {
        el.fn(req, res)
      } catch (e) {
        self._errFn(req, res, e)
      }

      break
    }
  }

  if (!match) {
    var error = new Error('Not Found')
    error.code = 404
    res.odataError(error)
  }
}

function decode (val) {
  if (val) return decodeURIComponent(val)
}
