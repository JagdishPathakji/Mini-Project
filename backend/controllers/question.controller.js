const submission = require("../database/models/submission")
const jwt = require("jsonwebtoken")
const validator = require("validator")
const user = require("../database/models/user")
const question = require("../database/models/question")
const axios = require("axios");
const encode = require("./encode");

const JUDGE0_URL = "http://127.0.0.1:2358";

const questionsubmiited = async (req, res) => {

    try {

        // console.log(process.env.JWT_SECRET_KEY)
        // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        const code = req.body.code;
        const language = req.body.language;

        console.log(code)
        console.log(language)

        if (!code)
            return res.status(400).send({ status: false, message: "Source code not provided" })

        if (!language)
            return res.status(400).send({ status: false, message: "Source code language not provided" })

        const languageMap = {
            "python": 71,
            "cpp": 52,
            "java": 62,
            "javascript": 63
        };

        const languageId = languageMap[language];
        if (!languageId) {
            return res.status(400).json({ status: false, message: "Unsupported language" });
        }

        const testcase = {
            input: "[1,2,3,4,5]",
            output: "15"
        }

        const encodedCode = encode(code);
        const encodedInput = encode(testcase.input)
        const encodedOutput = encode(testcase.output)


        const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
            language_id: languageId,
            source_code: encodedCode,
            stdin: encodedInput,
            expected_output: encodedOutput
        });

        const result = response.data;
        console.log("Status:", result);

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


const fetchrandom = async (req, res) => {
    try {
        const difficulty = req.query.difficulty || "Easy";

        // MongoDB aggregate to get 3 random questions of specific difficulty
        const docs = await question.aggregate([
            { $match: { qdifficulty: difficulty } },
            { $sample: { size: 3 } },
            { $project: { _id: 1, qno: 1, qheading: 1, qdifficulty: 1, qdescription: 1, qtags: 1, qstartcode: 1 } }
        ]);

        if (!docs || docs.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No questions found for the selected difficulty"
            });
        }

        return res.status(200).json({
            status: true,
            doc: docs
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: `Internal server error ${err}`
        });
    }
}


module.exports = {
    questionsubmiited,
    fetchquestion,
    fetchallquestion,
    fetchrandom
}