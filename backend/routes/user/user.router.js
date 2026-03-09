const express = require("express")
const userRouter = express.Router()
const userController = require("../../controllers/user.controller")
const aiController = require("../../controllers/ai.controller")

userRouter.get("/getprofile", userController.getprofile)
userRouter.post("/ai/chat", aiController.aiController)
userRouter.post("/ai/interview", aiController.voiceinterview)

module.exports = userRouter