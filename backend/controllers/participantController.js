const { sendResponse } = require("../utils/responses")
const { Session, Player } = require("../models")

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

            const participantCount = await Player.count({ where: { sessionId: session.id } })
            if (participantCount >= session.maxParticipants) {
                return sendResponse(res, 400, "Room is full")
            }

            // Check for duplicate names
            const existingUser = await Player.findOne({
                where: { 
                    sessionId: session.id,
                    firstName,
                    lastName
                }
            })

            if (existingUser) {
                return sendResponse(res, 409, "This name is already taken. Please add a middle name or distinguishing suffix.")
            }

            const player = await Player.create({sessionId: session.id, firstName, lastName})

            return sendResponse(res, 200, {
                player: {
                    id: player.id,
                    firstName: player.firstName,
                    lastName: player.lastName,
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
                        model: Player,
                        as: 'Players',
                        attributes: ['id', 'firstName', 'lastName']
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
                participants: session.Players || []
            })

        } catch (error) {
            console.error('Get session info error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }
}

module.exports = new ParticipantController()
