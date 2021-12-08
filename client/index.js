function getParam(param){
  return new URLSearchParams(window.location.search).get(param)
}

async function bodyLoaded() {
	socket = io({auth: { token: getParam("ac") }})
	await loadModule()
	
}

async function loadModule() {
	createSocketHooks()
	await loadModuleHtml()
	console.log("Module HTML loaded")
	moduleLoaded()
	console.log("Initialising admin funcs")
	adminInit() //Initial f2 hooking etc TODO: admin modules

}

async function loadModuleHtml() {
	//Inserting into the body at the start won't work well
	await new Promise((resolve) => {
		$("body").load("module/index.html", resolve)
	})
	

}

var state = {}
var stateUpdateHooks = []

//Called with no args when total state reset/update
function callStateUpdateHooks(attr, value) {
	for (stateHook of stateUpdateHooks) {
		stateHook(attr, value)
	}
}

function addStateUpdateHook(updateHook) {
	stateUpdateHooks.push(updateHook)
}

function hookStateUpdate() {
	//Total client state overwrite from server
	socket.on("state", (newState) => {
		console.log("new state:", newState)
		var oldState = state //Probably don't need this
		state = newState
		callStateUpdateHooks()
	})
	socket.on("stateAttrSet", (attr, value) => {
		state[attr] = value
		callStateUpdateHooks(attr, value)
		console.log("attr set", attr, value)
	})
}



function createSocketHooks() {
	socket.on("connect", () => {
		console.log(socket.id)
	})

	socket.on("disconnect", () => {
		console.log("Force disconnected", socket.id)
		$("body").html("<h1>One tab only please</h1>")
	})
	
	socket.on("getId", (newId) => {
		if (!Cookies.get("id")) {
			Cookies.set("id", newId)
			
		}
		confirmIdWithServer()
	})
	
	
	socketHookPost()

	hookStateUpdate()

}


function confirmIdWithServer() {
	socket.emit("confirmId", Cookies.get("id"))
}

