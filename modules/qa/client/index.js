var answer = ""
var questionComplete = false
var questionId = null
var changeTimer = null

function createStateUpdateHooks() {
	addStateUpdateHook(() => {
		if (state.questionCorrect == true) {
			questionCorrect()
		} else {
			resetQuestion()
			
		}
	})

	addStateUpdateHook((attr, value) => {
		if (attr === "points") {
			console.log("wow points nice!", value)
		
			
		}
	})
}

function moduleLoaded() {
	createStateUpdateHooks()
	$("#answer").on("input", ()=>{
		console.log($("#answer").val(), answer)
		if (!questionComplete) {
			if (changeTimer != null) {
				clearTimeout(changeTimer)
			}
			changeTimer = setTimeout(()=>{
				socket.emit("answerValidate", $("#answer").val())
				
			}, 1000)
		}			
	})

}

function socketHookPost() {
	
	hookQandA()
	socket.on("counter", (data) => {
		//displayMessage(data)
	})
}

function hookQandA() {
	socket.on("question", (data, qId) => {
		console.log("Q", data, qId)
		setQuestion(data, qId)
	})
	socket.on("answer", (data) => {
		console.log("A", data)
		setAnswer(data)
	})
	socket.on("questionCorrect", (wasCorrect) => {
		//true case is handled by state update
		if (!wasCorrect) {
			$("#response").text("good try")
		}
	})
	
}


function isNewQuestion(qId) {
	console.log("new q id", qId, questionId)
	return qId != questionId
}

//TODO: set correct answer, prevent further edits
function questionCorrect() {
	console.log(questionId, "correct")
	questionComplete = true
	$("#response").text("nice")
}

function resetQuestion() {
	questionComplete = false
	$("#response").text("")
}

function setQuestion(question, qId) {
	if (isNewQuestion(qId)) {
		resetQuestion()
	}
	questionId = qId
	$("#question").html(question)
}

function setAnswer(newAnswer) {
	answer = newAnswer
}

function displayMessage(msg) {
	$("#display").html(msg)
}