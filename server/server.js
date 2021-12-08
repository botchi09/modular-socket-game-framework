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

app.get("/module", function(req, res){
	console.log("module dir request")
})

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
	
	socket.on("tryAdminAuth", async (sentPw) => {
		if (sentPw === adminPassword) {
			socket.data.admin = true
			socket.emit("adminAuthed", true)
		} else {
			socket.data.admin = false
			socket.emit("adminAuthed", false)
		}
	})
	
	loadedModule.attachAdminEvents(socket)
	//HOOK: delegate all three here
	
	attachUserListEvents(socket)
	
	
}

module.exports.attachAdminEvents = attachAdminEvents

function attachClientDisconnectEvents(socket) {
	socket.on("disconnect", async() => {
		await setStateAttr(socket, "connected", false)
	})
	
	
}

function getUserListState(sessionId) {
	var state = states[sessionId]
	var userListDefaults = {}
	if (loadedModule.getUserlistDefaults) {
		userListDefaults = loadedModule.getUserlistDefaults()
	}

	//lastAnswer: state.lastAnswer || "", points: state.points || 0, group: state.group || 0
	return {id: sessionId, ...userListDefaults, ...state}
}

//TODO: accurate and updated user list
function attachUserListEvents(socket) {
	socket.on("requestUserList", async() => {
		console.log("Sending user list...")
		var allUsers = []
		/*allUsers[0] = {id: "hello", answer: "world", points: 100, group: 1}
		allUsers[1] = {id: "aaa", answer: "bbb", points: 550, group: 1}*/
		for (sessionId in states) {
			var userListState = getUserListState(sessionId)
			//lastAnswer: state.lastAnswer || "", points: state.points || 0, group: state.group || 0
			allUsers.push(userListState)
		}
		console.log(allUsers)
		socket.emit("userList", allUsers)
	})
}

module.exports.attachUserListEvents = attachUserListEvents

//Generic user handle code
var idCounter = 0 //TODO: save to file to prevent collisions

//Access code auth
io.use((socket, next) => {
	const token = socket.handshake.auth.token
	if (token && authAccessCode === token) {
		next()
	} else {
		console.log("Refused client with token", token)
	}
})

io.on("connection", socket => { 
	console.log("connected", socket.id, socket.data.sessionId)
	attachClientEvents(socket)
	idCounter++
	saveIdCounter()
	socket.emit("getId", idCounter)
	//socket.emit("counter", "connected!")
	loadedModule.postSocketConnect(socket)
	logAllClients()
	attachClientDisconnectEvents(socket)
	
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
	if (socket) {
		var state = getState(socket.data.sessionId)
		if (state[attr] == null) {
			state[attr] = defaultValue
		}
		return state[attr]
	}
	return defaultValue
}

module.exports.getStateAttr = getStateAttr

async function setStateAttr(socket, attr, value) {
	var sessionId = socket
	console.log("SOCKET TYPE", typeof(sessionId))
	
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
	//TODO: admin socket broadcast too

	io.emit("stateAttrSet", attr, value)
}

module.exports.setAllStateAttr = setAllStateAttr

async function postAuthHandshake(socket) {
	
	

	setStateAttr(socket, "connected", true)
	sendState(socket)
	if (loadedModule.postAuthHandshake) {
		loadedModule.postAuthHandshake(socket)
	}
	
	var admins = await getAdminSockets()
	for (var adminSocket of admins) {
		var userState = getUserListState(socket.data.sessionId)
		
		console.log("STATE",userState)
		adminSocket.emit("userListAdd", userState)
	}
}

var adminPassword = ""
var authAccessCode = ""

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
	
	
	attachAdminEvents(socket)
}

module.exports.attachClientEvents = attachClientEvents //TODO: allow this to be exposed?

module.exports.loadModule = function(moduleName) {
	app.use("/module", express.static(path.join("modules", moduleName, "client"))) //Create the route
	loadedModule = require(path.join(__dirname, "../", "modules", moduleName, "server", "server.js"))
	loadedModule.moduleLoaded(module.exports)
	loadedModule.moduleName = moduleName
}

function saveIdCounter() {
	try {
		fs.writeFileSync("idcounter.txt", idCounter.toString())
	} catch(e) {
		console.log("Could not write id counter")
		console.log(e)
	}
}

function loadIdCounter() {
	try {
		var loadedId = parseInt(fs.readFileSync("idcounter.txt", "utf8"))
		idCounter = loadedId
		console.log("IDs assigned from", loadedId)
	} catch {
		console.log("No ID counter file exists")
		//We can leave it at the 0 default if this is the case.
	}
}

module.exports.startServer = function(port, accessCode, newAdminPassword) {
	loadIdCounter()
	authAccessCode = accessCode
	adminPassword = newAdminPassword
	httpServer.listen(port)
	console.log("server up on", port, "access code", authAccessCode, "admin pw", adminPassword)

	var timer = 1

	/*setInterval(()=>{
		io.emit("counter", timer)
		//console.log(timer)
		timer = timer+1
	}, 1000)*/
}

