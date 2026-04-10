import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import {
    Mic, MicOff, AlertCircle, ShieldAlert, LogOut, Send, Bot, User,
    PlayCircle, PauseCircle, Volume2, VolumeX, MessageSquare, Clock,
    Loader2, XCircle, CheckCircle2, ChevronRight, Keyboard
} from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";
import toast from "react-hot-toast";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;
const MAX_VIOLATIONS = 3;
const SILENCE_MS = 3000;

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, difficulty, jobDescription } = location.state || {};

    /* ──── state ──── */
    const [phase, setPhase] = useState("IDLE");
    // IDLE | AI_THINKING | AI_SPEAKING | USER_TURN | ENDED
    const [messages, setMessages] = useState([]);
    const [currentAIText, setCurrentAIText] = useState("");
    const [questionCount, setQuestionCount] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [violations, setViolations] = useState(0);
    const [tabWarn, setTabWarn] = useState(false);
    const [started, setStarted] = useState(false);
    const [liveText, setLiveText] = useState("");
    const [typedInput, setTypedInput] = useState("");
    const [useKeyboard, setUseKeyboard] = useState(false);
    const [micActive, setMicActive] = useState(false);

    /* ──── refs ──── */
    const chatEnd = useRef(null);
    const timer = useRef(null);
    const silenceTimer = useRef(null);
    const phaseRef = useRef("IDLE");
    const msgsRef = useRef([]);
    const qCountRef = useRef(0);
    const mutedRef = useRef(false);

    /* ──── speech recognition ──── */
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
        useSpeechRecognition();

    /* keep refs fresh */
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { msgsRef.current = messages; }, [messages]);
    useEffect(() => { qCountRef.current = questionCount; }, [questionCount]);
    useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

    /* sync transcript → liveText */
    useEffect(() => {
        if (listening && transcript) {
            setLiveText(transcript);
        }
    }, [transcript, listening]);

    /* track mic active state from library */
    useEffect(() => { setMicActive(listening); }, [listening]);

    /* redirect if no config */
    useEffect(() => {
        if (!role || !difficulty) {
            toast.error("Please configure your interview first.");
            navigate("/ai-interview");
        }
    }, [role, difficulty, navigate]);

    /* timer */
    useEffect(() => {
        if (!started) return;
        timer.current = setInterval(() => setElapsed(p => p + 1), 1000);
        return () => clearInterval(timer.current);
    }, [started]);

    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m < 10 ? "0" + m : m}:${sec < 10 ? "0" + sec : sec}`;
    };

    /* auto-scroll */
    useEffect(() => {
        chatEnd.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, liveText, currentAIText, phase]);

    /* tab monitoring */
    useEffect(() => {
        if (!started) return;
        const handler = () => {
            if (document.hidden && phaseRef.current !== "ENDED") {
                setViolations(prev => {
                    const n = prev + 1;
                    if (n >= MAX_VIOLATIONS) {
                        toast.error("Interview terminated — too many tab switches.");
                        doEnd();
                    } else {
                        setTabWarn(true);
                        toast.error(`Warning ${n}/${MAX_VIOLATIONS}: Tab switching detected!`);
                        setTimeout(() => setTabWarn(false), 4000);
                    }
                    return n;
                });
            }
        };
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
    }, [started]);

    /* ═══════════════  TTS  ═══════════════ */
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (mutedRef.current || !text) { resolve(); return; }
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1; u.pitch = 1; u.volume = 1;
            const voices = window.speechSynthesis.getVoices();
            const pick = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha"))
                || voices.find(v => v.lang.startsWith("en")) || voices[0];
            if (pick) u.voice = pick;
            u.onend = resolve;
            u.onerror = resolve;
            window.speechSynthesis.speak(u);
        });
    }, []);

    /* ═══════════════  BACKEND  ═══════════════ */
    const callAI = useCallback(async (convMsgs) => {
        setPhase("AI_THINKING");

        const sys = `You are a world-class technical interviewer conducting a ${difficulty} difficulty interview for the role of ${role}.
