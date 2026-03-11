const { sendResponse } = require("../utils/responses.js")
const { User } = require("../models")
const jwt = require("jsonwebtoken")
const env = require("../config/env.js")
const bcrypt = require("bcrypt")

class AdminController {
    async login(req, res) {
        const { username, password } = req.body

        if(!username || !password) {
            return sendResponse(res, 400, "Fill all the credentials")
        }

        const admin = await User.findOne({ where: { username } })
        if(!admin) {
            return sendResponse(res, 404, "Invalid credentials")
        }
        
        const isCorrect = await bcrypt.compare(password, admin.password)
        if(!isCorrect) {
            return sendResponse(res, 400, "Invalid credentials")
        }
        
        const token = jwt.sign({ 
            id: admin.id,
            username: admin.username
        }, env.JWT_SECRET, { expiresIn: "24h" });

        return sendResponse(res, 200, { 
            message: "Login successful",
            token,
            user: {
                id: admin.id,
                username: admin.username
            }
        })
    }

    async logout(req, res) {
        res.clearCookie("token")
        return sendResponse(res, 200, { message: "Logout successful" })
    }

    async getProfile(req, res) {
        return sendResponse(res, 200, { 
            user: {
                id: req.user.id,
                username: req.user.username
            }
        })
    }
}

module.exports = new AdminController()
