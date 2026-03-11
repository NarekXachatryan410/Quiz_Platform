const { Server } = require("socket.io")
const { Session, User, Answer } = require("./models")
const sessionLoader = require("./utils/sessionLoader")

let ioInstance = null
const activeTimers = new Map()

function getRoomKey(roomCode) {
    return `session:${roomCode}`
}

function emitParticipants(roomCode) {
    const key = getRoomKey(roomCode)
    ioInstance.to(key).emit("participants_updated")
}

function calculateQuizScore(timeRemaining, totalTime, basePoints) {
    if (timeRemaining <= 0) return 0
    const score = 50 + Math.round(50 * (timeRemaining / totalTime))
    return Math.min(score, basePoints)
}

async function getLeaderboard(sessionId) {
    const users = await User.findAll({
        where: { sessionId },
        order: [['totalScore', 'DESC']],
        limit: 10
    })
    return users.map(user => ({
        id: user.id,
        fullName: user.fullName,
        totalScore: user.totalScore
    }))
}

function initSocket(httpServer) {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: "*",
        },
    })

    ioInstance.on("connection", (socket) => {
        console.log(`🔗 Socket connected: ${socket.id}`)

        socket.on("join_session", async (payload) => {
            try {
                const { roomCode, firstName, lastName } = payload
                
                if (!roomCode || !firstName || !lastName) {
                    socket.emit("error", { message: "Missing required fields" })
                    return
                }

                const session = await Session.findOne({ where: { roomCode } })
                if (!session) {
                    socket.emit("error", { message: "Invalid room code" })
                    return
                }

                if (session.status === 'finished') {
                    socket.emit("error", { message: "Session has ended" })
                    return
                }

                const participantCount = await User.count({ where: { sessionId: session.id } })
                if (participantCount >= session.maxParticipants) {
                    socket.emit("error", { message: "Room is full" })
                    return
                }

                // Check for duplicate names
                const existingUser = await User.findOne({
                    where: { 
                        sessionId: session.id,
                        firstName,
                        lastName
                    }
                })

                if (existingUser) {
                    socket.emit("name_duplicate", { 
                        message: "This name is already taken. Please add a middle name or distinguishing suffix." 
                    })
                    return
                }

                const key = getRoomKey(roomCode)
                socket.join(key)

                const user = await User.create({
                    firstName,
                    lastName,
                    sessionId: session.id,
                    socketId: socket.id
                })

                socket.userId = user.id
                socket.sessionId = session.id
                socket.roomCode = roomCode

                emitParticipants(roomCode)

                socket.emit("joined_session", {
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        fullName: user.fullName
                    },
                    session: {
                        id: session.id,
                        name: session.name,
                        status: session.status,
                        currentStep: session.currentStep
                    }
                })

            } catch (error) {
                console.error("Join session error:", error)
                socket.emit("error", { message: "Failed to join session" })
            }
        })

        socket.on("submit_quiz_answer", async (payload) => {
            try {
                const { questionId, selectedOption, timeRemaining } = payload
                
                if (!socket.sessionId || !socket.userId) {
                    socket.emit("error", { message: "Not in a session" })
                    return
                }

                // Check if already answered
                const existingAnswer = await Answer.findOne({
                    where: {
                        userId: socket.userId,
                        questionId
                    }
                })

                if (existingAnswer) {
                    socket.emit("error", { message: "Already answered this question" })
                    return
                }

                const session = await Session.findByPk(socket.sessionId)
                const sessionTemplate = sessionLoader.getSessionTemplate()
                const currentActivity = sessionTemplate.activities.find(
                    activity => activity.id === session.currentActivityId
                )

                if (!currentActivity || currentActivity.type !== 'quiz') {
                    socket.emit("error", { message: "No active quiz question" })
                    return
                }

                const question = currentActivity.questions.find(q => q.id === questionId)
                if (!question) {
                    socket.emit("error", { message: "Invalid question" })
                    return
                }

                const isCorrect = selectedOption === question.correct_index
                const score = isCorrect ? 
                    calculateQuizScore(timeRemaining, question.timer_seconds || currentActivity.timer_seconds, currentActivity.scoring.base_points) : 
                    0

                await Answer.create({
                    userId: socket.userId,
                    questionId,
                    selectedOption,
                    isCorrect,
                    score,
                    timeRemaining
                })

                if (score > 0) {
                    const user = await User.findByPk(socket.userId)
                    user.totalScore += score
                    await user.save()
                }

                socket.emit("answer_submitted", {
                    isCorrect,
                    score,
                    correctAnswer: question.correct_index
                })

                // Send answer distribution to admin
                const answers = await Answer.findAll({
                    where: { questionId },
                    include: [{ model: User, attributes: ['firstName', 'lastName'] }]
                })

                const distribution = [0, 0, 0, 0]
                answers.forEach(answer => {
                    distribution[answer.selectedOption]++
                })

                ioInstance.to(`admin:${session.adminId}`).emit("answer_distribution", {
                    questionId,
                    distribution,
                    correctAnswer: question.correct_index,
                    totalAnswers: answers.length
                })

            } catch (error) {
                console.error("Submit answer error:", error)
                socket.emit("error", { message: "Failed to submit answer" })
            }
        })

        socket.on("submit_puzzle_score", async (payload) => {
            try {
                const { correctCount } = payload
                
                if (!socket.sessionId || !socket.userId) {
                    socket.emit("error", { message: "Not in a session" })
                    return
                }

                const session = await Session.findByPk(socket.sessionId)
                const sessionTemplate = sessionLoader.getSessionTemplate()
                const currentActivity = sessionTemplate.activities.find(
                    activity => activity.id === session.currentActivityId
                )

                if (!currentActivity || currentActivity.type !== 'puzzle_assembly') {
                    socket.emit("error", { message: "No active puzzle activity" })
                    return
                }

                const score = correctCount * currentActivity.scoring.points_per_correct

                // Store as pending confirmation
                ioInstance.to(`admin:${session.adminId}`).emit("puzzle_score_pending", {
                    userId: socket.userId,
                    firstName: socket.firstName,
                    lastName: socket.lastName,
                    correctCount,
                    score
                })

                socket.emit("puzzle_score_submitted", { pending: true })

            } catch (error) {
                console.error("Submit puzzle score error:", error)
                socket.emit("error", { message: "Failed to submit puzzle score" })
            }
        })

        socket.on("admin_join_session", async (payload) => {
            try {
                const { sessionId } = payload
                const session = await Session.findByPk(sessionId)
                
                if (!session) {
                    socket.emit("error", { message: "Session not found" })
                    return
                }

                socket.join(`admin:${session.adminId}`)
                socket.adminId = session.adminId
                socket.currentSessionId = sessionId

                socket.emit("admin_session_joined", { session })

            } catch (error) {
                console.error("Admin join session error:", error)
                socket.emit("error", { message: "Failed to join session" })
            }
        })

        socket.on("confirm_puzzle_scores", async (payload) => {
            try {
                const { scores } = payload
                
                for (const scoreData of scores) {
                    const user = await User.findByPk(scoreData.userId)
                    if (user) {
                        user.totalScore += scoreData.score
                        await user.save()
                    }
                }

                const leaderboard = await getLeaderboard(socket.currentSessionId)
                
                ioInstance.to(getRoomKey(socket.roomCode)).emit("puzzle_scores_confirmed", {
                    leaderboard
                })

            } catch (error) {
                console.error("Confirm puzzle scores error:", error)
                socket.emit("error", { message: "Failed to confirm scores" })
            }
        })

        socket.on("disconnect", () => {
            console.log(`❌ Socket disconnected: ${socket.id}`)
            
            if (socket.userId && socket.sessionId) {
                User.update(
                    { socketId: null },
                    { where: { id: socket.userId } }
                )
                
                if (socket.roomCode) {
                    emitParticipants(socket.roomCode)
                }
            }
        })
    })

    return ioInstance
}

function getIo() {
    if (!ioInstance) {
        throw new Error("Socket.io is not initialized")
    }
    return ioInstance
}

module.exports = { initSocket, getIo }
