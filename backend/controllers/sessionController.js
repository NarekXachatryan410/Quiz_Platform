const { sendResponse } = require("../utils/responses")
const { Session, User, Player } = require("../models")
const sessionLoader = require("../utils/sessionLoader")

class SessionController {
    async createSession(req, res) {
        const { name, maxParticipants, roomCode } = req.body
        if(!name || !maxParticipants || !roomCode) {
            return sendResponse(res, 400, "fill out all the input fields")
        }

        try {
            const newSession = await Session.create({
                name,
                roomCode,
                maxParticipants,
                adminId: req.user.id
            })
            
            return sendResponse(res, 201, { newSession })
        } catch (error) {
            console.error('Create session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async getSessions(req, res) {
        try {
            const sessions = await Session.findAll({
                where: { adminId: req.user.id },
                include: [
                    {
                        model: Player,
                        as: 'Players'
                    }
                ],
                order: [['createdAt', 'DESC']]
            })
            
            const sessionsWithCounts = sessions.map(session => ({
                ...session.toJSON(),
                participantCount: session.Users ? session.Users.length : 0
            }))
            
            return sendResponse(res, 200, sessionsWithCounts)
        } catch (error) {
            console.error('Get sessions error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async getSessionById(req, res) {
        const { id } = req.params

        try {
            const session = await Session.findByPk(id, {
                include: [
                    {
                        model: Player,
                        as: 'Players',
                        order: [['totalScore', 'DESC']]
                    }
                ]
            })
            
            if (!session) {
                return sendResponse(res, 404, "Session not found")
            }

            if (session.adminId !== req.user.id) {
                return sendResponse(res, 403, "Access denied")
            }

            return sendResponse(res, 200, session)
        } catch (error) {
            console.error('Get session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async startSession(req, res) {
        const { id } = req.params

        try {
            const session = await Session.findByPk(id)

            if (!session) {
                return sendResponse(res, 404, "Session not found")
            }

            if (session.adminId !== req.user.id) {
                return sendResponse(res, 403, "Access denied")
            }

            if (session.status !== "waiting") {
                return sendResponse(res, 400, "Session can only be started from waiting status")
            }

            // Check if at least 2 participants have joined
            const participantCount = await User.count({ where: { sessionId: session.id } })
            if (participantCount < 2) {
                return sendResponse(res, 400, "At least 2 participants are required to start the session")
            }

            session.status = "active"
            session.currentStep = 1
            
            // Get the first activity from the session template
            const sessionTemplate = sessionLoader.getSessionTemplate()
            const firstActivity = sessionTemplate.activities[0]
            session.currentActivityId = firstActivity.id
            
            await session.save()
            
            req.io.to(`session:${session.roomCode}`).emit("session_started", {
                sessionId: session.id,
                roomCode: session.roomCode,
                status: session.status,
                currentActivity: firstActivity
            })

            return sendResponse(res, 200, session)
        } catch (error) {
            console.error('Start session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async getLobby(req, res) {
        const { id } = req.params

        try {
            const session = await Session.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'Users',
                        attributes: ['id', 'firstName', 'lastName', 'fullName']
                    }
                ]
            })
            
            if (!session) {
                return sendResponse(res, 404, "Session not found")
            }

            if (session.adminId !== req.user.id) {
                return sendResponse(res, 403, "Access denied")
            }

            return sendResponse(res, 200, session)
        } catch (error) {
            console.error('Get lobby error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

}

module.exports = new SessionController()
