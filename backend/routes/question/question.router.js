const express = require("express")
const questionRouter = express.Router()
const questionController = require("../../controllers/question.controller")

questionRouter.post("/questionsubmitted", questionController.questionsubmiited)
questionRouter.get("/fetchquestion", questionController.fetchquestion)
questionRouter.get("/fetchallquestion", questionController.fetchallquestion)

module.exports = questionRouter