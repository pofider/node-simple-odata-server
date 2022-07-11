/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Simple regex based http router
 */

const url = require('url')
const { pathToRegexp } = require('path-to-regexp')
const methods = require('methods')

function Router (prefix) {
  this.routes = {}
  this.prefix = prefix === '/' ? '' : prefix
  const self = this
  methods.forEach(function (m) {
    self.routes[m] = []
  })
}

const router = Router.prototype

module.exports = Router

methods.forEach(function (m) {
  router[m] = function (route, fn) {
    this.routes[m].push({
      route: this.prefix + route,
      fn
    })
  }
})

router.error = function (fn) {
  this._errFn = fn
}

router.dispatch = function (req, res) {
  const self = this
  const m = req.method.toLowerCase()
  res.odataError = function (err) {
    self._errFn(req, res, err)
  }

  const pathname = url.parse(req.originalUrl || req.url).pathname // eslint-disable-line

  let match = false

  for (const i in this.routes[m]) {
    const el = this.routes[m][i]
    const keys = []
    const re = pathToRegexp(el.route, keys)
    const ex = re.exec(pathname)

    if (ex) {
      match = true
      const args = ex.slice(1).map(decode)
      req.params = {}
      for (let j = 0; j < keys.length; j++) {
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
    const error = new Error('Not Found')
    error.code = 404
    res.odataError(error)
  }
}

function decode (val) {
  if (val) return decodeURIComponent(val)
}
