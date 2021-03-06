
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
			console.log("Admin authed!")
			isAdmin = () => {
				return true
			}
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
		if (!getUserValues(user.id)) {	
			console.log(user.id, "added to list", user)
			addToUserList(user)
		} else {
			console.log(user.id, "in list")
		}
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

var valueDefaults = {id: "", lastAnswer: "<none>", points: "0", connected: false}

var options = {
	valueNames: [ "id", "lastAnswer", "points", "connected"],
	item: "user-item"
}

var userList = null //TODO: WAIT FOR USER LIST

function resortUserList() {
	userList.sort("id")
	userList.sort("", {order: "desc", sortFunction: function(a, b) {
		
		return (a.values().connected > b.values().connected) + (a.values().id < b.values().id)
	}})
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
	try {
		userList.add(userData)
	} catch {
		console.log("weird listjs bug caught")
	}
}

function getUserValues(id) {
	var matchingUsers = userList.get()
	console.log("VALUES", matchingUsers)
	if (matchingUsers.length > 0) {
		//Why do we need to do this? No clue.
		//Sorting interferes with this, I think.
		for (user of matchingUsers) {
			if (user.values().id === id) {
				return user.values()
			}
		}
	}
}

function updateUserList(id, attr, value) {
	
	//We can't edit list items (TODO). Remove and re-add fixed?
	var didModify = false
	var oldValues = getUserValues(id)
	var defaultValue = null
	if (valueDefaults[attr]) {
		defaultValue = valueDefaults[attr]
	}
	if (oldValues) {
		oldValues[attr] = value
		didModify = true
		console.log("Modifying", id, attr, value)
	} /*else {
		if (defaultValue) {
			oldValues[attr] = defaultValue
			didModify = true
		}
	}*/
	
	removeFromUserList(id)
	console.log("UPDATING FOR", id, attr,value,oldValues)
	addToUserList(oldValues)
	
	resortUserList()
	
}

function sendAdminPassword(pass) {
	socket.emit("tryAdminAuth", pass)
	console.log("Authing with", pass)
}

function createAdminElements() {
	$("#admin_controls").load("module/admin.html", function(){adminLoaded()})	
}



function promptAwardPoints() {
	var givePts = null
	var userPtsPrompt = prompt("How many points?")
	try {
		givePts = parseInt(eval(userPtsPrompt)) //Dangerous, but privileged access only
	} catch {
		givePts = null
		
	}
	if (givePts != null && !isNaN(givePts)) {
		return givePts
	} else {
		alert("Could not evaluate")
		return null
	}
}

function givePointsToAnswerClicked() {
	var givePts = promptAwardPoints()
	if (givePts) {
		var answer = prompt("To answer?")
		if (confirm("Give " + givePts + " to answers " + answer + " ?")) {
			socket.emit("givePoints", null, givePts, answer)
		}
	}
}

function givePointsClicked(elem) {
	var id = elem.parentElement.parentElement.firstElementChild.innerText //TODO: ewww
	var values = getUserValues(id)
	var givePts = promptAwardPoints()
	if (givePts) {
		socket.emit("givePoints", id, givePts)
	}
	
}

//body onload hook
function adminLoaded() {
	console.log("Admin HTML loaded")
	socket.emit("requestUserList")
}

function previewQuestion() {
	$("#question").html("<p>PREVIEW</p>" + $("#sendQuestion").val())
	
}

function resetPreview() {
	
}




function loadPreset(elem) {
	var presetVal = $(elem).val()
	var presetUrl = "module/question_templates/" + presetVal + ".html"
	console.log("Loading preset", presetVal)
	
	$.get(presetUrl, function(data) {
		$("#sendQuestion").val(data)
		console.log("loaded preset", presetVal)
	})
	
}