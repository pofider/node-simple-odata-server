/*!
 * Copyright(c) 2014 Jan Blaha (pofider)
 *
 * Parse query string OData params and transform into mongo/nedb type of query
 */

module.exports = function(query) {

    if (query.$filter) {
        query.$filter = new Node(query.$filter.type, query.$filter.left, query.$filter.right).transform();
    } else {
        query.$filter = {};
    }

    if (query.$top) {
        query.$limit = query.$top
    }

    if (query.$orderby) {
        query.$sort = {};
        query.$orderby.forEach(function(prop) {
            var propName = Object.keys(prop)[0];
            query.$sort[propName] = prop[propName] === "desc" ? -1 : 1;
        });
    }

    if (query.$inlinecount === "allpages") {
        query.$count = true
    }

    if (query.$select) {
        query.$select = true
    }

    return query;
}

function Node(type, left, right) {
    this.type = type;
    this.left = left;
    this.right = right;
}

Node.prototype.transform = function() {
    var result = {};

    if (this.type === "eq" && this.right.type === 'literal') {
        result[this.left.name] = this.right.value;
    }

    if (this.type === "lt" && this.right.type === 'literal') {
        result[this.left.name] = { "$lt": this.right.value };
    }

    if (this.type === "gt" && this.right.type === 'literal') {
        result[this.left.name] = { "$gt": this.right.value };
    }

    if (this.type === "and") {
        result["$and"] = result["$and"] || [];
        result["$and"].push(new Node(this.left.type, this.left.left, this.left.right).transform());
        result["$and"].push(new Node(this.right.type, this.right.left, this.right.right).transform());
    }

    if (this.type === "or") {
        result["$or"] = result["$or"] || [];
        result["$or"].push(new Node(this.left.type, this.left.left, this.left.right).transform());
        result["$or"].push(new Node(this.right.type, this.right.left, this.right.right).transform());
    }

    return result;
}


