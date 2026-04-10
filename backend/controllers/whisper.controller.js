const Groq = require("groq-sdk");
const { Ollama } = require("ollama");
const fs = require("fs");

// ── Helper: Get Groq client for Whisper ─────────────────────────────
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    return new Groq({ apiKey });
};

// ── Helper: Get Ollama client for AI evaluation ─────────────────────
const getOllamaClient = () => {
    const api_key = process.env.OLLAMA_API_KEY || "";
    const host = process.env.OLLAMA_HOST || "https://ollama.com";
    return new Ollama({
        host,
        headers: { Authorization: `Bearer ${api_key}` },
    });
};

// ── Helper: Call Ollama and collect full response ───────────────────
const callOllamaChat = async (systemPrompt, userMessage, model) => {
    const ollama = getOllamaClient();
    const response = await ollama.chat({
        model: model || "gpt-oss:120b-cloud",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        stream: false,
    });
    return response.message.content;
};

// ── Helper: Build interview system prompt ───────────────────────────
const buildInterviewSystemPrompt = (role, experienceLevel, jd) => {
    if (jd && jd.trim().length > 0) {
        return `You are an expert technical interviewer conducting a live mock interview. You must stay in character at all times.

CANDIDATE PROFILE:
- Role: ${role}
- Experience Level: ${experienceLevel}
- Job Description: ${jd}

INSTRUCTIONS:
1. Ask questions STRICTLY based on the skills and requirements mentioned in the Job Description.
2. Prioritize real-world, scenario-based, and practical questions over theoretical ones.
3. Extract key skills from the JD and ask questions targeting those specific skills.
4. Adapt question difficulty based on the candidate's experience level.
5. For each answer evaluation, you MUST respond in EXACTLY this JSON format and NOTHING else:

{
  "score": <number 0-10>,
  "feedback": "<clear, actionable feedback on the answer>",
  "improvedAnswer": "<a better or more complete version of the answer>",
  "nextQuestion": "<the next interview question>",
  "skillTag": "<the specific skill this question tests, e.g. React, Node.js, SQL>"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation text outside the JSON.`;
    }

    return `You are an expert technical interviewer conducting a live mock interview. You must stay in character at all times.

CANDIDATE PROFILE:
- Role: ${role}
- Experience Level: ${experienceLevel}

INSTRUCTIONS:
1. Ask standard technical interview questions appropriate for the role.
2. Cover core topics: DSA, OOP, DBMS, OS, System Design, and role-specific technologies.
3. Mix theoretical questions with practical/scenario-based ones.
4. Adapt question difficulty based on the candidate's experience level.
5. For each answer evaluation, you MUST respond in EXACTLY this JSON format and NOTHING else:

{
  "score": <number 0-10>,
  "feedback": "<clear, actionable feedback on the answer>",
  "improvedAnswer": "<a better or more complete version of the answer>",
  "nextQuestion": "<the next interview question>",
  "skillTag": "<the specific skill this question tests, e.g. React, Node.js, SQL>"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation text outside the JSON.`;
};

// ════════════════════════════════════════════════════════════════════
//  POST /user/interview/transcribe
//  Accepts audio file → sends to Groq Whisper → returns text
// ════════════════════════════════════════════════════════════════════
const transcribe = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: false, message: "No audio file provided" });
        }

        console.log("Transcribing audio file:", req.file.path, "Size:", req.file.size, "Mime:", req.file.mimetype);

        const groq = getGroqClient();

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3-turbo",
            prompt: "This is a technical interview answer. The speaker is answering questions about programming, software engineering, data structures, algorithms, React, Node.js, Python, JavaScript, SQL, databases, system design, and other technical topics.",
            response_format: "json",
            language: "en",
            temperature: 0.0,
        });

        console.log("Transcription result:", transcription.text);

        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting temp audio file:", err);
        });

        const text = transcription.text || "";

        if (!text.trim()) {
            return res.status(200).json({
                status: true,
                text: "(no speech detected)",
            });
        }

        return res.status(200).json({
            status: true,
            text: text.trim(),
        });
    } catch (error) {
        console.error("Groq Whisper Transcription Error:", error.message);

        // Clean up file on error too
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => { });
        }

        return res.status(500).json({
            status: false,
            message: "Failed to transcribe audio",
            error: error.message,
        });
    }
};