${jobDescription ? `\nJob Description:\n${jobDescription}\n` : ""}
RULES:
1. Ask ONE question at a time.
2. After the candidate answers, briefly evaluate then ask the NEXT question.
3. Keep responses concise and conversational — speak naturally, no markdown/bullets/code blocks.
4. Vary question types: conceptual, scenario, system design, coding logic, behavioral.
5. Adapt difficulty based on performance.
6. After 8-10 questions, wrap up with feedback and say "that concludes our interview".`;

        const body = [{ role: "system", content: sys }, ...convMsgs];

        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: body }),
            });
            const data = await res.json();
            if (!data.status) throw new Error(data.message || "AI error");

            const aiText = data.message;
            const aiMsg = { role: "assistant", content: aiText };

            setMessages(prev => [...prev, aiMsg]);
            setQuestionCount(prev => prev + 1);

            // speak it
            setPhase("AI_SPEAKING");
            setCurrentAIText(aiText);
            await speak(aiText);
            setCurrentAIText("");

            // check end
            const q = qCountRef.current + 1;
            if (q >= 10 || /that concludes|end of the interview/i.test(aiText)) {
                doEnd();
                toast.success("Interview completed!");
                return;
            }

            setPhase("USER_TURN");
        } catch (err) {
            console.error("AI Error:", err);
            toast.error(err.message || "Failed to reach AI");
            setPhase("USER_TURN");
        }
    }, [difficulty, role, jobDescription, speak]);

    /* ═══════════════  MIC CONTROLS  ═══════════════ */

    // USER clicks mic button to start recording
    const toggleMic = useCallback(() => {
        if (phaseRef.current !== "USER_TURN") return;

        if (listening) {
            // stop & submit whatever we have
            SpeechRecognition.stopListening();
            clearTimeout(silenceTimer.current);
            const text = transcript?.trim();
            if (text) {
                submitAnswer(text);
            }
        } else {
            // start listening — this is from a click handler so browser allows it
            resetTranscript();
            setLiveText("");
            SpeechRecognition.startListening({ continuous: true, language: "en-US" });
        }
    }, [listening, transcript, resetTranscript]);

    /* ═══════════════  SILENCE DETECTION  ═══════════════ */
    useEffect(() => {
        if (!listening || phaseRef.current !== "USER_TURN") return;
        if (!transcript || !transcript.trim()) return;

        clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
            if (phaseRef.current !== "USER_TURN") return;
            const text = transcript?.trim();
            if (text) {
                SpeechRecognition.stopListening();
                submitAnswer(text);
            }
        }, SILENCE_MS);

        return () => clearTimeout(silenceTimer.current);
    }, [transcript, listening]);

    /* ═══════════════  SUBMIT ANSWER  ═══════════════ */
    const submitAnswer = useCallback((text) => {
        if (!text || !text.trim() || phaseRef.current !== "USER_TURN") return;

        SpeechRecognition.stopListening();
        clearTimeout(silenceTimer.current);
        setLiveText("");
        resetTranscript();
        setTypedInput("");

        const userMsg = { role: "user", content: text.trim() };
        const updated = [...msgsRef.current, userMsg];
        setMessages(updated);

        // call AI with the full conversation
        callAI(updated);
    }, [callAI, resetTranscript]);

    /* submit typed text */
    const handleTypedSend = useCallback(() => {
        if (!typedInput.trim() || phaseRef.current !== "USER_TURN") return;
        SpeechRecognition.stopListening();
        submitAnswer(typedInput.trim());
    }, [typedInput, submitAnswer]);

    /* manual send button (for mic transcript) */
    const handleMicSend = useCallback(() => {
        if (phaseRef.current !== "USER_TURN") return;
        const text = transcript?.trim() || liveText?.trim();
        if (!text) {
            toast.error("Nothing to send — speak or type your answer.");
            return;
        }
        SpeechRecognition.stopListening();
        submitAnswer(text);
    }, [transcript, liveText, submitAnswer]);

    /* ═══════════════  START INTERVIEW  ═══════════════ */
    const startInterview = useCallback(async () => {
        setStarted(true);

        const greeting = `Hello! Welcome to your ${difficulty} level ${role} interview. I'll ask you a series of technical questions. Take your time, think through each answer, and speak clearly. Let's get started.`;
        const greetMsg = { role: "assistant", content: greeting };
        const readyMsg = { role: "user", content: "I'm ready. Ask me the first question." };
        setMessages([greetMsg, readyMsg]);

        setPhase("AI_SPEAKING");
        setCurrentAIText(greeting);
        await speak(greeting);
        setCurrentAIText("");

        await callAI([greetMsg, readyMsg]);
    }, [difficulty, role, speak, callAI]);

    /* ═══════════════  END INTERVIEW  ═══════════════ */
    const doEnd = useCallback(() => {
        setPhase("ENDED");
        SpeechRecognition.stopListening();
        window.speechSynthesis.cancel();
        clearInterval(timer.current);
        clearTimeout(silenceTimer.current);
        setShowExitConfirm(false);
        setCurrentAIText("");
    }, []);

    const skipSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setCurrentAIText("");
    }, []);

    /* cleanup */
    useEffect(() => () => {
        SpeechRecognition.stopListening();
        window.speechSynthesis.cancel();
        clearInterval(timer.current);
        clearTimeout(silenceTimer.current);
    }, []);

    /* ═══════════════  BROWSER CHECK  ═══════════════ */
    if (!browserSupportsSpeechRecognition) {
        // fallback: keyboard only mode
        if (!useKeyboard) {
            // offer keyboard mode
        }
    }

    /* ═══════════════  UI HELPERS  ═══════════════ */
    const phaseLabel = () => {
        if (phase === "IDLE") return "Ready to Begin";
        if (phase === "AI_THINKING") return "AI is Thinking…";
        if (phase === "AI_SPEAKING") return "AI is Speaking…";
        if (phase === "USER_TURN") return micActive ? "Listening — Speak Now" : "Your Turn";
        if (phase === "ENDED") return "Interview Complete";
        return "";
    };
    const phaseColor = () => {
        if (phase === "AI_THINKING") return "text-amber-400";
        if (phase === "AI_SPEAKING") return "text-blue-400";
        if (phase === "USER_TURN") return "text-emerald-400";
        if (phase === "ENDED") return "text-white";
        return "text-neutral-400";
    };
    const phaseGlow = () => {
        if (phase === "AI_THINKING") return "shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]";
        if (phase === "AI_SPEAKING") return "shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]";
        if (phase === "USER_TURN") return "shadow-[0_0_40px_-10px_rgba(52,211,153,0.3)]";
        return "";
    };

    /* ══════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════ */
    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />

            {/* ambient bg */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] rounded-full bg-emerald-600/[0.03] blur-[150px] pointer-events-none" />

            {/* tab violation banner */}
            {tabWarn && (
                <div className="fixed top-16 left-0 right-0 z-[100] flex justify-center">
                    <div className="mx-4 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-xl flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
                        <ShieldAlert size={20} className="text-red-400 animate-pulse" />
                        <span className="text-red-300 text-sm font-bold">Tab switch detected! {violations}/{MAX_VIOLATIONS}</span>
                    </div>
                </div>
            )}

            {/* ── MAIN LAYOUT ── */}
            <div className="flex flex-1 pt-20 pb-6 px-4 md:px-6 gap-4 overflow-hidden relative z-10">

                {/* ════════  LEFT — TRANSCRIPT  ════════ */}
                <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a] relative z-10">
                        <div className="flex items-center gap-3">
                            <MessageSquare size={16} className="text-blue-400" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                                Interview Transcript
                            </span>
                            {started && phase !== "ENDED" && (
                                <div className="flex items-center gap-2 ml-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Live</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {started && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <Clock size={14} className="text-neutral-400" />
                                    <span className="text-sm font-mono font-bold text-neutral-300">{fmt(elapsed)}</span>
                                </div>
                            )}
                            {questionCount > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Q{questionCount}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">

                        {/* idle start screen */}
                        {!started && (
                            <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]">
                                        <Bot size={40} className="text-neutral-400" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                        <Mic size={14} className="text-emerald-400" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold tracking-tight mb-3 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
                                        AI Voice Interview
                                    </h2>
                                    <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Role: <span className="text-white font-semibold">{role}</span> ·{" "}
                                        Difficulty: <span className="text-white font-semibold">{difficulty}</span>
                                    </p>
                                    {jobDescription && <p className="text-neutral-600 text-xs mt-2">Job description provided ✓</p>}
                                </div>
                                <button onClick={startInterview}
                                    className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-sm flex items-center gap-3 group hover:bg-neutral-200 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:-translate-y-1">
                                    <PlayCircle size={20} className="group-hover:scale-110 transition-transform" />
                                    Start Interview
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {/* chat bubbles */}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                    <div className="mr-3 flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]">
                                            <Bot size={16} className="text-blue-400" />
                                        </div>
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${msg.role === "user"
                                    ? "bg-white/10 border border-white/10 text-white rounded-br-none"
                                    : "bg-blue-500/5 border border-blue-500/20 text-neutral-300 rounded-bl-none"
                                    }`}>
                                    {msg.content}
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

                        {/* AI speaking indicator */}
                        {phase === "AI_SPEAKING" && currentAIText && (
                            <div className="flex w-full justify-start">
                                <div className="mr-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
                                        <Volume2 size={16} className="text-blue-400" />
                                    </div>
                                </div>
                                <div className="max-w-[80%] rounded-2xl rounded-bl-none px-5 py-4 text-sm leading-relaxed bg-blue-500/5 border border-blue-500/20 text-neutral-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex gap-1">
                                            {[3, 4, 2, 5].map((h, i) => (
                                                <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: h * 4, animationDelay: `${i * 150}ms` }} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/60">Speaking</span>
                                    </div>
                                    {currentAIText}
                                </div>
                            </div>
                        )}

                        {/* AI thinking */}
                        {phase === "AI_THINKING" && (
                            <div className="flex w-full justify-start">
                                <div className="mr-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                        <Bot size={16} className="text-amber-400 animate-pulse" />
                                    </div>
                                </div>
                                <div className="rounded-2xl rounded-bl-none px-6 py-4 bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                                    <Loader2 size={16} className="text-amber-400 animate-spin" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400/80">Thinking…</span>
                                </div>
                            </div>
                        )}

                        {/* live transcript while user is speaking */}
                        {phase === "USER_TURN" && liveText && micActive && (
                            <div className="flex w-full justify-end">
                                <div className="max-w-[80%] rounded-2xl rounded-br-none px-5 py-4 text-sm leading-relaxed bg-emerald-500/5 border border-emerald-500/20 border-dashed text-neutral-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">Listening…</span>
                                    </div>
                                    {liveText}
                                </div>
                                <div className="ml-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                        <Mic size={16} className="text-emerald-400 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ended */}
                        {phase === "ENDED" && (
                            <div className="flex flex-col items-center gap-6 py-8">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(52,211,153,0.2)]">
                                    <CheckCircle2 size={32} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-extrabold text-white mb-2">Interview Complete</h3>
                                    <p className="text-neutral-400 text-sm">Duration: {fmt(elapsed)} · Questions: {questionCount}</p>
                                </div>
                                <button onClick={() => navigate("/ai-interview")}
                                    className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] flex items-center gap-2">
                                    <ChevronRight size={16} /> New Interview
                                </button>
                            </div>
                        )}

                        <div ref={chatEnd} />
                    </div>

                    {/* ── BOTTOM INPUT BAR (visible during USER_TURN) ── */}
                    {phase === "USER_TURN" && (
                        <div className="border-t border-white/5 bg-[#0a0a0a] px-4 py-3 relative z-20">
                            {useKeyboard ? (
                                /* keyboard input */
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setUseKeyboard(false); setTypedInput(""); }}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all"
                                        title="Switch to voice">
                                        <Mic size={18} />
                                    </button>
                                    <input
                                        type="text"
                                        value={typedInput}
                                        onChange={e => setTypedInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleTypedSend(); }}
                                        placeholder="Type your answer here..."
                                        className="flex-1 bg-[#030303] border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all placeholder-neutral-600"
                                        autoFocus
                                    />
                                    <button onClick={handleTypedSend} disabled={!typedInput.trim()}
                                        className="p-3 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                                        <Send size={18} />
                                    </button>
                                </div>
                            ) : (
                                /* voice input */
                                <div className="flex items-center gap-3">
                                    {/* Mic toggle — THIS is the critical button, called from user click = browser allows it */}
                                    <button onClick={toggleMic}
                                        className={`p-3 rounded-xl border transition-all ${micActive
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_-5px_rgba(52,211,153,0.4)] animate-pulse"
                                            : "bg-white/5 border-white/10 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5"
                                            }`}
                                        title={micActive ? "Stop & send" : "Click to start speaking"}>
                                        {micActive ? <Mic size={18} /> : <MicOff size={18} />}
                                    </button>

                                    <div className="flex-1 bg-[#030303] border border-white/10 rounded-xl px-4 py-3 text-sm min-h-[44px] flex items-center">
                                        {micActive && liveText ? (
                                            <span className="text-white">{liveText}</span>
                                        ) : micActive ? (
                                            <span className="text-emerald-400/60 animate-pulse">Listening — speak now…</span>
                                        ) : (
                                            <span className="text-neutral-600">Click mic to start speaking</span>
                                        )}
                                    </div>

                                    {/* send what we have */}
                                    <button onClick={handleMicSend} disabled={!liveText?.trim()}
                                        className="p-3 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                                        title="Send answer">
                                        <Send size={18} />
                                    </button>

                                    {/* toggle to keyboard */}
                                    <button onClick={() => { setUseKeyboard(true); SpeechRecognition.stopListening(); setLiveText(""); }}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                                        title="Switch to keyboard">
                                        <Keyboard size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ════════  RIGHT — STATUS  ════════ */}
                <div className="w-72 flex-shrink-0 flex flex-col gap-4">

                    {/* status card */}
                    <div className={`bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 relative overflow-hidden ${phaseGlow()}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Interview Status</div>
                            <div className={`text-lg font-bold mb-4 ${phaseColor()}`}>{phaseLabel()}</div>

                            {/* visualizer */}
                            {phase === "USER_TURN" && micActive && (
                                <div className="flex items-center justify-center gap-1 h-12 mb-4">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="w-1 bg-emerald-400 rounded-full animate-pulse"
                                            style={{ height: `${8 + Math.random() * 24}px`, animationDelay: `${i * 80}ms`, animationDuration: `${600 + Math.random() * 400}ms` }} />
                                    ))}
                                </div>
                            )}
                            {phase === "AI_THINKING" && (
                                <div className="flex items-center justify-center h-12 mb-4">
                                    <div className="relative w-12 h-12">
                                        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
                                    </div>
                                </div>
                            )}
                            {phase === "AI_SPEAKING" && (
                                <div className="flex items-center justify-center gap-1.5 h-12 mb-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="w-1.5 bg-blue-400 rounded-full"
                                            style={{ animation: "soundWave 0.8s ease-in-out infinite alternate", animationDelay: `${i * 100}ms`, height: "4px" }} />
                                    ))}
                                </div>
                            )}

                            {/* config */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Role</span>
                                    <span className="text-xs font-semibold text-neutral-300">{role}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Difficulty</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${difficulty === "Easy" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                                        : difficulty === "Medium" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                            : "bg-red-400/10 text-red-400 border border-red-400/20"}`}>
                                        {difficulty}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Violations</span>
                                    <span className={`text-xs font-bold ${violations > 0 ? "text-red-400" : "text-neutral-500"}`}>{violations}/{MAX_VIOLATIONS}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* controls */}
                    {started && phase !== "ENDED" && (
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            <div className="relative z-10 space-y-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Controls</div>

                                {phase === "AI_SPEAKING" && (
                                    <button onClick={skipSpeaking}
                                        className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-all">
                                        <PauseCircle size={14} /> Skip Speaking
                                    </button>
                                )}

                                <button onClick={() => setIsMuted(p => { if (!p) window.speechSynthesis.cancel(); return !p; })}
                                    className={`w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isMuted
                                        ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"}`}>
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    {isMuted ? "Unmute AI" : "Mute AI Voice"}
                                </button>

                                <button onClick={() => setShowExitConfirm(true)}
                                    className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                                    <LogOut size={14} /> End Interview
                                </button>
                            </div>
                        </div>
                    )}

                    {/* mic indicator */}
                    {started && phase === "USER_TURN" && (
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Microphone</div>
                                <button onClick={toggleMic}
                                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${micActive
                                        ? "bg-emerald-500/20 border-2 border-emerald-500/40 shadow-[0_0_30px_-5px_rgba(52,211,153,0.4)]"
                                        : "bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20"}`}>
                                    {micActive && (
                                        <>
                                            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
                                            <div className="absolute -inset-2 rounded-full border border-emerald-400/10 animate-pulse" />
                                        </>
                                    )}
                                    {micActive
                                        ? <Mic size={24} className="text-emerald-400 relative z-10" />
                                        : <MicOff size={24} className="text-neutral-500 relative z-10" />}
                                </button>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${micActive ? "text-emerald-400" : "text-neutral-500"}`}>
                                    {micActive ? "Active — Speak Now" : "Click to Activate"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* exit confirm modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <AlertCircle size={24} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-white">End Interview?</h3>
                                    <p className="text-neutral-400 text-sm mt-1">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowExitConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                                    Continue
                                </button>
                                <button onClick={doEnd}
                                    className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all">
                                    End Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes soundWave { 0% { height: 4px; } 100% { height: 28px; } }`}</style>
        </div>
    );
}