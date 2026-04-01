const question = require("../database/models/question");
const user = require("../database/models/user");

// ─── Question Management ───────────────────────────────────────────────────────

const addquestion = async (req, res) => {
    try {
        const { qno, qheading, qdifficulty, qdescription, qtags, qinput_output, qstartcode } = req.body;

        // Check if qno already exists
        const existing = await question.findOne({ qno });
        if (existing) {
            return res.status(400).send({ status: false, message: `Question #${qno} already exists.` });
        }

        await question.create({ qno, qheading, qdifficulty, qdescription, qtags, qinput_output, qstartcode });

        return res.status(201).send({
            status: true,
            message: "Question added successfully"
        });
    } catch (error) {
        console.error("addquestion error:", error);
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const getquestion = async (req, res) => {
    try {
        const { qno } = req.params;
        const doc = await question.findOne({ qno });
        if (!doc) return res.status(404).send({ status: false, message: "Question not found" });

        return res.status(200).send({
            status: true,
            message: "Question data sent successfully",
            doc
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const updatequestion = async (req, res) => {
    try {
        const { qno } = req.params;
        const updateData = req.body;

        const doc = await question.findOneAndUpdate({ qno }, updateData, { new: true });
        if (!doc) return res.status(404).send({ status: false, message: "Question not found" });

        return res.status(200).send({
            status: true,
            message: "Question updated successfully"
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const deletequestion = async (req, res) => {
    try {
        const { qno } = req.params;
        const doc = await question.findOneAndDelete({ qno });
        if (!doc) return res.status(404).send({ status: false, message: "Question not found" });

        return res.status(200).send({
            status: true,
            message: "Question deleted successfully"
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const getallquestions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const total = await question.countDocuments();
        const doc = await question.find().sort({ qno: 1 }).skip(skip).limit(limit);

        return res.status(200).send({
            status: true,
            message: "Questions data sent successfully",
            doc,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const bulkimport = async (req, res) => {
    try {
        const { questions: questionsList } = req.body;
        if (!Array.isArray(questionsList)) {
            return res.status(400).send({ status: false, message: "Invalid format. Expected array of questions." });
        }

        let inserted = 0;
        let skipped = 0;
        let errors = [];

        for (const q of questionsList) {
            try {
                const existing = await question.findOne({ qno: q.qno });
                if (existing) {
                    skipped++;
                    errors.push(`Question #${q.qno} already exists, skipped.`);
                } else {
                    await question.create(q);
                    inserted++;
                }
            } catch (err) {
                skipped++;
                errors.push(`Error inserting #${q.qno}: ${err.message}`);
            }
        }

        return res.status(200).send({
            status: true,
            message: `Bulk import completed.`,
            inserted,
            skipped,
            errors
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

// ─── Stats & Dashboard ─────────────────────────────────────────────────────────

const getstats = async (req, res) => {
    try {
        const [totalQuestions, easy, medium, hard] = await Promise.all([
            question.countDocuments(),
            question.countDocuments({ qdifficulty: "Easy" }),
            question.countDocuments({ qdifficulty: "Medium" }),
            question.countDocuments({ qdifficulty: "Hard" }),
        ]);

        const [totalUsers, admins, recentUsers] = await Promise.all([
            user.countDocuments(),
            user.countDocuments({ role: "admin" }),
            user.find().sort({ createdAt: -1 }).limit(5).select("firstname lastname username email role createdAt")
        ]);

        // Weekly growth calc
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newThisWeek = await user.countDocuments({ createdAt: { $gte: weekAgo } });

        return res.status(200).send({
            status: true,
            message: "Stats data sent successfully",
            stats: {
                questions: { total: totalQuestions, easy, medium, hard },
                users: { total: totalUsers, newThisWeek, admins },
                recentUsers
            }
        });
    } catch (error) {
        console.error("getstats error:", error);
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

// ─── User Management ───────────────────────────────────────────────────────────

const viewusers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const total = await user.countDocuments();
        const usersList = await user.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("firstname lastname username email role createdAt");

        return res.status(200).send({
            status: true,
            message: "Users data fetched successfully",
            users: usersList,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const deleteuser = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await user.findByIdAndDelete(id);
        if (!doc) return res.status(404).send({ status: false, message: "User not found" });

        return res.status(200).send({
            status: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

const updateuserrole = async (req, res) => {
    try {
        const { id } = req.params;

        // Security: Prevent self-role modification
        if (req.user.id === id) {
            return res.status(400).send({
                status: false,
                message: "You cannot change your own role. This prevents accidental administrator lockout."
            });
        }

        const usr = await user.findById(id);
        if (!usr) return res.status(404).send({ status: false, message: "User not found" });

        // Toggle role
        usr.role = usr.role === "admin" ? "user" : "admin";
        await usr.save();

        return res.status(200).send({
            status: true,
            message: `User role updated successfully to ${usr.role}`
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error" });
    }
};

module.exports = {
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
};