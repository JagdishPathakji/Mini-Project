const express = require("express")
const userRouter = express.Router()
const userController = require("../../controllers/user.controller")
const aiController = require("../../controllers/ai.controller")
const interviewRouter = require("./interview.router")

userRouter.get("/getprofile", userController.getprofile)
userRouter.post("/ai/chat", aiController.aiController)
userRouter.use("/interview", interviewRouter)

module.exports = userRouter