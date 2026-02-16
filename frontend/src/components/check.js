const { Ollama } = await import("ollama");
const apikey = "31dbc890aff540ac8fe835a4bdf7853b.Y7yR3jLgZ5CQu5WlqQOanCp0"
const ollama = new Ollama({
    host: "https://ollama.com",
    headers: {
        Authorization: "Bearer " + apikey,
    },
});

const response = await ollama.chat({
    model: "gpt-oss:120b-cloud",
    messages: [
        {
            role: "system",
            content: `You are an Code Assistant`
        },
        {
            role: "user",
            content: `Hello How are you ?`
        }
    ],
    stream: true
})

for await (const part of response) {
    console.log(part.message.content)
}