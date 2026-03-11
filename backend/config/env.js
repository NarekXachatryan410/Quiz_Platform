require("dotenv").config()

const env = {
    PORT: process.env.PORT || 4000,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    SOCKET_URL: process.env.SOCKET_URL
}

module.exports = env