import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2, Sparkles, Trash2, User } from "lucide-react";
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

    // Load messages from localStorage on mount / question change
    useEffect(() => {
        if (!question?.qno) return;
        
        const storageKey = `nex_ai_chat_${question.qno}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch(e) {
                console.error("Failed to parse saved chats");
                initGreeting();
            }
        } else {
            initGreeting();
        }
    }, [question?.qno]);

    const initGreeting = () => {
        setMessages([
            {
                role: "assistant",
                content: `Hello! I'm your AI assistant on NexInterview for the problem **"${question?.qheading}"**. How can I help you today?`
            }
        ]);
    };

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (!question?.qno || messages.length === 0) return;
        const storageKey = `nex_ai_chat_${question.qno}`;
        localStorage.setItem(storageKey, JSON.stringify(messages));
    }, [messages, question?.qno]);

    const clearChat = () => {
        if (!question?.qno) return;
        localStorage.removeItem(`nex_ai_chat_${question.qno}`);
        initGreeting();
        toast.success("Chat history cleared");
    };

    async function handleSendMessage(e) {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Construct System Prompt
            const systemPrompt = `You are a premium, expert coding assistant on the NexInterview platform.
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
            4. Be concise, professional, and highly energetic. Use deep technical tone.
            5. Use markdown for all code snippets, tables, and formatting. Ensure you provide structured information.

            Most Important : Never Provide Complete Solution for the problem
            `;

            const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content })); // Last 10 context

            // Calling backend proxy instead of direct Ollama
            const response = await fetch("http://localhost:3000/user/ai/chat", {
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
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an anomaly while connecting to the core. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-transparent text-white relative overflow-hidden">
            
            {/* Context Header */}
            <div className="flex justify-between items-center px-6 py-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-md z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    <Sparkles size={14} className="animate-pulse" /> NEXA AI CORE
                </div>
                <button 
                    onClick={clearChat} 
                    className="p-2 border border-white/5 bg-white/[0.02] hover:bg-red-500/10 rounded-xl transition-all text-neutral-500 hover:text-red-400 hover:border-red-500/20 shadow-inner group flex items-center gap-2" 
                    title="Clear Chat Session"
                >
                    <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:block">Clear Memory</span>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.role === "assistant" && (
                            <div className="mr-3 flex-shrink-0 mt-1">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(99,102,241,0.4)]">
                                    <Bot size={16} className="text-indigo-400" />
                                </div>
                            </div>
                        )}

                        <div
                            className={`flex max-w-[90%] sm:max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-inner ${msg.role === "user"
                                ? "bg-white/10 border border-white/10 text-white rounded-br-none shadow-[0_5px_20px_-5px_rgba(255,255,255,0.1)]"
                                : "bg-indigo-500/5 border border-indigo-500/20 text-neutral-300 rounded-bl-none shadow-[0_5px_20px_-5px_rgba(99,102,241,0.05)]"
                                }`}
                        >
                            <div className="prose prose-invert prose-sm max-w-none break-words overflow-x-auto w-full">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            return (
                                                <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[12px] border border-white/5`} {...props}>
                                                    {children}
                                                </code>
                                            )
                                        },
                                        pre({ node, children, ...props }) {
                                            return (
                                                <pre className="bg-[#030303] p-4 rounded-xl border border-white/10 my-4 overflow-x-auto shadow-inner text-[13px] font-mono" {...props}>
                                                    {children}
                                                </pre>
                                            )
                                        },
                                        table({ node, children, ...props }) {
                                            return (
                                                <div className="overflow-x-auto my-4 rounded-xl border border-white/10 shadow-inner bg-[#030303]">
                                                    <table className="min-w-full divide-y divide-white/10 text-xs" {...props}>
                                                        {children}
                                                    </table>
                                                </div>
                                            )
                                        },
                                        thead({ node, children, ...props }) {
                                            return <thead className="bg-white/5" {...props}>{children}</thead>
                                        },
                                        th({ node, children, ...props }) {
                                            return <th className="px-4 py-3 text-left font-bold text-white uppercase tracking-wider text-[10px]" {...props}>{children}</th>
                                        },
                                        td({ node, children, ...props }) {
                                            return <td className="px-4 py-3 border-t border-white/5 text-neutral-300" {...props}>{children}</td>
                                        },
                                        strong({ node, children, ...props }) {
                                            return <strong className="text-white font-extrabold" {...props}>{children}</strong>
                                        },
                                        ul({ node, children, ...props }) {
                                            return <ul className="list-disc list-outside ml-4 space-y-2 my-4" {...props}>{children}</ul>
                                        },
                                        ol({ node, children, ...props }) {
                                            return <ol className="list-decimal list-outside ml-4 space-y-2 my-4" {...props}>{children}</ol>
                                        },
                                        a({ node, children, ...props }) {
                                            return <a className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors" {...props}>{children}</a>
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {msg.role === "user" && (
                            <div className="ml-3 flex-shrink-0 mt-1">
                                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                                    <User size={16} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="mr-3 flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(99,102,241,0.4)] animate-pulse">
                                <Bot size={16} className="text-indigo-400" />
                            </div>
                        </div>
                        <div className="bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-3 shadow-inner">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Processing Context...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pt-12 pb-6 px-6 z-20">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-3 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask NEXA about this problem or your code..."
                        className="w-full bg-[#030303] border border-white/10 hover:border-white/20 text-white text-sm rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-indigo-500/50 focus:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)] transition-all placeholder-neutral-600 shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-3 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}