var ODataServer = require("./lib/odataServer.js");

module.exports = function(options) {
    return new ODataServer(options);
}