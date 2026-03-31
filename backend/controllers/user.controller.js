const user = require("../database/models/user")
const submission = require("../database/models/submission")
const jwt = require("jsonwebtoken")

const getprofile = async (req, res) => {
    try {
        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                userId = decoded.id || decoded._id;
            } catch (e) {}
        }
        if (!userId) {
            const defaultUser = await user.findOne();
            if (defaultUser) userId = defaultUser._id;
            else return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        const userData = await user.findById(userId).select("-password -__v");
        if (!userData) return res.status(404).json({ status: false, message: "User not found" });

        // Aggregate statistics
        const userSubmissions = await submission.find({ user: userId })
            .populate({
                path: 'submissionlist',
                select: 'status language tc sc createdAt',
                options: { sort: { 'createdAt': -1 } }
            })
            .populate({
                path: 'question',
                select: 'qno qheading qdifficulty'
            })
            .lean();

        let totalAttempted = userSubmissions.length;
        let totalSolved = 0;
        let totalSubmissions = 0;
        let totalAccepted = 0;
        
        let allSubmissionItems = [];

        for (let sub of userSubmissions) {
            let isSolved = false;
            if (sub.submissionlist && sub.submissionlist.length > 0) {
                totalSubmissions += sub.submissionlist.length;
                for (let slist of sub.submissionlist) {
                    slist.question = sub.question;
                    allSubmissionItems.push(slist);
                    if (slist.status && slist.status.toLowerCase() === "accepted") {
                        isSolved = true;
                        totalAccepted++;
                    }
                }
            }
            if (isSolved) totalSolved++;
        }

        allSubmissionItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const recentActivity = allSubmissionItems.slice(0, 15);

        const acceptanceRate = totalSubmissions > 0 
            ? parseFloat(((totalAccepted / totalSubmissions) * 100).toFixed(1))
            : 0;

        return res.status(200).json({
            status: true,
            profile: {
                user: userData,
                stats: {
                    totalAttempted,
                    totalSolved,
                    totalSubmissions,
                    acceptanceRate
                },
                recentActivity
            }
        });

    } catch (e) {
        console.error("Profile error:", e);
        return res.status(500).json({ status: false, message: "Server error fetching profile" });
    }
}


module.exports = {
    getprofile
}