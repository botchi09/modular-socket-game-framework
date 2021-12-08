
var fs = require("fs")
var server = require("./server/server.js")

var port = parseInt(fs.readFileSync("port.txt", "utf8"))
var accessCode = fs.readFileSync("accesscode.txt", "utf8")
var module = fs.readFileSync("module.txt", "utf8")


server.loadModule(module)
server.startServer(port, accessCode)