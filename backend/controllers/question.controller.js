const submission = require("../database/models/submission")
const jwt = require("jsonwebtoken")
const validator = require("validator")
const user = require("../database/models/user")
const question = require("../database/models/question")


const questionsubmiited = async (req, res) => {

    try {

        console.log(process.env.JWT_SECRET_KEY)
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        const code = req.body.code;
        const language = req.body.language;
        const requiredFields = ["code", "language"]

        if (!code)
            return res.status(400).send({ status: false, message: "Source code not provided" })

        if (!language)
            return res.status(400).send({ status: false, message: "Source code language not provided" })

        // code submission logic


        return res.status(200).send({
            status: true,
            message: "Question solved successfully"
        })
    }
    catch (error) {
        return res.status(500).send({
            status: false,
            message: `Internal server error ${error}`
        })
    }

}


const fetchquestion = async (req, res) => {

    try {

        // const token = req.cookies.token
        // if (!token)
        // return res.status(401).send({ status: "login", message: "Unauthorized: Token not found, Please Login again" });

        const qno = Number(req.query.qno);
        const doc = await question.findOne({ qno: qno }, { qinput_output: 0 })

        if (!doc) {
            return res.status(404).send({
                status: false,
                message: "Question not found"
            });
        }

        return res.status(200).send({
            doc,
            status: true
        })

    }
    catch (err) {
        return res.status(500).send({
            status: false,
            message: `Internal server error ${err}`
        })
    }

}

const fetchallquestion = async (req, res) => {

    try {

        // const token = req.cookies.token
        // if (!token)
        // return res.status(401).send({ status: "login", message: "Unauthorized: Token not found, Please Login again" });

        const windowno = Number(req.query.windowno) || 1;

        const start = 1 + (windowno - 1) * 10;
        const end = start + 9;

        const doc = await question.find(
            { qno: { $gte: start, $lte: end } },
            { _id: 1, qno: 1, qheading: 1, qdifficulty: 1, qtags: 1 }
        ).sort({ qno: 1 });

        return res.status(200).json({
            status: true,
            doc
        })

    }
    catch (err) {
        return res.status(500).json({
            status: false,
            message: `Internal server error ${err}`
        })
    }

}



module.exports = {
    questionsubmiited,
    fetchquestion,
    fetchallquestion
}