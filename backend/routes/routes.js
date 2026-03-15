const adminController = require("../controllers/adminController.js")
const sessionController = require("../controllers/sessionController.js")
const participantController = require("../controllers/participantController.js")
const { Router } = require("express")
const { authMiddleware } = require("../middlewares/authMiddleware.js")

const adminRouter = Router()
const sessionRouter = Router()
const participantRouter = Router()

adminRouter.post('/login', adminController.login)
adminRouter.post('/logout', adminController.logout)
adminRouter.get('/profile', authMiddleware, adminController.getProfile)
sessionRouter.post('/sessions', authMiddleware, sessionController.createSession)
sessionRouter.get('/sessions', authMiddleware, sessionController.getSessions)
sessionRouter.get('/sessions/:id', sessionController.getSessionById)
sessionRouter.get('/sessions/:id/lobby', authMiddleware, sessionController.getLobby)
sessionRouter.patch('/sessions/:id/start', authMiddleware, sessionController.startSession)
sessionRouter.delete('/sessions/:id', authMiddleware, sessionController.deleteSession)

// Participant routes (no auth required)
participantRouter.post('/join', participantController.joinSession)
participantRouter.get('/session/:roomCode', participantController.getSessionInfo)

module.exports = { adminRouter, sessionRouter, participantRouter }
