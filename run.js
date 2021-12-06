
var fs = require("fs")
var server = require("./server/server.js")

var port = parseInt(fs.readFileSync("port.txt", "utf8"))



server.loadModule("bombfight")
server.startServer(port)