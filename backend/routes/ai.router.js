const express = require("express");
const aiRouter = express.Router();
const aiController = require("../controllers/ai.controller");

aiRouter.post("/chat", aiController.chatWithAI);

module.exports = aiRouter;
