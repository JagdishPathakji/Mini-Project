import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AIAssistant({ question, code, language }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0 && question) {
            setMessages([
                {
                    role: "assistant",
                    content: `Hello! I'm your AI assistant on NexInterview for the problem "${question.qheading}". How can I help you today?`
                }
            ]);
        }
    }, [question]);

    async function handleSendMessage(e) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Construct System Prompt
            const systemPrompt = `You are an expert coding assistant on the NexInterview platform.
            You are assisting a user with the problem: "${question.qheading}".
            
            Problem Description:
            ${question.qdescription}

            Constraints:
            ${question.qconstraints || "Standard constraints apply."}

            User's Current Context:
            - Language: ${language}
            - Code: 
            \`\`\`${language}
            ${code}
            \`\`\`

            Instructions:
            1. You must ONLY answer questions related to this specific problem or the user's current code. 
            2. If the user asks about anything unrelated to NexInterview or this problem, politely refuse and steer them back.
            3. CRITICAL: NEVER provide a complete working solution or full code block that solves the entire problem. Your goal is to guide the user, explain concepts, give hints, or help debug their current code snippets.
            4. Be concise and professional.
            5. Use markdown for all code snippets, tables, and formatting. Ensure you provide structured information.

            Most Important : Never Provide Complete Solution for the problem
            `;

            const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content })); // Last 10 context

            // Calling backend proxy instead of direct Ollama
            const response = await fetch("http://localhost:3000/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: history.concat(userMessage),
                    systemPrompt: systemPrompt
                }),
            });

            if (!response.ok) {
                throw new Error("Backend proxy request failed");
            }

            // Reader for streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Add placeholder for AI response
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            let fullResponse = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;

                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    lastMsg.content = fullResponse;
                    return newMessages;
                });
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to get response from AI");
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-neutral-950 text-white relative overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`flex max-w-[95%] sm:max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-neutral-800 text-white rounded-br-none"
                                : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none"
                                }`}
                        >
                            {/* Icon for AI */}
                            {msg.role === "assistant" && (
                                <div className="mr-3 mt-1 flex-shrink-0">
                                    <Bot size={18} className="text-green-500" />
                                </div>
                            )}

                            <div className="prose prose-invert prose-sm max-w-none break-words overflow-x-auto w-full">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            return (
                                                <code className={`${className} bg-black/50 px-1 py-0.5 rounded text-green-400 font-mono text-xs`} {...props}>
                                                    {children}
                                                </code>
                                            )
                                        },
                                        pre({ node, children, ...props }) {
                                            return (
                                                <pre className="bg-black/50 p-3 rounded-lg border border-neutral-800 my-2 overflow-x-auto" {...props}>
                                                    {children}
                                                </pre>
                                            )
                                        },
                                        table({ node, children, ...props }) {
                                            return (
                                                <div className="overflow-x-auto my-4 rounded-lg border border-neutral-800">
                                                    <table className="min-w-full divide-y divide-neutral-800 bg-black/30 text-xs" {...props}>
                                                        {children}
                                                    </table>
                                                </div>
                                            )
                                        },
                                        thead({ node, children, ...props }) {
                                            return <thead className="bg-neutral-900/50" {...props}>{children}</thead>
                                        },
                                        th({ node, children, ...props }) {
                                            return <th className="px-4 py-2 text-left font-bold text-neutral-400 border-b border-neutral-800" {...props}>{children}</th>
                                        },
                                        td({ node, children, ...props }) {
                                            return <td className="px-4 py-2 border-b border-neutral-800/50" {...props}>{children}</td>
                                        },
                                        strong({ node, children, ...props }) {
                                            return <strong className="text-white font-bold" {...props}>{children}</strong>
                                        },
                                        ul({ node, children, ...props }) {
                                            return <ul className="list-disc list-outside ml-4 space-y-1 my-2" {...props}>{children}</ul>
                                        },
                                        ol({ node, children, ...props }) {
                                            return <ol className="list-decimal list-outside ml-4 space-y-1 my-2" {...props}>{children}</ol>
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                            <Bot size={16} className="text-green-500" />
                            <Loader2 size={16} className="animate-spin text-neutral-500" />
                            <span className="text-xs text-neutral-500">Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 w-full bg-neutral-950/80 backdrop-blur-md border-t border-neutral-800 p-4">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this problem..."
                        className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-xl pl-5 pr-12 py-3 focus:outline-none focus:border-green-500/50 transition-all placeholder-neutral-500 shadow-lg"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-2 bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}