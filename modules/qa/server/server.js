var baseModule = null
module.exports.moduleLoaded = (baseExports) => {
	console.log("QA MODULE LOADED!")
	baseModule = baseExports
}

//TODO: handle this in app.
var curQuestionId = 0
var curQuestionStr = "(DEMO) What's your name? <input id='answer' type='text' oninput='forwardAnswerValue()' \/>"
var curAnswerStr = ""

function emitQA(socket) {
	console.log("New question set", curQuestionId)
	if (socket) {
		//Send to a single user
		socket.emit("question", curQuestionStr, curQuestionId) 
		socket.emit("answer", curAnswerStr)
	} else {
		//Broadcast to all
		baseModule.getServer().emit("question", curQuestionStr, curQuestionId) 
		baseModule.getServer().emit("answer", curAnswerStr)
	}

}

module.exports.attachAdminEvents = (socket) => {
	console.log("MY EVENTS")
	socket.on("newQA", async (question, answer) => {
		if (baseModule.socketIsAdmin(socket)) { //Only admins may set new questions
			curQuestionId++
			curQuestionStr = question
			curAnswerStr = answer
			
			emitQA()
			await baseModule.setAllStateAttr("questionCorrect", false)
			console.log("Admin set new question")
		}
	})
	socket.on("answerValidate", async(answer) => {
		await baseModule.setStateAttr(socket, "lastAnswer", answer)
		if (answer === curAnswerStr) {
			//socket.emit("questionCorrect", true)
			await baseModule.setStateAttr(socket, "questionCorrect", true)
		} else {
			socket.emit("questionCorrect", false)
		}
	})
	socket.on("givePoints", async(sessionId, points, answer) => {
		if (baseModule.socketIsAdmin(socket)) {
			var recipients = []
			var giveToAll = false
			if (sessionId) {
				var recipientSocket = await baseModule.getSocketFromSessionId(sessionId)
				recipients.push(recipientSocket)
			} else {
				
				if (typeof(answer) === "string") { //simple null check fails here, for some reason
					var states = baseModule.getStates()

					for (var stateSessionId in states) {
						var recipientSocket = await baseModule.getSocketFromSessionId(stateSessionId)
						var socketAnswer = await baseModule.getStateAttr(recipientSocket, "lastAnswer", "")
						if (socketAnswer === answer || answer.length == 0) {
							recipients.push(recipientSocket)
							
						}
						
					}
				}
			}
			for (pointRecipient of recipients) {

				var oldPts = await baseModule.getStateAttr(pointRecipient, "points", 0)
				var newPts = oldPts + points
				console.log("Giving", points, "pts to", sessionId, "new pts", newPts)
				await baseModule.setStateAttr(pointRecipient, "points", newPts)
			}
			
		}
	})
}

module.exports.getUserlistDefaults = () => {
	return {points: 0}
}

module.exports.postSocketConnect = (socket) => {
	emitQA(socket)

}