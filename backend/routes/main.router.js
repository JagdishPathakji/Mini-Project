const express = require("express")
const mainRouter = express.Router()
const adminRouter = require("./admin/admin.router")
const userRouter = require("./user/user.router")
const questionRouter = require("./question/question.router")
const authRouter = require("./auth/auth.router")
const aiRouter = require("./ai.router")

mainRouter.use("/auth", authRouter)
mainRouter.use("/user", userRouter)
mainRouter.use("/question", questionRouter)
mainRouter.use("/admin", adminRouter)
mainRouter.use("/ai", aiRouter)

mainRouter.get("/", (req, res) => {
    res.send("I am server")
})

module.exports = mainRouter