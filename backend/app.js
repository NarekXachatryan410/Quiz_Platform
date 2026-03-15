const express = require("express")
const http = require("http")
const env = require("./config/env.js")
const cors = require("cors")
const db = require("./models/index.js")
const { adminRouter, sessionRouter, participantRouter } = require("./routes/routes.js")
const { initSocket } = require("./socket.js")
const sessionLoader = require("./utils/sessionLoader.js")

const app = express()
const server = http.createServer(app)
const io = initSocket(server)

// Load and validate session template on startup
sessionLoader.loadSessionTemplate()
  .then(() => {
    console.log('📋 Session template loaded successfully');
  })
  .catch(err => {
    console.error('❌ Failed to load session template:', err.message);
    process.exit(1);
  });

db.sequelize.sync()
  .then(() => console.log("✅ Database synced"))
  .catch(err => console.log("❌ Database sync error:", err.message))

app.use(cors({
    origin: "*",
}))
app.use(express.json())
app.use(express.urlencoded())
app.use('/admin', adminRouter)
app.use('/admin', sessionRouter)
app.use('/sessions', participantRouter)
app.use('/api', participantRouter)

io.listen(4005, () => console.log(`Socket Server running on URL: ${env.SOCKET_URL}`))
server.listen(env.PORT, () => console.log(`🚀 Server running on URL: http://localhost:${env.PORT}`))
