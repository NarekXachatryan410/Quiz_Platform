const { sendResponse } = require("../utils/responses.js")
const { Session, Player, Activity, Question, Answer } = require("../models")
const sessionLoader = require("../utils/sessionLoader.js")
const { getIo, initSessionState, startTimerForSession, clearSessionState } = require("../socket.js")

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
                participantCount: session.Players ? session.Players.length : 0
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

            // Create activities & questions in the database using the session template
            const sessionTemplate = sessionLoader.getSessionTemplate();
            const createdActivities = [];

            for (const activityTemplate of sessionTemplate.activities) {
              const activity = await Activity.create({
                sessionId: session.id,
                type: activityTemplate.type,
                step: activityTemplate.step,
                title: activityTemplate.title,
                timerSeconds: activityTemplate.timer_seconds,
                instruction: activityTemplate.instruction,
                fragmentsCount: activityTemplate.fragments_count,
                scoring: activityTemplate.scoring,
                showLeaderboardAfterEach: activityTemplate.show_leaderboard_after_each,
              });

              if (activityTemplate.type === "quiz" && Array.isArray(activityTemplate.questions)) {
                for (const questionTemplate of activityTemplate.questions) {
                  await Question.create({
                    activityId: activity.id,
                    text: questionTemplate.text,
                    options: questionTemplate.options,
                    correctIndex: questionTemplate.correct_index,
                  });
                }
              }

              createdActivities.push(activity);
            }

            // Start session
            session.status = "active";
            const firstActivity = createdActivities[0];
            session.currentActivityId = firstActivity?.id;
            session.currentStep = firstActivity?.step ?? 1;
            session.currentQuestionIndex = 0;

            await session.save();

            const io = getIo();
            io.to(`session:${session.roomCode}`).emit("session_started", {
                sessionId: session.id,
                roomCode: session.roomCode,
                status: session.status,
                currentActivity: firstActivity
            })

            await initSessionState(session);
            await startTimerForSession(session.id);

            return sendResponse(res, 200, session)
        } catch (error) {
            console.error('Start session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async deleteSession(req, res) {
        const { id } = req.params

        try {
            const session = await Session.findByPk(id)

            if (!session) {
                return sendResponse(res, 404, "Session not found")
            }

            if (session.adminId !== req.user.id) {
                return sendResponse(res, 403, "Access denied")
            }

            // Delete all associated data in the correct order
            const activities = await Activity.findAll({ where: { sessionId: session.id } })
            const activityIds = activities.map((a) => a.id)

            const questions = await Question.findAll({ where: { activityId: activityIds } })
            const questionIds = questions.map((q) => q.id)

            if (questionIds.length) {
                await Answer.destroy({ where: { questionId: questionIds } })
            }

            if (activityIds.length) {
                await Question.destroy({ where: { activityId: activityIds } })
                await Activity.destroy({ where: { id: activityIds } })
            }

            await Player.destroy({ where: { sessionId: session.id } })
            await Session.destroy({ where: { id: session.id } })

            // Clear any in-memory state / timers
            clearSessionState(session.id)

            return sendResponse(res, 200, { deleted: true })
        } catch (error) {
            console.error('Delete session error:', error)
            return sendResponse(res, 500, "Server error")
        }
    }

    async getLobby(req, res) {
        const { id } = req.params

        try {
            const session = await Session.findByPk(id, {
                include: [
                    {
                        model: Player,
                        as: 'Players',
                        attributes: ['id', 'firstName', 'lastName', 'totalScore']
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
