const express = require("express")
const authRouter = express.Router()
const authController = require("../../controllers/auth.controller")

authRouter.post("/userlogin", authController.userlogin)
authRouter.post("/usersignup", authController.usersignup)
authRouter.post("/verifyemail", authController.verifyemail)
authRouter.post("/logout", authController.logout)

module.exports = authRouter