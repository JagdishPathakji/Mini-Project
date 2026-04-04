const submission = require("../database/models/submission")
const jwt = require("jsonwebtoken")
const validator = require("validator")
const user = require("../database/models/user")
const question = require("../database/models/question")
const axios = require("axios");
const encode = require("./encode");
const submissionlist = require("../database/models/submissionlist");

const JUDGE0_URL = "http://127.0.0.1:2358";

async function saveSubmission(req, qno, code, language, status, time, memory) {
    try {
        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                userId = decoded.id || decoded._id;
            } catch (e) {}
        }
        if (!userId) return; // Cannot save without authenticated user

        let statusMapped = "runtime error";
        const sLower = status.toLowerCase();
        if (sLower.includes("accepted")) statusMapped = "accepted";
        else if (sLower.includes("wrong answer")) statusMapped = "wrong answer";
        else if (sLower.includes("time limit")) statusMapped = "tle";

        const newSubList = await submissionlist.create({
            code,
            language,
            status: statusMapped,
            tc: time ? time.toString() : "0",
            sc: memory ? memory.toString() : "0"
        });

        const qDoc = await question.findOne({ qno: Number(qno) });
        if (!qDoc) return;

        let subDoc = await submission.findOne({ user: userId, question: qDoc._id });
        if (!subDoc) {
            await submission.create({
                user: userId,
                question: qDoc._id,
                submissionlist: [newSubList._id]
            });
        } else {
            subDoc.submissionlist.push(newSubList._id);
            await subDoc.save();
        }
    } catch (e) {
        console.error("Failed to save submission history:", e);
    }
}

const questionsubmiited = async (req, res) => {

    try {

        // console.log(process.env.JWT_SECRET_KEY)
        // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        const code = req.body.code;
        const language = req.body.language;

        console.log(code)
        console.log(language)

        const qno = req.body.qno;

        if (!code)
            return res.status(400).send({ status: false, message: "Source code not provided" })

        if (!language)
            return res.status(400).send({ status: false, message: "Source code language not provided" })

        if (!qno)
            return res.status(400).send({ status: false, message: "Question number not provided" })

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

        const doc = await question.findOne({ qno: Number(qno) });
        if (!doc) {
            return res.status(404).send({ status: false, message: "Question not found" });
        }

        const testcases = doc.qinput_output;
        if (!testcases || testcases.length === 0) {
            return res.status(400).send({ status: false, message: "No test cases found for this question" });
        }

        const encodedCode = encode(code);

        let maxTime = 0;
        let maxMemory = 0;

        // Initiate SSE Stream
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const CONCURRENCY_LIMIT = 12;

        for (let i = 0; i < testcases.length; i += CONCURRENCY_LIMIT) {
            const chunk = testcases.slice(i, i + CONCURRENCY_LIMIT);

            const promises = chunk.map(async (testcase, indexInChunk) => {
                const globalIndex = i + indexInChunk;
                
                // Yield running status
                res.write(`data: ${JSON.stringify({
                    stage: "running",
                    testcase: globalIndex + 1,
                    total: testcases.length
                })}\n\n`);

                const encodedInput = encode(testcase.input || "");
                const encodedOutput = encode(testcase.output || "");

                const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
                    language_id: languageId,
                    source_code: encodedCode,
                    stdin: encodedInput,
                    expected_output: encodedOutput
                });

                const result = response.data;
                console.log(`Testcase ${globalIndex + 1} status:`, result.status);

                if (result.status && result.status.id !== 3) {
                    const failPayload = { globalIndex, result, testcase };
                    throw new Error(`TESTCASE_FAIL:${JSON.stringify(failPayload)}`);
                }

                // Yield pass status
                res.write(`data: ${JSON.stringify({
                    stage: "passed",
                    testcase: globalIndex + 1,
                    time: result.time,
                    memory: result.memory
                })}\n\n`);

                return { time: result.time, memory: result.memory };
            });

            try {
                const chunkResults = await Promise.all(promises);
                for (let cr of chunkResults) {
                    if (cr.time) maxTime = Math.max(maxTime, parseFloat(cr.time));
                    if (cr.memory) maxMemory = Math.max(maxMemory, parseFloat(cr.memory));
                }
            } catch (err) {
                if (err.message && err.message.startsWith("TESTCASE_FAIL:")) {
                    const failedData = JSON.parse(err.message.substring(14));
                    const statusStr = failedData.result.status.description;
                    await saveSubmission(req, qno, code, language, statusStr, failedData.result.time, failedData.result.memory);

                    res.write(`data: ${JSON.stringify({
                        status: false,
                        stage: "completed",
                        message: `Testcase ${failedData.globalIndex + 1} failed: ${failedData.result.status.description}`,
                        details: failedData.result,
                        failed_testcase: {
                            input: failedData.testcase.input,
                            expected_output: failedData.testcase.output
                        }
                    })}\n\n`);
                    return res.end();
                } else {
                    throw err; // Re-throw network or structural errors
                }
            }
        }

        await saveSubmission(req, qno, code, language, "accepted", maxTime.toFixed(3), maxMemory);

        res.write(`data: ${JSON.stringify({
            status: true,
            stage: "completed",
            message: "All test cases passed successfully",
            total_testcases: testcases.length,
            details: {
                time: maxTime.toFixed(3),
                memory: maxMemory
            }
        })}\n\n`);
        return res.end();
    }
    catch (error) {
        if (!res.headersSent) {
            return res.status(500).send({
                status: false,
                message: `Internal server error ${error}`
            });
        } else {
            res.write(`data: ${JSON.stringify({
                status: false,
                stage: "completed",
                message: `Internal server error: ${error.message}`
            })}\n\n`);
            return res.end();
        }
    }

}


