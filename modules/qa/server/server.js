var baseModule = null
module.exports.moduleLoaded = (baseExports) => {
	console.log("QA MODULE LOADED!")
	baseModule = baseExports
}

//TODO: handle this in app.
var curQuestionId = 0
var curQuestionStr = "(DEMO) What's your name?"
var curAnswerStr = "Ryan"

function emitQA(socket) {
	socket.emit("question", curQuestionStr, curQuestionId) 
	socket.emit("answer", curAnswerStr)

}

module.exports.attachAdminEvents = (socket) => {
	console.log("MY EVENTS")
	socket.on("newQA", async (question, answer) => {
		if (baseModule.socketIsAdmin(socket)) { //Only admins may set new questions
			curQuestionId++
			curQuestionStr = question
			curAnswerStr = answer
			
			emitQA(socket)
			await baseModule.setAllStateAttr("questionCorrect", false)
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
	socket.on("givePoints", async(sessionId, points) => {
		if (baseModule.socketIsAdmin(socket)) {
			var pointRecipient = await baseModule.getSocketFromSessionId(sessionId)
			var oldPts = await baseModule.getStateAttr(pointRecipient, "points", 0)
			var newPts = oldPts + points
			console.log("Giving", points,"pts to",sessionId, "new pts", newPts)
			await baseModule.setStateAttr(pointRecipient, "points", newPts)
		}
	})
}

module.exports.postSocketConnect = (socket) => {
	emitQA(socket)

}