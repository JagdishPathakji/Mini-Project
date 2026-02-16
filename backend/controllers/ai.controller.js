const { Ollama } = require("ollama");

const aiController = {
    chatWithAI: async (req, res) => {
        const { messages, systemPrompt, model } = req.body;

        if (!messages || !systemPrompt) {
            return res.status(400).json({ status: false, message: "Missing messages or systemPrompt" });
        }

        try {
            const ollama = new Ollama({
                host: "https://ollama.com",
                headers: {
                    Authorization: "Bearer 31dbc890aff540ac8fe835a4bdf7853b.Y7yR3jLgZ5CQu5WlqQOanCp0",
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

            // Set headers for SSE (Server-Sent Events) style streaming
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            for await (const part of response) {
                res.write(part.message.content);
            }

            res.end();
        } catch (error) {
            console.error("AI Controller Error:", error);
            if (!res.headersSent) {
                res.status(500).json({ status: false, message: "Internal Server Error during AI chat" });
            } else {
                res.end();
            }
        }
    }
};

module.exports = aiController;