const fetchquestion = async (req, res) => {

    try {

        // const token = req.cookies.token
        // if (!token)
        // return res.status(401).send({ status: "login", message: "Unauthorized: Token not found, Please Login again" });

        const qno = Number(req.query.qno);
        const doc = await question.findOne({ qno: qno }, { qinput_output: { $slice: 3 } }).lean();

        if (!doc) {
            return res.status(404).send({
                status: false,
                message: "Question not found"
            });
        }

        doc.sampleTestcases = doc.qinput_output || [];
        delete doc.qinput_output;

        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                userId = decoded.id || decoded._id;
            } catch (e) {}
        }

        doc.isSolved = false;
        if (userId) {
            const userSubmissions = await submission.findOne({ user: userId, question: doc._id })
                .populate({
                    path: 'submissionlist',
                    match: { status: 'accepted' },
                    select: 'status'
                }).lean();
            if (userSubmissions && userSubmissions.submissionlist && userSubmissions.submissionlist.length > 0) {
                doc.isSolved = true;
            }
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
        const limit = 10;
        const skip = (windowno - 1) * limit;

        const docs = await question.find(
            {},
            { _id: 1, qno: 1, qheading: 1, qdifficulty: 1, qtags: 1 }
        )
        .sort({ qno: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                userId = decoded.id || decoded._id;
            } catch (e) {}
        }

        if (userId && docs.length > 0) {
            const docIds = docs.map(d => d._id);
            const userSubmissions = await submission.find({ user: userId, question: { $in: docIds } })
                .populate({
                    path: 'submissionlist',
                    match: { status: 'accepted' },
                    select: 'status'
                }).lean();
            
            const solvedMap = {};
            for (let sub of userSubmissions) {
                if (sub.submissionlist && sub.submissionlist.length > 0) {
                    solvedMap[sub.question.toString()] = true;
                }
            }

            for (let d of docs) {
                d.isSolved = !!solvedMap[d._id.toString()];
            }
        }

        const total = await question.countDocuments({});

        return res.status(200).json({
            status: true,
            doc: docs,
            total
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


const runcode = async (req, res) => {
    try {
        const { code, language, testcases } = req.body;

        if (!code) return res.status(400).send({ status: false, message: "Source code not provided" });
        if (!language) return res.status(400).send({ status: false, message: "Source code language not provided" });
        if (!testcases || testcases.length === 0) return res.status(400).send({ status: false, message: "No testcases provided" });

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

        const encodedCode = encode(code);

        const promises = testcases.map(async (testcase, index) => {
            const encodedInput = encode(testcase.input || "");
            const encodedOutput = encode(testcase.output || "");

            const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
                language_id: languageId,
                source_code: encodedCode,
                stdin: encodedInput,
                expected_output: encodedOutput
            });

            return {
                id: index + 1,
                input: testcase.input,
                expected_output: testcase.output,
                result: response.data
            };
        });

        const results = await Promise.all(promises);
        
        return res.status(200).json({
            status: true,
            results
        });

    } catch (error) {
        return res.status(500).send({
            status: false,
            message: `Internal server error ${error}`
        });
    }
}

const interviewsubmit = async (req, res) => {
    try {
        const { code, language, qno } = req.body;
        if (!code || !language || !qno) return res.status(400).send({ status: false, message: "Missing params" });

        const languageMap = { "python": 71, "cpp": 52, "java": 62, "javascript": 63 };
        const languageId = languageMap[language];
        if (!languageId) return res.status(400).json({ status: false, message: "Unsupported language" });

        const doc = await question.findOne({ qno: Number(qno) });
        if (!doc || !doc.qinput_output) return res.status(404).send({ status: false, message: "Question not found" });

        const testcases = doc.qinput_output;
        const encodedCode = encode(code);

        let maxTime = 0;
        let maxMemory = 0;

        // Initiate SSE Stream
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const CONCURRENCY_LIMIT = 12;

        for (let i = 0; i < testcases.length; i += CONCURRENCY_LIMIT) {
            const chunk = testcases.slice(i, i + CONCURRENCY_LIMIT);

            const promises = chunk.map(async (testcase, indexInChunk) => {
                const globalIndex = i + indexInChunk;
                
                // Yield running status
                res.write(`data: ${JSON.stringify({
                    stage: "running",
                    testcase: globalIndex + 1,
                    total: testcases.length
                })}\n\n`);

                const encodedInput = encode(testcase.input || "");
                const encodedOutput = encode(testcase.output || "");

                const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
                    language_id: languageId,
                    source_code: encodedCode,
                    stdin: encodedInput,
                    expected_output: encodedOutput
                });

                const result = response.data;

                if (result.status && result.status.id !== 3) {
                    const failPayload = { globalIndex, result, testcase };
                    throw new Error(`TESTCASE_FAIL:${JSON.stringify(failPayload)}`);
                }

                // Yield pass status
                res.write(`data: ${JSON.stringify({
                    stage: "passed",
                    testcase: globalIndex + 1,
                    time: result.time,
                    memory: result.memory
                })}\n\n`);

                return { time: result.time, memory: result.memory };
            });

            try {
                const chunkResults = await Promise.all(promises);
                for (let cr of chunkResults) {
                    if (cr.time) maxTime = Math.max(maxTime, parseFloat(cr.time));
                    if (cr.memory) maxMemory = Math.max(maxMemory, parseFloat(cr.memory));
                }
            } catch (err) {
                if (err.message && err.message.startsWith("TESTCASE_FAIL:")) {
                    const failedData = JSON.parse(err.message.substring(14));
                    
                    res.write(`data: ${JSON.stringify({
                        status: false,
                        stage: "completed",
                        message: `Testcase ${failedData.globalIndex + 1} failed: ${failedData.result.status.description}`,
                        details: failedData.result,
                        failed_testcase: {
                            input: failedData.testcase.input,
                            expected_output: failedData.testcase.output
                        }
                    })}\n\n`);
                    return res.end();
                } else {
                    throw err; // Re-throw network or structural errors
                }
            }
        }

        res.write(`data: ${JSON.stringify({
            status: true,
            stage: "completed",
            message: "All test cases passed successfully",
            total_testcases: testcases.length,
            details: {
                time: maxTime.toFixed(3),
                memory: maxMemory
            }
        })}\n\n`);
        return res.end();

    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
}


const fetchsubmissionshistory = async (req, res) => {
    try {
        const qno = Number(req.query.qno);
        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
                userId = decoded.id || decoded._id;
            } catch (e) {}
        }

        if (!userId) return res.status(200).json({ status: true, history: [] });

        const qDoc = await question.findOne({ qno });
        if (!qDoc) return res.status(404).json({ status: false, message: "Question not found" });

        const subDoc = await submission.findOne({ user: userId, question: qDoc._id })
            .populate({
                path: 'submissionlist',
                options: { sort: { createdAt: -1 } }
            });

        if (!subDoc) return res.status(200).json({ status: true, history: [] });

        return res.status(200).json({ status: true, history: subDoc.submissionlist });
    } catch (error) {
        return res.status(500).json({ status: false, message: `Internal server error ${error}` });
    }
}

module.exports = {
    questionsubmiited,
    fetchquestion,
    fetchallquestion,
    fetchrandom,
    runcode,
    fetchsubmissionshistory,
    interviewsubmit
}