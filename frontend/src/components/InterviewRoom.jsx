import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, Radio, AlertCircle, ShieldAlert, LogOut, Send, Bot, User, CheckCircle2 } from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;
const MAX_VIOLATIONS = 3;

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role = "Software Engineer", difficulty = "Medium", jobDescription = "General description" } = location.state || {};

    const [status, setStatus] = useState("initializing"); // initializing, speaking, listening, processing, terminated
    const [messages, setMessages] = useState([]);
    const [started, setStarted] = useState(false);

    // Proctoring & UI State
    const [violations, setViolations] = useState(0);
    const [violationLog, setViolationLog] = useState([]);
    const [warningModal, setWarningModal] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Speech Refs & State
    const {
        transcript,
        resetTranscript,
        listening,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();
    
    // For manual user input and typing mode fallback
    const [manualInput, setManualInput] = useState("");
    const [showManual, setShowManual] = useState(false);

    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    
    // Smooth scrolling
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, status, transcript, scrollToBottom]);

    const exitInterview = useCallback(() => {
        speechSynthesis.cancel();
        SpeechRecognition.stopListening();
        navigate("/ai-interview");
    }, [navigate]);

    // ─── PROCTORING LOGIC ───────────────────────────────────────────────────────
    const recordViolation = useCallback((reason) => {
        if (status === "terminated" || !started) return;

        const timestamp = new Date().toLocaleTimeString();
        setViolations(prev => {
            const next = prev + 1;
            setViolationLog(log => [...log, { reason, timestamp, count: next }]);

            if (next >= MAX_VIOLATIONS) {
                setStatus("terminated");
                setWarningModal({ reason, count: next, final: true });
                speechSynthesis.cancel();
                SpeechRecognition.stopListening();
            } else {
                setWarningModal({ reason, count: next, final: false });
            }
            return next;
        });
    }, [status, started]);

    useEffect(() => {
        const onFsChange = () => {
            const inFs = !!document.fullscreenElement;
            setIsFullscreen(inFs);
            if (!inFs && status !== "terminated" && started) {
                setShowFullscreenPrompt(true);
                recordViolation("Exited fullscreen mode");
            }
        };
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, [status, started, recordViolation]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden && status !== "terminated" && started) {
                recordViolation("Switched tab/minimized window");
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        const handleBlur = () => {
            if (status !== "terminated" && started) {
                recordViolation("Left the interview window");
            }
        };
        window.addEventListener("blur", handleBlur);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("blur", handleBlur);
        };
    }, [status, started, recordViolation]);

    // ─── INTERVIEW FLOW ENGINE ──────────────────────────────────────────────────

    // Synthesis helper
    const speak = useCallback((text) => {
        if (!text) return;

        speechSynthesis.cancel();
        SpeechRecognition.stopListening(); // Force mic OFF while AI speaks

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        // Optionally select a preferred computer voice here if available

        utterance.onstart = () => {
            setStatus("speaking");
        };
        
        utterance.onend = () => {
            setStatus("listening");
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
        };
        
        utterance.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            setStatus("listening");
            SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
        };

        speechSynthesis.speak(utterance);
    }, [resetTranscript]);

    // Internal API call abstraction
    const callAI = useCallback(async (conversationContext) => {
        setStatus("processing");
        console.log("Calling Voice AI backend with context payload...");
        
        try {
            const res = await fetch(`${BACKEND_URL}`, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: conversationContext })
            });
            const data = await res.json();
            
            if (data.status && data.message) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
                speak(data.message);
            } else {
                throw new Error(data.message || "Failed to process AI response");
            }
        } catch (err) {
            console.error(err);
            setStatus("listening");
            const errorMsg = "I'm having trouble connecting right now. Could you please check your internet and repeat that?";
            setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
            speak(errorMsg);
        }
    }, [speak]);

    // Initialize session flow
    useEffect(() => {
        if (started) return;
        setStarted(true);

        // Core instructions to guide the llm
        const systemPrompt = `You are an expert technical interviewer called NEXA for a ${role} position. The difficulty level is ${difficulty}. Job Description: ${jobDescription}. 
Rules:
1. Speak completely naturally like a human interviewer.
2. Ask ONE verbal question at a time. Do NOT provide multiple questions.
3. Wait for the candidate to answer before moving on.
4. Keep your responses concise and precise. Avoid unnecessary fluff.
5. NEVER use markdown formats, asterisks, or code blocks as this will be read aloud through speech synthesis.
6. The user is now joining the interview. Acknowledge them, verify they are ready, and ask the very first question.`;

        const initMessages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Hi, I have joined the interview room. Let's begin the interview!" }
        ];

        setMessages(initMessages);
        callAI(initMessages);
    }, [started, role, difficulty, jobDescription, callAI]);

    // Handle user submitting answer manually
    const submitUserResponse = useCallback((content) => {
        if (!content || !content.trim()) return;
        
        SpeechRecognition.stopListening();
        resetTranscript();
        
        const finalContent = content.trim();
        const userMsg = { role: "user", content: finalContent };
        
        setMessages(prev => {
            const updated = [...prev, userMsg];
            callAI(updated);
            return updated;
        });
        
        setManualInput("");
        setShowManual(false);
    }, [callAI, resetTranscript]);

    const handleMicSendClick = () => {
        if (transcript.trim()) {
            submitUserResponse(transcript);
        }
    };

    // ─── RENDER HELPERS ─────────────────────────────────────────────────────────
    const phaseLabel = status === "speaking" ? "AI Speaking" :
                       status === "processing" ? "AI Thinking" :
                       status === "initializing" ? "Initializing Session" :
                       (listening ? "Your Turn (Listening)" : "Ready to Input");

    const phaseColorClass = status === "speaking" ? "text-amber-400" :
                            status === "processing" ? "text-blue-400" :
                            "text-emerald-400";
                            
    const phaseBgClass = status === "speaking" ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]" :
                         status === "processing" ? "bg-blue-400 shadow-[0_0_10px_#60a5fa]" :
                         "bg-emerald-400 shadow-[0_0_10px_#34d399]";

    const enterFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        setShowFullscreenPrompt(false);
    };

    // ─── TERMINATED VIEW ───────────────────────────────────────────────────────
    if (status === "terminated") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl text-white">
                <div className="text-center max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="w-24 h-24 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_-15px_rgba(239,68,68,0.5)]">
                        <AlertCircle size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4">Session Terminated</h2>
                    <p className="text-neutral-400 mb-6 font-mono text-sm leading-relaxed bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-left w-full mx-auto">
                        Strike {violations}: {warningModal?.reason}
                    </p>
                    <button onClick={exitInterview} className="px-8 py-4 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-all shadow-2xl">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Filter out system prompt & initial trigger message so the user only sees real messages
    const displayMessages = messages.filter((m, i) => {
        if (m.role === "system") return false;
        if (i === 1 && m.role === "user" && m.content.includes("joined the interview room")) return false;
        return true;
    });

    return (
        <div 
            ref={containerRef} 
            className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden"
            onContextMenu={e => e.preventDefault()}
        >
            <Navbar />

            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />

            <main className="pt-24 pb-12 max-w-7xl mx-auto px-6 relative z-10 flex flex-col h-screen">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Interview Room</h1>
                        <p className="text-neutral-400 text-sm mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live AI-powered Assessment
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]"
                    >
                        <LogOut size={16} />
                        Exit Session
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 bg-[#0a0a0a] rounded-[2rem] border border-white/10 shadow-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                    
                    {/* LEFT COLUMN: Sidebar Info & AI Sphere */}
                    <div className="lg:w-1/3 flex flex-col gap-6 relative z-10 min-h-0">
                        {/* Meta Info */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">Target Role</span>
                                <span className="text-sm font-medium text-white max-w-[60%] truncate text-right">{role}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">Difficulty</span>
                                <span className="text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {difficulty}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">Violations</span>
                                <span className={`text-sm font-bold ${violations > 0 ? "text-orange-400" : "text-white"}`}>
                                    {violations} <span className="text-neutral-500 text-[10px]">/ 3</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-3 pt-1">
                                <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-neutral-500">
                                    <ShieldAlert size={12} /> Proctor Logs
                                </span>
                                <div className="h-28 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                    {violationLog.length === 0 ? (
                                        <p className="text-xs italic text-neutral-600">No violations detected</p>
                                    ) : (
                                        violationLog.map((v, i) => (
                                            <div key={i} className="text-[11px] font-mono p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
                                                {v.reason}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI Core Visualization */}
                        <div className="bg-[#030303] border border-white/10 rounded-2xl flex-1 min-h-[250px] flex flex-col items-center justify-center relative overflow-hidden">
                            <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-2">
                                <Bot size={14} /> AI Interviewer
                            </span>

                            <div className="relative mt-4">
                                {status === "speaking" ? (
                                    <>
                                        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[40px] opacity-40 animate-pulse mix-blend-screen scale-150"></div>
                                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-[30px] opacity-30 animate-[spin_4s_linear_infinite] mix-blend-screen scale-[1.2]"></div>
                                        <div className="w-28 h-28 bg-gradient-to-br from-emerald-300 via-white to-emerald-100 rounded-full shadow-[0_0_60px_#34d399] animate-[pulse_1s_ease-in-out_infinite] border-4 border-white/40 flex items-center justify-center relative z-10 transition-all duration-300 delay-100">
                                            <div className="w-20 h-20 bg-white/50 rounded-full animate-ping opacity-50"></div>
                                        </div>
                                    </>
                                ) : status === "processing" ? (
                                    <>
                                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-30 animate-pulse mix-blend-screen scale-150"></div>
                                        <div className="w-28 h-28 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full shadow-[0_0_40px_#60a5fa] animate-pulse border-4 border-blue-400/50 flex items-center justify-center relative z-10 transition-all duration-300 delay-100">
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-neutral-600 rounded-full blur-[30px] opacity-20 scale-125"></div>
                                        <div className="w-28 h-28 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-full border border-white/10 flex items-center justify-center relative z-10 transition-all duration-700">
                                            <div className={`w-10 h-10 rounded-full blur-md ${listening ? 'bg-emerald-500/30 animate-pulse' : 'bg-neutral-600'}`}></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <p className={`mt-8 font-bold uppercase tracking-[0.2em] text-xs transition-colors duration-500 flex flex-col items-center gap-2 ${phaseColorClass}`}>
                                <span className={`w-2 h-2 rounded-full ${phaseBgClass} animate-pulse`} />
                                {phaseLabel}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Chat Log & Input */}
                    <div className="flex-1 flex flex-col relative z-10 h-full bg-[#030303] border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                        {/* Status Bar */}
                        <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between shadow-sm z-20 shrink-0">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                                <Radio size={14} className="text-emerald-400" /> Live Transcript
                            </span>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                                Mic Access: <span className={!browserSupportsSpeechRecognition ? "text-red-400" : isMicrophoneAvailable ? "text-emerald-400" : "text-amber-400"}>
                                    {!browserSupportsSpeechRecognition ? "N/A" : isMicrophoneAvailable ? "Active" : "Denied"}
                                </span>
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {displayMessages.length === 0 && status === "initializing" && (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-500 opacity-60">
                                    <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                                    Starting interview securely...
                                </div>
                            )}

                            {displayMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className="mt-1 flex-shrink-0">
                                            {msg.role === 'user' ? (
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                    <User size={14} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                    <Bot size={14} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-blue-500/10 border border-blue-500/20 text-white rounded-tr-sm shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]'
                                            : 'bg-white/5 border border-white/10 text-neutral-200 rounded-tl-sm'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Processing Indicator */}
                            {status === "processing" && (
                                <div className="flex justify-start">
                                    <div className="flex gap-3 max-w-[85%]">
                                        <div className="mt-1 flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                <Bot size={14} />
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl text-sm bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-2 text-neutral-400">
                                            <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} className="h-4" />
                        </div>

                        {/* Input Area (Bottom) */}
                        <div className="p-4 border-t border-white/10 bg-white/[0.02] shrink-0">
                            {/* State: Listening/User Turn */}
                            {status === "listening" && !showManual && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse shrink-0 mt-1">
                                            <Mic size={20} />
                                        </div>
                                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 min-h-[64px] shadow-inner relative">
                                            {transcript ? (
                                                <p className="text-white text-sm">{transcript}</p>
                                            ) : (
                                                <p className="text-neutral-500 text-sm italic">Listening to your response...</p>
                                            )}
                                            
                                            <div className="absolute right-2 top-2">
                                                <button 
                                                    onClick={() => setShowManual(true)} 
                                                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 rounded-lg text-[10px] uppercase tracking-wider font-bold text-blue-300 transition-colors shadow-lg"
                                                >
                                                    Use Keyboard Instead
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center w-full pl-16">
                                        <button 
                                            onClick={() => {
                                                if (listening) {
                                                    SpeechRecognition.stopListening();
                                                } else {
                                                    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all border ${listening ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                        >
                                            {listening ? 'Pause Mic' : 'Resume Mic'}
                                        </button>
                                        
                                        <button 
                                            onClick={handleMicSendClick}
                                            disabled={!transcript.trim()}
                                            className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg
                                            ${transcript.trim() 
                                                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_-5px_rgba(52,211,153,0.5)]" 
                                                : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"}`}
                                        >
                                            <Send size={14} /> Finish & Send
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* State: Manual Typing Mode */}
                            {(status === "listening" && showManual) && (
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-neutral-400 mb-2 uppercase tracking-widest font-bold flex items-center gap-2">
                                            <User size={12} /> Keyboard Input Mode
                                        </p>
                                        <textarea 
                                            value={manualInput}
                                            onChange={(e) => setManualInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    submitUserResponse(manualInput);
                                                }
                                            }}
                                            autoFocus
                                            placeholder="Type your answer here... (Press Enter to send)"
                                            className="w-full bg-black/50 border border-emerald-500/30 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white resize-none h-20 shadow-inner block"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button 
                                            onClick={() => submitUserResponse(manualInput)}
                                            disabled={!manualInput.trim()}
                                            className={`p-3 rounded-xl transition-all flex items-center justify-center 
                                                ${manualInput.trim() ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_-5px_rgba(52,211,153,0.5)]" : "bg-white/5 text-neutral-500 border border-white/10"}`}
                                        >
                                            <Send size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setShowManual(false)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase font-bold text-neutral-400 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* State: Not Listening / Other */}
                            {status !== "listening" && (
                                <div className="flex items-center justify-center h-16 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <p className="text-neutral-500 text-xs tracking-widest uppercase font-bold flex items-center gap-2 animate-pulse">
                                        {status === "initializing" && "Preparing session"}
                                        {status === "processing" && "AI is reflecting..."}
                                        {status === "speaking" && "AI is speaking..."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showExitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="relative bg-neutral-950 border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                                <LogOut size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Exit Interview?</h3>
                            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">Your session data will be lost. Are you sure you want to exit the assessment?</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={() => setShowExitModal(false)} className="px-5 py-3.5 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-neutral-300 hover:bg-white/10">Return</button>
                                <button onClick={exitInterview} className="px-5 py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/30">Confirm Exit</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {warningModal && status !== "terminated" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <div className="relative bg-neutral-950 border border-orange-500/50 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                                <AlertCircle size={32} className="text-orange-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Violation #{violations}</h3>
                            <p className="text-neutral-300 text-sm mb-4 font-semibold p-3 bg-white/5 rounded-lg border border-white/10 w-full">{warningModal.reason}</p>
                            <p className="text-orange-400/80 text-xs mb-8">Strike {violations} of {MAX_VIOLATIONS}. System terminates upon {MAX_VIOLATIONS} strikes.</p>
                            <button onClick={() => { setWarningModal(null); enterFullscreen(); }} className="w-full px-4 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold tracking-wide shadow-lg shadow-orange-500/30">I Understand</button>
                        </div>
                    </div>
                </div>
            )}

            {showFullscreenPrompt && !warningModal && status !== "terminated" && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-neutral-950/90 border border-amber-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl max-w-xs">
                        <p className="text-amber-400 text-xs uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><ShieldAlert size={14} /> Fullscreen Required</p>
                        <p className="text-neutral-400 text-xs mb-4">You must re-enter fullscreen immediately.</p>
                        <button onClick={enterFullscreen} className="w-full text-xs px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500 hover:text-black transition-all">Re-enter Mode</button>
                    </div>
                </div>
            )}
        </div>
    );
}