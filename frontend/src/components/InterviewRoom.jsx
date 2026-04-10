import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, Radio, AlertCircle, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;
const MAX_VIOLATIONS = 3;

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, difficulty, jobDescription } = location.state || {};

    // ─── STATE MACHINE ──────────────────────────────────────────────────────────
    const [status, setStatus] = useState("initializing"); // initializing, speaking, listening, processing, terminated
    const [messages, setMessages] = useState([
        {
            role: "system",
            content: `You are a professional interviewer for a ${role} position. Difficulty: ${difficulty}. Job Description: ${jobDescription}. Ask ONE natural verbal question at a time. No code. No markdown.`
        }
    ]);
    const [started, setStarted] = useState(false);
    
    // Proctoring & UI State
    const [violations, setViolations] = useState(0);
    const [violationLog, setViolationLog] = useState([]);
    const [warningModal, setWarningModal] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Refs for synchronization
    const { transcript, resetTranscript, listening } = useSpeechRecognition();
    const silenceTimerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // ─── UTILITIES ──────────────────────────────────────────────────────────────
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, status, scrollToBottom]);

    const exitInterview = useCallback(() => {
        speechSynthesis.cancel();
        SpeechRecognition.stopListening();
        navigate("/ai-interview");
    }, [navigate]);

    // ─── PROCTORING LOGIC ───────────────────────────────────────────────────────
    const recordViolation = useCallback((reason) => {
        if (status === "terminated") return;
        
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
    }, [status]);

    // Fullscreen monitors
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

    // Visibility monitors
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
    
    // 1. Speak Logic
    const speak = useCallback((text) => {
        if (!text) return;
        
        speechSynthesis.cancel();
        SpeechRecognition.stopListening(); // Force mic OFF while AI speaks
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        
        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => {
            setStatus("listening");
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
        };
        utterance.onerror = () => setStatus("listening"); // Fail-safe fallback

        setMessages(prev => [...prev, { role: "assistant", content: text }]);
        speechSynthesis.speak(utterance);
    }, [resetTranscript]);

    // 2. AI Request Logic
    const callAI = useCallback(async (context) => {
        setStatus("processing");
        try {
            const res = await fetch(`${BACKEND_URL}`, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: context })
            });
            const data = await res.json();
            if (data.status) {
                speak(data.message);
            } else {
                throw new Error(data.message || "AI Connection Lost");
            }
        } catch (err) {
            console.error(err);
            setStatus("listening");
            speak("I'm having trouble connecting. Could you please repeat that or wait a moment?");
        }
    }, [speak]);

    // 3. Initial Start
    useEffect(() => {
        if (started || !role) return;
        setStarted(true);
        callAI(messages);
    }, [started, role, messages, callAI]);

    // 4. Silence Detection & Submission
    useEffect(() => {
        if (status !== "listening") return;
        if (!transcript.trim()) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            return;
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        silenceTimerRef.current = setTimeout(() => {
            const userSpeech = transcript.trim();
            resetTranscript();
            SpeechRecognition.stopListening();
            
            const userMsg = { role: "user", content: userSpeech };
            setMessages(prev => {
                const updated = [...prev, userMsg];
                callAI(updated);
                return updated;
            });
        }, 6000); // 6 seconds wait

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [transcript, status, callAI, resetTranscript]);

    // ─── RENDER HELPERS ─────────────────────────────────────────────────────────
    const phaseLabel = status === "speaking" ? "Speaking" : 
                      status === "processing" ? "Thinking" : 
                      (listening ? "Listening" : "Ready");

    const phaseColorClass = status === "speaking" ? "bg-amber-400 shadow-[0_0_10px_#fbbf24] text-amber-400" :
                           status === "processing" ? "bg-blue-400 shadow-[0_0_10px_#60a5fa] text-blue-400" :
                           "bg-emerald-400 shadow-[0_0_10px_#34d399] text-emerald-400";

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
                    <p className="text-neutral-400 mb-6 font-mono text-sm leading-relaxed bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-left">
                        Strike {violations}: {warningModal?.reason}
                    </p>
                    <button onClick={exitInterview} className="px-8 py-4 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-all shadow-2xl">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─── MAIN RENDER ────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden"
            onContextMenu={e => e.preventDefault()}
        >
            <Navbar />

            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

            <main className="pt-24 pb-12 max-w-5xl mx-auto px-6 relative z-10 flex flex-col h-screen">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Interview Room</h1>
                        <p className="text-neutral-400 text-sm mt-1">Live AI-powered verbal assessment</p>
                    </div>
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] hover:-translate-y-0.5"
                    >
                        <LogOut size={16} />
                        Exit Session
                    </button>
                </div>

                {/* Core Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    {/* LEFT COLUMN: Data & Transcripts */}
                    <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">

                        {/* Status Bento Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Role</p>
                                <p className="text-white font-semibold truncate" title={role}>{role}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Difficulty</p>
                                <p className="text-white font-semibold">{difficulty}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Phase</p>
                                <div className="flex items-center gap-2 font-semibold">
                                    <div className={`w-2 h-2 rounded-full animate-pulse 
                                        ${status === 'speaking' ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 
                                          status === 'processing' ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' : 
                                          'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`} 
                                    />
                                    <span className={
                                        status === 'speaking' ? 'text-amber-400' : 
                                        status === 'processing' ? 'text-blue-400' : 
                                        'text-emerald-400'
                                    }>
                                        {phaseLabel}
                                    </span>
                                </div>
                            </div>
                            <div className={`border rounded-2xl p-4 backdrop-blur-md transition-colors duration-500 ${violations > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${violations > 0 ? 'text-orange-400' : 'text-neutral-500'}`}>Violations</p>
                                <p className={`font-bold ${violations > 0 ? 'text-orange-400' : 'text-white'}`}>{violations} <span className="text-neutral-500 text-xs">/ {MAX_VIOLATIONS}</span></p>
                            </div>
                        </div>

                        {/* Conversation History Box */}
                        <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex flex-col relative overflow-hidden group min-h-0">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-4 flex-shrink-0 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Radio size={14} className={status === 'speaking' ? 'text-amber-400 animate-pulse' : 'text-neutral-500'} />
                                    Interview Session Log
                                </span>
                                <span className="text-[8px] opacity-40">Auto-scrolling active</span>
                            </p>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {messages.filter(m => m.role !== "system").map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-white/10 text-white rounded-br-none border border-white/5 shadow-inner' 
                                            : 'bg-indigo-500/10 text-neutral-200 rounded-bl-none border border-indigo-500/20 shadow-[0_0_20px_-10px_rgba(99,102,241,0.3)]'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {status === "processing" && (
                                    <div className="flex items-center gap-3 text-neutral-500 italic text-xs animate-pulse pl-2">
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 bg-current rounded-full" />
                                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1 h-1 bg-current rounded-full" />
                                        </div>
                                        NEXA is reflecting...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Live Floating Transcript (Overlay at bottom) */}
                            {listening && transcript && (
                                <div className="absolute bottom-4 left-6 right-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                                        <Mic size={10} className="animate-pulse" /> Capturing...
                                    </p>
                                    <p className="text-white text-sm font-medium line-clamp-2 italic">"{transcript}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: AI Core & Proctoring */}
                    <div className="flex flex-col gap-6 min-h-0">
                        {/* The AI Core Representation */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-md flex flex-col items-center justify-center flex-1 relative overflow-hidden">
                            <h3 className="absolute top-6 left-6 text-[10px] text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
                                <Radio size={14} className={status === 'speaking' ? 'text-amber-400 animate-pulse' : 'text-neutral-500'} />
                                NEXA Core
                            </h3>

                            <div className="relative mt-8">
                                {status === "speaking" ? (
                                    <>
                                        <div className="absolute inset-0 bg-amber-500 rounded-full blur-[40px] opacity-40 animate-pulse mix-blend-screen scale-150"></div>
                                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-[30px] opacity-30 animate-[spin_4s_linear_infinite] mix-blend-screen scale-[1.2]"></div>
                                        <div className="w-24 h-24 bg-gradient-to-br from-amber-300 via-white to-amber-100 rounded-full shadow-[0_0_60px_#fbbf24] animate-[pulse_1s_ease-in-out_infinite] border-4 border-white/40 flex items-center justify-center relative z-10">
                                            <div className="w-16 h-16 bg-white/50 rounded-full animate-ping opacity-50"></div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={`absolute inset-0 rounded-full blur-[40px] opacity-20 animate-[pulse_3s_ease-in-out_infinite] mix-blend-screen scale-125 ${listening ? 'bg-emerald-500' : 'bg-neutral-500'}`}></div>
                                        <div className="w-24 h-24 bg-gradient-to-br from-neutral-600 to-neutral-800 rounded-full border border-white/10 flex items-center justify-center relative z-10 transition-all duration-700">
                                            <div className={`w-8 h-8 rounded-full blur-md animate-pulse ${listening ? 'bg-emerald-400/40' : 'bg-neutral-600'}`}></div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <p className={`mt-10 font-bold uppercase tracking-[0.2em] text-xs transition-colors duration-500 ${status === 'speaking' ? 'text-amber-400' : (listening ? 'text-emerald-400' : 'text-neutral-600')}`}>
                                {status === "speaking" ? "Transmitting..." : (listening ? "Receiving..." : "Standby")}
                            </p>
                        </div>

                        {/* Proctoring Log */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex-shrink-0 max-h-[250px] flex flex-col">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                                <ShieldAlert size={14} className={violations > 0 ? 'text-orange-400' : 'text-neutral-500'} />
                                Security Ledger
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] tracking-wider font-bold uppercase ${isFullscreen ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isFullscreen ? "bg-emerald-400" : "bg-red-400"}`} />
                                    FS Monitored
                                </span>
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px] tracking-wider font-bold uppercase">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Focus Lock
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                {violationLog.length > 0 ? (
                                    <ul className="space-y-2">
                                        {violationLog.map((v, i) => (
                                            <li key={i} className="text-xs flex items-center justify-between text-neutral-300 p-2 rounded-lg bg-red-500/5 border border-red-500/10 leading-none">
                                                <span className="truncate pr-2">#{v.count} - {v.reason}</span>
                                                <span className="text-red-400 font-mono text-[10px] whitespace-nowrap">{v.timestamp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-neutral-600 text-xs italic">
                                        No violations detected.
                                    </div>
                                )}
                            </div>
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
                            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">Your session data will be lost. Confirm end of assessment?</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={() => setShowExitModal(false)} className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-neutral-300">Return</button>
                                <button onClick={exitInterview} className="px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/20">Confirm Exit</button>
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
                            <button onClick={() => { setWarningModal(null); enterFullscreen(); }} className="w-full px-4 py-4 rounded-xl bg-orange-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-orange-500/20">I Understand</button>
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