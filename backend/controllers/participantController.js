const { sendResponse } = require("../utils/responses")
const { Session, User } = require("../models")

class ParticipantController {
    async joinSession(req, res) {
        const { roomCode, firstName, lastName } = req.body

        if (!roomCode || !firstName || !lastName) {
            return sendResponse(res, 400, "Room code, first name, and last name are required")
        }

        try {
            const session = await Session.findOne({ where: { roomCode } })
            
            if (!session) {
                return sendResponse(res, 404, "Invalid room code")
            }

            if (session.status === 'finished') {
                return sendResponse(res, 400, "Session has ended")
            }

            const participantCount = await User.count({ where: { sessionId: session.id } })
            if (participantCount >= session.maxParticipants) {
                return sendResponse(res, 400, "Room is full")
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
                return sendResponse(res, 409, "This name is already taken. Please add a middle name or distinguishing suffix.")
            }

            return sendResponse(res, 200, {
                session: {
                    id: session.id,
                    name: session.name,
                    roomCode: session.roomCode,
                    status: session.status,
                    maxParticipants: session.maxParticipants,
                    currentStep: session.currentStep
                }
            })

        } catch (error) {
            console.error('Join session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async getSessionInfo(req, res) {
        const { roomCode } = req.params

        try {
            const session = await Session.findOne({ 
                where: { roomCode },
                include: [
                    {
                        model: User,
                        as: 'Users',
                        attributes: ['id', 'firstName', 'lastName', 'fullName']
                    }
                ]
            })
            
            if (!session) {
                return sendResponse(res, 404, "Invalid room code")
            }

            return sendResponse(res, 200, {
                id: session.id,
                name: session.name,
                roomCode: session.roomCode,
                status: session.status,
                maxParticipants: session.maxParticipants,
                currentStep: session.currentStep,
                participants: session.Users || []
            })

        } catch (error) {
            console.error('Get session info error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }
}

module.exports = new ParticipantController()
