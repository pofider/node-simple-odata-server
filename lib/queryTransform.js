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
      const propName = Object.keys(prop)[0]
      query.$sort[propName] = prop[propName] === 'desc' ? -1 : 1
    })
  }

  if (query.$inlinecount === 'allpages') {
    query.$count = true
  }

  const select = {}
  for (const key in query.$select || []) {
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

Node.prototype._prop = function (result, left, rightValue) {
  if (left.type === 'property' && left.name.indexOf('/') !== -1) {
    const fragments = left.name.split('/')
    const obj = result[fragments[0]] || {}

    for (let i = 1; i < fragments.length; i++) {
      if (i === (fragments.length - 1)) {
        obj[fragments[i]] = rightValue
      } else {
        obj[fragments[i]] = obj[fragments[i]] || {}
      }
    }

    result[fragments[0]] = obj
  } else {
    result[left.name] = rightValue
  }
}

Node.prototype.transform = function () {
  const result = {}

  if (this.type === 'eq' && this.right.type === 'literal') {
    // odata parser returns ['null', ''] for a filter with "field eq null"
    // we handle the case by fixing the query in case this happens
    if (
      Array.isArray(this.right.value) &&
      this.right.value.length === 2 &&
      this.right.value[0] === 'null' &&
      this.right.value[1] === ''
    ) {
      this._prop(result, this.left, null)
    } else {
      this._prop(result, this.left, this.right.value)
    }
  }

  if (this.type === 'lt' && this.right.type === 'literal') {
    this._prop(result, this.left, { $lt: this.right.value })
  }

  if (this.type === 'gt' && this.right.type === 'literal') {
    this._prop(result, this.left, { $gt: this.right.value })
  }

  if (this.type === 'le' && this.right.type === 'literal') {
    this._prop(result, this.left, { $lte: this.right.value })
  }

  if (this.type === 'ge' && this.right.type === 'literal') {
    this._prop(result, this.left, { $gte: this.right.value })
  }

  if (this.type === 'and') {
    result.$and = result.$and || []
    result.$and.push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform())
    result.$and.push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform())
  }

  if (this.type === 'or') {
    result.$or = result.$or || []
    result.$or.push(new Node(this.left.type, this.left.left, this.left.right, this.func, this.args).transform())
    result.$or.push(new Node(this.right.type, this.right.left, this.right.right, this.func, this.args).transform())
  }

  if (this.type === 'functioncall') {
    switch (this.func) {
      case 'substringof': substringof(this, result)
    }
  }

  return result
}

function substringof (node, result) {
  const prop = node.args[0].type === 'property' ? node.args[0] : node.args[1]
  const lit = node.args[0].type === 'literal' ? node.args[0] : node.args[1]

  result[prop.name] = new RegExp(lit.value)
}