// ════════════════════════════════════════════════════════════════════
//  POST /user/interview/start
//  Generates the first interview question
//  Body: { role, experienceLevel, jd? }
// ════════════════════════════════════════════════════════════════════
const startInterview = async (req, res) => {
    const { role, experienceLevel, jd } = req.body;

    if (!role || !experienceLevel) {
        return res.status(400).json({ status: false, message: "Role and experience level are required" });
    }

    try {
        const systemPrompt = buildInterviewSystemPrompt(role, experienceLevel, jd);

        let userMessage;
        if (jd && jd.trim().length > 0) {
            userMessage = `Start the interview. Analyze the Job Description and generate the first question based on the most important skill mentioned. Return ONLY valid JSON with this format:
{
  "nextQuestion": "<your first interview question>",
  "skillTag": "<the skill being tested>",
  "extractedSkills": ["<skill1>", "<skill2>", "<skill3>", "..."]
}`;
        } else {
            userMessage = `Start the interview. Generate the first question appropriate for a ${experienceLevel} ${role}. Return ONLY valid JSON with this format:
{
  "nextQuestion": "<your first interview question>",
  "skillTag": "<the skill being tested>",
  "extractedSkills": []
}`;
        }

        const rawResponse = await callOllamaChat(systemPrompt, userMessage);

        // Parse JSON from response (handle potential markdown code blocks)
        let parsed;
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResponse);
        } catch (parseErr) {
            console.error("Failed to parse AI start response:", rawResponse);
            parsed = {
                nextQuestion: `Tell me about your experience as a ${role} and what excites you about this role.`,
                skillTag: "General",
                extractedSkills: [],
            };
        }

        return res.status(200).json({
            status: true,
            question: parsed.nextQuestion,
            skillTag: parsed.skillTag || "General",
            extractedSkills: parsed.extractedSkills || [],
        });
    } catch (error) {
        console.error("Start Interview Error:", error.message);
        return res.status(500).json({
            status: false,
            message: "Failed to start interview",
            error: error.message,
        });
    }
};

// ════════════════════════════════════════════════════════════════════
//  POST /user/interview/evaluate
//  Evaluates answer and generates next question
//  Body: { question, userAnswer, role, experienceLevel, jd?,
//          conversationHistory? }
// ════════════════════════════════════════════════════════════════════
const evaluate = async (req, res) => {
    const { question, userAnswer, role, experienceLevel, jd, conversationHistory } = req.body;

    if (!question || !userAnswer || !role) {
        return res.status(400).json({
            status: false,
            message: "Question, userAnswer, and role are required",
        });
    }

    try {
        const systemPrompt = buildInterviewSystemPrompt(role, experienceLevel, jd);

        // Build context from conversation history
        let context = "";
        if (conversationHistory && conversationHistory.length > 0) {
            context = "Previous Q&A in this interview:\n";
            conversationHistory.forEach((item, i) => {
                context += `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}\n\n`;
            });
            context += "---\n\n";
        }

        const userMessage = `${context}Current Question: "${question}"
Candidate's Answer: "${userAnswer}"

Evaluate the answer and generate the next question. Do NOT repeat any previously asked question. Return ONLY valid JSON in this exact format:
{
  "score": <number 0-10>,
  "feedback": "<clear, actionable feedback>",
  "improvedAnswer": "<a better or more complete version of the answer>",
  "nextQuestion": "<the next interview question>",
  "skillTag": "<the specific skill the NEXT question tests>"
}`;

        const rawResponse = await callOllamaChat(systemPrompt, userMessage);

        // Parse JSON from response
        let parsed;
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResponse);
        } catch (parseErr) {
            console.error("Failed to parse AI evaluate response:", rawResponse);
            parsed = {
                score: 5,
                feedback: "Your answer covered some key points. Try to provide more specific examples.",
                improvedAnswer: "A more detailed answer would include specific technologies, metrics, and outcomes.",
                nextQuestion: "Can you describe a challenging problem you solved recently?",
                skillTag: "Problem Solving",
            };
        }

        return res.status(200).json({
            status: true,
            score: parsed.score ?? 5,
            feedback: parsed.feedback || "Good attempt.",
            improvedAnswer: parsed.improvedAnswer || "",
            nextQuestion: parsed.nextQuestion || "Tell me more about your experience.",
            skillTag: parsed.skillTag || "General",
        });
    } catch (error) {
        console.error("Evaluate Error:", error.message);
        return res.status(500).json({
            status: false,
            message: "Failed to evaluate answer",
            error: error.message,
        });
    }
};

module.exports = {
    transcribe,
    startInterview,
    evaluate,
};
