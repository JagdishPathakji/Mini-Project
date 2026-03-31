const express = require("express")
const questionRouter = express.Router()
const questionController = require("../../controllers/question.controller")

questionRouter.post("/questionsubmitted", questionController.questionsubmiited)
questionRouter.post("/interviewsubmit", questionController.interviewsubmit)
questionRouter.post("/runcode", questionController.runcode)
questionRouter.get("/fetchquestion", questionController.fetchquestion)
questionRouter.get("/fetchallquestion", questionController.fetchallquestion)
questionRouter.get("/fetchrandom", questionController.fetchrandom)
questionRouter.get("/fetchsubmissionshistory", questionController.fetchsubmissionshistory)

module.exports = questionRouter