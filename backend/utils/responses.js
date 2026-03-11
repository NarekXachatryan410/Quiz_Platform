function sendResponse(response, statusCode = 200, message) {
    response.status(statusCode).send({ data: message })
}

module.exports = { sendResponse }