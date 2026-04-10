const { Ollama } = require("ollama");

const aiController = async (req, res) => {
    const { messages, systemPrompt, model } = req.body;

    if (!messages || !systemPrompt) {
        return res.status(400).json({ status: false, message: "Missing messages or systemPrompt" });
    }

    try {
        const api_key = process.env.OLLAMA_API_KEY || "31dbc890aff540ac8fe835a4bdf7853b.Y7yR3jLgZ5CQu5WlqQOanCp0";
        const host = process.env.OLLAMA_HOST || "https://ollama.com";

        const ollama = new Ollama({
            host: host,
            headers: {
                Authorization: `Bearer ${api_key}`,
            },
        });

        const response = await ollama.chat({
            model: model || "gpt-oss:120b-cloud",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            stream: true
        });

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const part of response) {
            if (part?.message?.content) {
                res.write(part.message.content);
            }
        }

        res.end();
    }
    catch (error) {
        console.error("AI Controller Error Details:", {
            message: error.message,
            stack: error.stack,
            host: process.env.OLLAMA_HOST || "https://ollama.com",
            model: model || "gpt-oss:120b-cloud"
        });
        if (!res.headersSent) {
            res.status(500).json({ status: false, message: "Internal Server Error during AI chat", error: error.message });
        }
        else {
            res.end();
        }
    }
}

const voiceinterview = async (req, res) => {
    try {
        const { messages, model } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).send({
                status: false,
                message: "Messages array missing"
            });
        }

        const api_key = process.env.OLLAMA_API_KEY || "31dbc890aff540ac8fe835a4bdf7853b.Y7yR3jLgZ5CQu5WlqQOanCp0";
        const host = process.env.OLLAMA_HOST || "https://ollama.com";

        const ollama = new Ollama({
            host: host,
            headers: {
                Authorization: `Bearer ${api_key}`
            },
        });

        const response = await ollama.chat({
            model: model || "gpt-oss:120b-cloud",
            messages,
            stream: true
        });

        let modified = "";
        for await (const part of response) {
            if (part?.message?.content) {
                modified += part.message.content;
            }
        }

        return res.status(200).send({
            status: true,
            message: modified
        });

    }
    catch (error) {
        console.error("Voice Interview AI Error Details:", {
            message: error.message,
            stack: error.stack,
            host: process.env.OLLAMA_HOST || "https://ollama.com"
        });
        return res.status(500).send({
            status: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    voiceinterview,
    aiController
}