const path = require("path")
var loadedModule = {}
//TODO: Delegate to starter func and dependency inject?
const express = require("express")
const app = express()
const httpServer = require("http").createServer(app)
const options = {}
const io = require("socket.io")(httpServer, options)
app.use(express.static("client"))

app.get("/", function(req, res){
	console.log("Base dir request")
})
/*
app.get("/module", function(req, res){
	console.log("module dir request")
})*/

module.exports.getServer = function() {
	return io
}


//QA exclusive code
var cheerio = require("cheerio")
var fs = require("fs")


function socketIsAdmin(socket) {
	return socket.data.admin == true
}

module.exports.socketIsAdmin = socketIsAdmin

function attachAdminEvents(socket) {
	loadedModule.attachAdminEvents(socket)
	//HOOK: delegate all three here
	
	attachUserListEvents(socket)
	
	
}

module.exports.attachAdminEvents = attachAdminEvents

//TODO: accurate and updated user list
function attachUserListEvents(socket) {
	socket.on("requestUserList", async() => {
		console.log("Sending user list...")
		var allUsers = []
		/*allUsers[0] = {id: "hello", answer: "world", points: 100, group: 1}
		allUsers[1] = {id: "aaa", answer: "bbb", points: 550, group: 1}*/
		for (sessionId in states) {
			var state = states[sessionId]
			console.log(state)
			allUsers.push({id: sessionId, lastAnswer: state.lastAnswer || "", points: state.points || 0, group: state.group || 0})
		}
		
		socket.emit("userList", allUsers)
	})
}

module.exports.attachUserListEvents = attachUserListEvents

//Generic user handle code
var idCounter = 0 //TODO: save to file to prevent collisions
io.on("connection", socket => { 
	console.log("connected", socket.id, socket.data.sessionId)
	attachClientEvents(socket)
	idCounter++
	socket.emit("getId", idCounter)
	socket.emit("counter", "connected!")
	loadedModule.postSocketConnect(socket)
	logAllClients()
	
})



async function logAllClients() {
	const ids = await io.allSockets()
	console.log("clients connected", ids.size)
}

function getSocketFromId(id) {
	return io.sockets.sockets.get(id)
}

async function kickIfClientDupe(socket, sessionId) {
	const ids = await io.allSockets()
	var idDupeCount = 0
	ids.forEach(async(id) => {
		if (socket.id !== id) {
			if (getSocketFromId(id).data.sessionId == sessionId) {
				idDupeCount+=1
				console.log(idDupeCount, "DUPES DETECTED")
				getSocketFromId(id).disconnect()

			}
		}
	})
	
	
	return false
}



//Maintain user states here
var states = {}

function getStates() {
	return states
}

module.exports.getStates = getStates

function userState() {
	
	return this
}

function getState(sessionId) {
	if (states[sessionId] == null) {
		states[sessionId] = new userState()
	}
	return states[sessionId]
}

module.exports.getState = getState

async function getAdminSockets() {
	const ids = await io.allSockets()
	var admins = []
	ids.forEach(async(id) => {
		var socket = getSocketFromId(id)
		if (socketIsAdmin(socket)) {
			admins.push(socket)
		}
	})
	return admins
}

module.exports.getAdminSockets = getAdminSockets

async function getSocketFromSessionId(sessionId) {
	const sockets = await io.fetchSockets()
	var foundSocket = null
	sockets.forEach(async(socket) => {
		if (socket.data.sessionId === sessionId) {
			foundSocket = socket
		}
	})
	return foundSocket
}

module.exports.getSocketFromSessionId = getSocketFromSessionId

function sendState(socket) {
	socket.emit("state", getState(socket.data.sessionId))
}

module.exports.sendState = sendState

async function getStateAttr(socket, attr, defaultValue) {
	var state = getState(socket.data.sessionId)
	if (state[attr] == null) {
		state[attr] = defaultValue
	}
	return state[attr]
}

module.exports.getStateAttr = getStateAttr

async function setStateAttr(socket, attr, value) {
	getState(socket.data.sessionId)[attr] = value
	socket.emit("stateAttrSet", attr, value)
	var admins = await getAdminSockets()
	for (var adminSocket of admins) {
		adminSocket.emit("userListUpdate", socket.data.sessionId, attr, value)
	}
}

module.exports.setStateAttr = setStateAttr


async function setAllStateAttr(attr, value) {
	for (var sessionId in states) {
		states[sessionId][attr] = value
		
	}
	
	
	io.emit("stateAttrSet", attr, value)
}

module.exports.setAllStateAttr = setAllStateAttr

function postAuthHandshake(socket) {
	sendState(socket)
}

var adminPassword = ""

async function attachClientEvents(socket) {
	//Handshake to confirm user ID. Allows persistent ID across refresh.
	socket.on("confirmId", async (newId) => {
		socket.data.sessionId = newId
		var didKick = await kickIfClientDupe(socket, newId)
		if (!didKick) {
			console.log("Confirmed ID", newId)
			
		}
		postAuthHandshake(socket)
	})
	socket.on("tryAdminAuth", async (sentPw) => {
		if (sentPw === adminPassword) {
			socket.data.admin = true
			socket.emit("adminAuthed", true)
		} else {
			socket.data.admin = false
			socket.emit("adminAuthed", false)
		}
	})
	
	attachAdminEvents(socket)
}

module.exports.attachClientEvents = attachClientEvents //TODO: allow this to be exposed?

module.exports.loadModule = function(moduleName) {
	app.use("/module", express.static(path.join("modules", moduleName, "client"))) //Create the route
	loadedModule = require(path.join(__dirname, "../", "modules", moduleName, "server", "server.js"))
	loadedModule.moduleLoaded(module.exports)
	loadedModule.moduleName = moduleName
}

module.exports.startServer = function() {
	

	httpServer.listen(3000)
	console.log("server up on 3000")

	var timer = 1

	setInterval(()=>{
		io.emit("counter", timer)
		//console.log(timer)
		timer = timer+1
	}, 1000)
}
