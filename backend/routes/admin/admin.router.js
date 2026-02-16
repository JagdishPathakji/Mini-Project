const express = require("express")
const adminRouter = express.Router()
const adminController = require("../../controllers/admin.controller")

adminRouter.get("/admin/viewusers", adminController.viewusers)
adminRouter.post("/admin/addquestion", adminController.addquestion)

module.exports = adminRouter