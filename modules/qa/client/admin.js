
function promptAdminPassword() {
	var adminPassword = prompt("Password please")
	sendAdminPassword(adminPassword)
}

function adminInit() {
	if (socket == null) {
		console.log("Waiting for socket...")
		setTimeout(adminInit, 500) //Simple wait loop for full init
	} else {
		console.log("Adding module admin functions")
		shortcut.add("F4", function() {
			promptAdminPassword()
		})
		addAdminHooks()
	}
}


function addAdminHooks() {
	console.log("Hooking admin functionality")
	socket.on("adminAuthed", async (result) => {
		if (result) {
			//alert("Admin!")
			createAdminElements()
		} else {
			alert("Wrong password")
		}
	})
	socket.on("userList", async (allUsers) => {
		clearUserList()
		initUserList(allUsers)
		console.log("USERS", allUsers)
		
	})
	socket.on("userListAdd", async (user) => {
		
		addToUserList(user)
		
	})
	socket.on("userListRemove", async (user) => {
		
		removeFromUserList(user)
		
	})
	socket.on("userListUpdate", async (userId, attr, value) => {
		updateUserList(userId, attr, value)
	})
	//createQAHooks()
}

function sendQA() {
	var question = $("#sendQuestion").val()
	var answer = $("#sendAnswer").val()
	
	console.log("Sending", "Q: "+question, "A: "+answer)
	socket.emit("newQA", question, answer)
	
}

var options = {
	valueNames: [ "id", "lastAnswer", "points" ]
}

var userList = null //TODO: WAIT FOR USER LIST

function resortUserList() {
	userList.sort("id")
	userList.update() //TODO: needed?
}

function initUserList(initialUsers) {
	userList = new List("user-list", options, initialUsers)
	resortUserList()
}

function clearUserList() {
	
}

function removeFromUserList(id) {
	userList.remove("id", id)
}

function addToUserList(userData) {
	userList.add(userData)
}

function getUserValues(id) {
	var matchingUsers = userList.get("id", id)
	if (matchingUsers.length > 0) {
		return matchingUsers[0].values()
	}
}

function updateUserList(id, attr, value) {
	//We can't edit list items (TODO). Remove and re-add fixed?
	var oldValues = getUserValues(id)
	oldValues[attr] = value
	removeFromUserList(id)
	addToUserList(oldValues)
	resortUserList()
}

function sendAdminPassword(pass) {
	socket.emit("tryAdminAuth", pass)
}

function createAdminElements() {
	$("#admin_controls").load("admin.html", function(){adminLoaded()})	
}

function givePointsClicked(elem) {
	var id = elem.parentElement.parentElement.firstElementChild.innerText //TODO: ewww
	var values = getUserValues(id)
	var givePts = null
	var userPtsPrompt = prompt("How many points?")
	try {
		givePts = parseInt(eval(userPtsPrompt)) //Dangerous, but privileged access only
	} catch {
		givePts = null
		
	}
	if (givePts != null && !isNaN(givePts)) {
		socket.emit("givePoints", id, givePts)
	} else {
		alert("Could not evaluate")
	}
	
}

//body onload hook
function adminLoaded() {
	console.log("Admin loaded")
	socket.emit("requestUserList")
}
