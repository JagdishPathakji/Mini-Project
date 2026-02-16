const express = require("express")
const userRouter = express.Router()
const userController = require("../../controllers/user.controller")

userRouter.get("/user/getprofile", userController.getprofile)

module.exports = userRouter