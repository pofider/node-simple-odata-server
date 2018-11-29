/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Parse query string OData params and transform into mongo/nedb type of query
 */

module.exports = function (query) {
  if (query.$filter) {
    query.$filter = new Node(query.$filter.type, query.$filter.left, query.$filter.right, query.$filter.func, query.$filter.args).transform()
  } else {
    query.$filter = {}
  }

  if (query.$top) {
    query.$limit = query.$top
  }

  if (query.$orderby) {
    query.$sort = {}
    query.$orderby.forEach(function (prop) {
      var propName = Object.keys(prop)[0]
      query.$sort[propName] = prop[propName] === 'desc' ? -1 : 1
    })
  }

  if (query.$inlinecount === 'allpages') {
    query.$count = true
  }

  var select = {}
  for (var key in query.$select || []) {
    select[query.$select[key]] = 1
  }
  query.$select = select

  return query
}

function Node (type, left, right, func, args) {
  this.type = type
  this.left = left
  this.right = right
  this.func = func
  this.args = args
}

Node.prototype.transform = function () {
  var result = {}

  if (this.type === 'eq' && this.right.type === 'literal') {
    result[this.left.name] = this.right.value
  }

  if (this.type === 'ne' && this.right.type === 'literal') {
    result[this.left.name] = { '$ne': this.right.value }
  }

  if (this.type === 'lt' && this.right.type === 'literal') {
    result[this.left.name] = { '$lt': this.right.value }
  }

  if (this.type === 'gt' && this.right.type === 'literal') {
    result[this.left.name] = { '$gt': this.right.value }
  }

  if (this.type === 'and') {
    result['$and'] = result['$and'] || []
    if (this.left.type !== 'functioncall') {
      result['$and'].push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform())
    } else {
      result['$and'].push(new Node(this.left.type, this.left.left, this.left.right, this.left.func, this.left.args).transform())
    }

    if (this.right.type !== 'functioncall') {
      result['$and'].push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform())
    } else {
      result['$and'].push(new Node(this.right.type, this.right.left, this.right.right, this.right.func, this.right.args).transform())
    }
  }

  if (this.type === 'or') {
    result['$or'] = result['$or'] || []
    if (this.left.type !== 'functioncall') {
      result['$or'].push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform())
    } else {
      result['$or'].push(new Node(this.left.type, this.left.left, this.left.right, this.left.func, this.left.args).transform())
    }

    if (this.right.type !== 'functioncall') {
      result['$or'].push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform())
    } else {
      result['$or'].push(new Node(this.right.type, this.right.left, this.right.right, this.right.func, this.right.args).transform())
    }
  }

  if (this.type === 'functioncall') {
    switch (this.func) {
      case 'endswith': 
        endswith(this, result)
        break
      case 'substringof': 
        substringof(this, result)
        break
      case 'startswith': 
        startswith(this, result)
        break
    }
  }

  return result
}

function endswith (node, result) {
  var prop = node.args[0].type === 'property' ? node.args[0] : node.args[1]
  var lit = node.args[0].type === 'literal' ? node.args[0] : node.args[1]

  result[prop.name] = {'$regex': new RegExp(lit.value + '$'), '$options': 'i'} 
}

function substringof (node, result) {
  var prop = node.args[0].type === 'property' ? node.args[0] : node.args[1]
  var lit = node.args[0].type === 'literal' ? node.args[0] : node.args[1]

  result[prop.name] = {'$regex': new RegExp(lit.value), '$options': 'i'} 
}

function startswith (node, result) {
  var prop = node.args[0].type === 'property' ? node.args[0] : node.args[1]
  var lit = node.args[0].type === 'literal' ? node.args[0] : node.args[1]

  result[prop.name] = {'$regex': new RegExp('^' + lit.value), '$options': 'i'} 
}