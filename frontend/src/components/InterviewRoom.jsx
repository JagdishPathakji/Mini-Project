import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, Radio, AlertCircle, ShieldAlert, LogOut, TerminalSquare, CheckCircle2 } from "lucide-react";
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

    // Refs & Speech
    const { 
        transcript, 
        resetTranscript, 
        listening, 
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable 
    } = useSpeechRecognition();
    const [manualInput, setManualInput] = useState("");
    const [showManual, setShowManual] = useState(false);
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
        const handleBlur = () => {
             if (status !== "terminated" && started) {
                recordViolation("Left the interview window");
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("blur", handleBlur);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("blur", handleBlur);
        };
    }, [status, started, recordViolation]);

    // ─── INTERVIEW FLOW ENGINE ──────────────────────────────────────────────────
    
    const speak = useCallback((text) => {
        if (!text) return;
        speechSynthesis.cancel();
        SpeechRecognition.stopListening();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => {
            setStatus("listening");
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
        };
        utterance.onerror = () => setStatus("listening");

        setMessages(prev => [...prev, { role: "assistant", content: text }]);
        speechSynthesis.speak(utterance);
    }, [resetTranscript]);

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

    useEffect(() => {
        if (started || !role) return;
        setStarted(true);
        callAI(messages);
    }, [started, role, messages, callAI]);

    const handleUserResponse = useCallback((content) => {
        if (!content.trim()) return;
        resetTranscript();
        SpeechRecognition.stopListening();
        
        const userMsg = { role: "user", content: content.trim() };
        setMessages(prev => {
            const updated = [...prev, userMsg];
            callAI(updated);
            return updated;
        });
        setManualInput("");
        setShowManual(false);
    }, [callAI, resetTranscript]);

    useEffect(() => {
        if (status !== "listening") return;
        if (!transcript.trim()) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            return;
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            handleUserResponse(transcript.trim());
        }, 6000); 

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [transcript, status, handleUserResponse]);

    // ─── UI HELPERS ─────────────────────────────────────────────────────────────
    const phaseLabel = status === "speaking" ? "Speaking" : 
                      status === "processing" ? "Thinking" : 
                      (listening ? "Listening" : "Ready");

    const enterFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        setShowFullscreenPrompt(false);
    };

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

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden"
            onContextMenu={e => e.preventDefault()}
        >
            <Navbar />
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

            <main className="pt-24 pb-12 max-w-5xl mx-auto px-6 relative z-10 flex flex-col h-screen">
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Interview Room</h1>
                        <p className="text-neutral-400 text-sm mt-1">Live AI-powered verbal assessment</p>
                    </div>
                    <button onClick={() => setShowExitModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-all">
                        <LogOut size={16} /> Exit Session
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Role</p>
                                <p className="text-white font-semibold truncate">{role}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Status</p>
                                <div className="flex items-center gap-2 font-semibold">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'speaking' ? 'bg-amber-400' : status === 'processing' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                                    <span className="text-xs">{phaseLabel}</span>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Mic Status</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${!browserSupportsSpeechRecognition ? 'bg-red-500' : isMicrophoneAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <p className="text-white text-[10px] font-semibold">{!browserSupportsSpeechRecognition ? "No API" : isMicrophoneAvailable ? "Active" : "Check Mic"}</p>
                                </div>
                            </div>
                            <div className={`border rounded-2xl p-4 backdrop-blur-md ${violations > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                                <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Strikes</p>
                                <p className="font-bold text-xs">{violations} / {MAX_VIOLATIONS}</p>
                            </div>
                        </div>

                        <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex flex-col relative overflow-hidden min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {messages.filter(m => m.role !== "system").map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-white/10 text-white rounded-br-none' : 'bg-indigo-500/10 text-neutral-200 rounded-bl-none border border-indigo-500/20'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {((listening && transcript) || showManual) && (
                                <div className="absolute bottom-4 left-6 right-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 shadow-2xl">
                                    {!showManual ? (
                                        <p className="text-white text-sm font-medium italic flex items-center justify-between">
                                            <span><Mic size={10} className="inline mr-2 animate-pulse" /> "{transcript}"</span>
                                            <span onClick={() => setShowManual(true)} className="text-[9px] bg-white/10 px-2 py-1 rounded cursor-pointer font-bold uppercase hover:bg-white/20">Type Instead?</span>
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-bold"><TerminalSquare size={10} className="inline mr-1"/> Manual Correction</p>
                                            <div className="flex gap-2">
                                                <input value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserResponse(manualInput)} placeholder="Type your answer..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50" autoFocus />
                                                <button onClick={() => handleUserResponse(manualInput)} className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-xs font-bold font-sans">Send</button>
                                                <button onClick={() => setShowManual(false)} className="bg-white/5 text-neutral-400 px-3 py-2 rounded-xl text-xs font-sans">Exit</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-md flex flex-col items-center justify-center flex-1 relative overflow-hidden">
                            <h3 className="absolute top-6 left-6 text-[10px] text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
                                <Radio size={14} className={status === 'speaking' ? 'text-amber-400 animate-pulse' : 'text-neutral-500'} /> NEXA Core
                            </h3>
                            <div className="relative mt-8">
                                <div className={`absolute inset-0 rounded-full blur-[40px] opacity-40 animate-pulse mix-blend-screen scale-150 ${status === 'speaking' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                <div className="w-24 h-24 bg-gradient-to-br from-neutral-700 via-white/10 to-black rounded-full shadow-2xl border border-white/20 flex items-center justify-center relative z-10 transition-all duration-700">
                                    <div className={`w-12 h-12 rounded-full blur-md animate-pulse ${status === 'speaking' ? 'bg-amber-400/30' : 'bg-blue-400/30'}`}></div>
                                </div>
                            </div>
                            <p className={`mt-8 font-bold uppercase tracking-[0.2em] text-[10px] ${status === 'speaking' ? 'text-amber-400' : (listening ? 'text-emerald-400' : 'text-neutral-600')}`}>
                                {status === "speaking" ? "AI Transmitting" : (listening ? "Mic Receiving" : "Standby")}
                            </p>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md flex-shrink-0 max-h-[200px] flex flex-col overflow-hidden">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2 mb-4"><ShieldAlert size={14} /> Security Ledger</p>
                            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                                {violationLog.length > 0 ? violationLog.map((v, i) => (
                                    <div key={i} className="text-[10px] flex justify-between text-neutral-400 p-2 rounded bg-red-500/5 border border-red-500/10">
                                        <span>#{v.count} - {v.reason}</span>
                                        <span className="text-red-500">{v.timestamp}</span>
                                    </div>
                                )) : <div className="text-[10px] text-neutral-600 italic text-center mt-4">No violations logged.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {showExitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4">Exit Interview?</h3>
                        <p className="text-neutral-400 text-sm mb-8">Unsaved progress will be lost.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowExitModal(false)} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">Cancel</button>
                            <button onClick={exitInterview} className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {warningModal && status !== "terminated" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-neutral-900 border border-orange-500/50 rounded-2xl w-full max-w-sm p-8 text-center">
                        <AlertCircle size={32} className="text-orange-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-orange-400">Security Warning</h3>
                        <p className="text-neutral-300 text-sm mb-6">{warningModal.reason}</p>
                        <button onClick={() => { setWarningModal(null); enterFullscreen(); }} className="w-full py-3 rounded-xl bg-orange-500 text-black font-bold text-xs uppercase">I Understand</button>
                    </div>
                </div>
            )}

            {showFullscreenPrompt && !warningModal && status !== "terminated" && (
                <div className="fixed bottom-8 right-8 z-[50]">
                    <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
                        <p className="text-amber-400 text-[10px] font-bold uppercase mb-2 flex items-center gap-2"><ShieldAlert size={12} /> Fullscreen Required</p>
                        <button onClick={enterFullscreen} className="w-full text-[10px] px-3 py-2 rounded bg-amber-500/20 text-amber-300 font-bold hover:bg-amber-500 hover:text-black">Re-enter</button>
                    </div>
                </div>
            )}
        </div>
    );
}