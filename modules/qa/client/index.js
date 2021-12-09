var answer = ""
var questionComplete = false
var questionId = null
var changeTimer = null
var answerEmitterId = "#answer_emitter"

//Override this if we are admin! NEVER rely on this for authorititive state.
//Just for user experience.
function isAdmin() {
	return false
}

//Convenience function to automatically set the selected answer
function forwardAnswerValue() {
	console.log("Forwarding answer input...")
	setSelectedAnswer($("#answer").val())
}

function setSelectedAnswer(answer) {
	$(answerEmitterId).val(new String(answer)).trigger("input")
}

function createStateUpdateHooks() {
	
	addStateUpdateHook(() => {
		console.log("Initial state set", state)
		setPointsDisplay(state.points)
		if (state.questionCorrect == true) {
			questionCorrect()
		} else {
			//resetQuestion() //TODO: this may be causing bugs
			
		}
	})

	addStateUpdateHook((attr, value) => {
		if (attr === "points") {
			console.log("wow points nice!", value)
			setPointsDisplay(value)
			doPointsAnimation()
			
		}
	})
}

function moduleLoaded() {
	createStateUpdateHooks()
	$(answerEmitterId).on("input", ()=>{
		console.log($(answerEmitterId).val(), answer)
		if (!questionComplete) {
			if (changeTimer != null) {
				clearTimeout(changeTimer)
			}
			changeTimer = setTimeout(()=>{
				socket.emit("answerValidate", $(answerEmitterId).val())
				
			}, 3000)
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
			//$("#response").text("good try") //TODO: feedback?
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


function reset_animation(el) {
  el.style.animation = 'none';
  el.offsetHeight; /* trigger reflow */
  el.style.animation = null; 
}

var pointsDisplayId = "points-display"
var pointsMessageId = "points-plus"

function doPointsAnimation() {
	$("#"+pointsDisplayId).removeClass("pointsAdded")
	$("#"+pointsDisplayId).addClass("pointsAdded")
	
	$("#"+pointsMessageId).removeClass("pointsAdded pointsAddedBounce")
	$("#"+pointsMessageId).addClass("pointsAdded pointsAddedBounce")
	
	reset_animation(document.getElementById(pointsDisplayId))
	reset_animation(document.getElementById("points-plus"))
	
	console.log("Points animation")
}

function setPointsDisplay(points) {
	$("#points-display").text("Points: " + (points || "0"))
}