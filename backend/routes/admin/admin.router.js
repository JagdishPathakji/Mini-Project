const express = require("express");
const adminAuth = require("../../controllers/adminAuth");
const {
    addquestion,
    getquestion,
    updatequestion,
    deletequestion,
    getallquestions,
    bulkimport,
    getstats,
    viewusers,
    deleteuser,
    updateuserrole
} = require("../../controllers/admin.controller");

const router = express.Router();

// Apply adminAuth middleware to all routes
router.use(adminAuth);

// Question management routes
router.post("/addquestion", addquestion);
router.get("/questions", getallquestions);
router.get("/question/:qno", getquestion);
router.put("/updatequestion/:qno", updatequestion);
router.delete("/deletequestion/:qno", deletequestion);
router.post("/bulkimport", bulkimport);

// User management routes
router.get("/viewusers", viewusers);
router.delete("/deleteuser/:id", deleteuser);
router.patch("/updateuserrole/:id", updateuserrole);

// Stats route
router.get("/stats", getstats);

module.exports = router;