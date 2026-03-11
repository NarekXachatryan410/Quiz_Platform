const { sendResponse } = require("../utils/responses.js")
const jwt = require("jsonwebtoken")
const env = require("../config/env.js")

function authMiddleware(req, res, next) {
    const header = req.headers["authorization"]

    if(!header) {
        return sendResponse(res, 401, "Token is missing")
    }

    const [bearer, token] = header.split(" ")

    if(!bearer || !token) {
        return sendResponse(res, 401, "Invalid or missing token")
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return sendResponse(res, 403, "Unauthorized")
    }
} 

module.exports = { authMiddleware }