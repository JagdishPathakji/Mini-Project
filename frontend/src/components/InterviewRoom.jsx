import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, MicOff, Radio, AlertCircle, ShieldAlert, LogOut, Send, Bot, User, PlayCircle, PauseCircle, Volume2, VolumeX, MessageSquare, Clock, Loader2, XCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";
import toast from "react-hot-toast";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;
const MAX_VIOLATIONS = 3;
const SILENCE_TIMEOUT_MS = 3000;

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, difficulty, jobDescription } = location.state || {};

    // ── Core State ───────────────────────────────
    const [phase, setPhase] = useState("IDLE");
    const [messages, setMessages] = useState([]);
    const [currentAIText, setCurrentAIText] = useState("");
    const [questionCount, setQuestionCount] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [violations, setViolations] = useState(0);
    const [tabWarningVisible, setTabWarningVisible] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");

    // ── Refs ─────────────────────────────────────
    const chatEndRef = useRef(null);
    const timerRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const phaseRef = useRef(phase);
    const messagesRef = useRef(messages);
    const transcriptRef = useRef("");
    const questionCountRef = useRef(0);
    const isMutedRef = useRef(false);
    const micStartAttemptRef = useRef(null);

    // ── Speech Recognition ───────────────────────
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // ── Keep refs in sync ────────────────────────
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { questionCountRef.current = questionCount; }, [questionCount]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // ── Sync transcript to ref and state ─────────
    useEffect(() => {
        transcriptRef.current = transcript;
        if (phaseRef.current === "USER_TURN" && transcript) {
            setLiveTranscript(transcript);
        }
    }, [transcript]);

    // ── Redirect if no setup data ────────────────
    useEffect(() => {
        if (!role || !difficulty) {
            toast.error("Please configure your interview first.");
            navigate("/ai-interview");
        }
    }, [role, difficulty, navigate]);

    // ── Timer ────────────────────────────────────
    useEffect(() => {
        if (!interviewStarted) return;
        timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, [interviewStarted]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
    };

    // ── Auto-scroll ──────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, liveTranscript, currentAIText]);

    // ── Tab Monitoring ───────────────────────────
    useEffect(() => {
        if (!interviewStarted) return;

        const handleVisibilityChange = () => {
            if (document.hidden && phaseRef.current !== "ENDED") {
                setViolations(prev => {
                    const next = prev + 1;
                    if (next >= MAX_VIOLATIONS) {
                        toast.error("Interview terminated due to tab-switching violations.");
                        endInterview();
                    } else {
                        setTabWarningVisible(true);
                        toast.error(`Warning ${next}/${MAX_VIOLATIONS}: Tab switching detected!`);
                        setTimeout(() => setTabWarningVisible(false), 4000);
                    }
                    return next;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [interviewStarted]);

    // ── TTS Speak Function ───────────────────────
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (isMutedRef.current || !text) {
                resolve();
                return;
            }

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1;

            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v =>
                v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel")
            ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
            if (preferred) utterance.voice = preferred;

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    // ── Microphone Control ───────────────────────
    const startMic = useCallback(() => {
        // Clear any previous attempt
        clearTimeout(micStartAttemptRef.current);

        // Small delay to avoid race with speechSynthesis and previous stopListening
        micStartAttemptRef.current = setTimeout(() => {
            resetTranscript();
            transcriptRef.current = "";
            setLiveTranscript("");
            clearTimeout(silenceTimerRef.current);

            SpeechRecognition.startListening({ continuous: true, language: "en-US" })
                .then(() => {
                    console.log("[InterviewRoom] Mic started successfully");
                })
                .catch((err) => {
                    console.error("[InterviewRoom] Mic start failed:", err);
                    toast.error("Microphone access failed. Please check permissions.");
                });
        }, 500);
    }, [resetTranscript]);

    const stopMic = useCallback(() => {
        clearTimeout(micStartAttemptRef.current);
        clearTimeout(silenceTimerRef.current);
        SpeechRecognition.stopListening();
    }, []);

    // ── Send conversation to Backend ─────────────
    const sendToAI = useCallback(async (conversationMessages) => {
        setPhase("AI_THINKING");

        const systemPrompt = `You are a world-class technical interviewer at a top tech company. You are conducting a ${difficulty} difficulty technical interview for the role of ${role}.

${jobDescription ? `Job Description Context:\n${jobDescription}\n` : ""}

RULES:
1. Ask ONE question at a time. Wait for the candidate's answer before proceeding.
2. After the candidate answers, briefly evaluate their response (good points, areas to improve) then ask the NEXT question.
3. Keep your responses concise and conversational — you are speaking aloud, not writing an essay.
4. Vary question types: conceptual, scenario-based, system design, coding logic, behavioral.
5. Adapt difficulty based on the candidate's performance.
6. Be encouraging but honest. If an answer is incomplete, probe deeper.
7. Do NOT use markdown formatting, bullet points, or code blocks — speak naturally as a human interviewer would.
8. Start each response with a brief reaction to their answer before moving on.
9. After about 8-10 questions, wrap up the interview with feedback.`;

        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...conversationMessages
        ];

        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: apiMessages })
            });

            const data = await res.json();

            if (!data.status) {
                throw new Error(data.message || "AI request failed");
            }

            const aiText = data.message;
            const aiMessage = { role: "assistant", content: aiText };

            // Update messages and question count
            setMessages(prev => [...prev, aiMessage]);
            setQuestionCount(prev => prev + 1);

            // Speak the response
            setPhase("AI_SPEAKING");
            setCurrentAIText(aiText);
            await speak(aiText);
            setCurrentAIText("");

            // Check if interview is wrapping up
            const qCount = questionCountRef.current + 1;
            if (qCount >= 10 || aiText.toLowerCase().includes("that concludes") || aiText.toLowerCase().includes("end of the interview")) {
                setPhase("ENDED");
                clearInterval(timerRef.current);
                toast.success("Interview completed!");
                return;
            }

            // Now it's the user's turn — start mic
            setPhase("USER_TURN");
            startMic();

        } catch (err) {
            console.error("AI Error:", err);
            toast.error(err.message || "Failed to connect to AI");
            // Let user retry by opening mic
            setPhase("USER_TURN");
            startMic();
        }
    }, [difficulty, role, jobDescription, speak, startMic]);

    // ── Send user's answer ───────────────────────
    const submitUserAnswer = useCallback((userText) => {
        if (!userText || !userText.trim()) return;

        stopMic();
        setLiveTranscript("");

        const userMsg = { role: "user", content: userText.trim() };
        
        // Add user message, then grab latest messages and send
        setMessages(prev => {
            const updated = [...prev, userMsg];
            // Use setTimeout to call sendToAI after state is committed
            setTimeout(() => sendToAI(updated), 50);
            return updated;
        });
    }, [stopMic, sendToAI]);

    // ── Silence Detection ────────────────────────
    useEffect(() => {
        if (phase !== "USER_TURN" || !listening) return;

        // Whenever transcript changes, reset the silence timer
        if (transcript && transcript.trim().length > 0) {
            clearTimeout(silenceTimerRef.current);

            silenceTimerRef.current = setTimeout(() => {
                // Double check we're still in USER_TURN
                if (phaseRef.current === "USER_TURN") {
                    const currentText = transcriptRef.current.trim();
                    if (currentText.length > 0) {
                        console.log("[InterviewRoom] Silence detected, submitting:", currentText);
                        submitUserAnswer(currentText);
                    }
                }
            }, SILENCE_TIMEOUT_MS);
        }

        return () => clearTimeout(silenceTimerRef.current);
    }, [transcript, phase, listening, submitUserAnswer]);

    // ── Start Interview ──────────────────────────
    const startInterview = useCallback(async () => {
        setInterviewStarted(true);

        const greeting = `Hello! Welcome to your ${difficulty} level ${role} interview. I'm your AI interviewer today. Let's begin — I'll ask you a series of technical questions. Take your time, think through each answer, and speak clearly. Let's start with the first question.`;

        const greetMsg = { role: "assistant", content: greeting };
        const readyMsg = { role: "user", content: "I'm ready. Please ask me the first question." };
        setMessages([greetMsg, readyMsg]);

        setPhase("AI_SPEAKING");
        setCurrentAIText(greeting);
        await speak(greeting);
        setCurrentAIText("");

        // Send to get first question
        await sendToAI([greetMsg, readyMsg]);
    }, [difficulty, role, speak, sendToAI]);

    // ── Manual Send (button click) ───────────────
    const handleManualSend = useCallback(() => {
        if (phaseRef.current !== "USER_TURN") return;

        const currentText = transcriptRef.current.trim();
        if (!currentText) {
            toast.error("Please speak your answer first.");
            return;
        }

        console.log("[InterviewRoom] Manual send:", currentText);
        submitUserAnswer(currentText);
    }, [submitUserAnswer]);

    // ── End Interview ────────────────────────────
    const endInterview = useCallback(() => {
        setPhase("ENDED");
        stopMic();
        window.speechSynthesis.cancel();
        clearInterval(timerRef.current);
        setShowExitConfirm(false);
    }, [stopMic]);

    // ── Toggle Mute ──────────────────────────────
    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            if (!prev) {
                window.speechSynthesis.cancel();
            }
            return !prev;
        });
    }, []);

    // ── Skip AI Speaking ─────────────────────────
    const skipSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setCurrentAIText("");
        // The speak() promise will resolve via onerror/onend, then flow continues naturally
    }, []);

    // ── Cleanup on unmount ───────────────────────
    useEffect(() => {
        return () => {
            SpeechRecognition.stopListening();
            window.speechSynthesis.cancel();
            clearInterval(timerRef.current);
            clearTimeout(silenceTimerRef.current);
            clearTimeout(micStartAttemptRef.current);
        };
    }, []);

    // ── Browser Support Check ────────────────────
    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="h-screen bg-[#030303] flex flex-col items-center justify-center text-white gap-6">
                <Navbar />
                <div className="mt-20 flex flex-col items-center gap-4 p-8 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-md text-center">
                    <XCircle size={48} className="text-red-400" />
                    <h2 className="text-2xl font-bold">Browser Not Supported</h2>
                    <p className="text-neutral-400 text-sm">Your browser does not support speech recognition. Please use Chrome or Edge for the best experience.</p>
                    <button onClick={() => navigate("/ai-interview")} className="mt-4 px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition-all">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // ── Phase Indicator Helpers ───────────────────
    const getPhaseLabel = () => {
        switch (phase) {
            case "IDLE": return "Ready to Begin";
            case "AI_THINKING": return "AI is Thinking...";
            case "AI_SPEAKING": return "AI is Speaking...";
            case "USER_TURN": return listening ? "Your Turn — Speak Now" : "Starting Mic...";
            case "PROCESSING": return "Processing...";
            case "ENDED": return "Interview Complete";
            default: return "";
        }
    };

    const getPhaseColor = () => {
        switch (phase) {
            case "IDLE": return "text-neutral-400";
            case "AI_THINKING": return "text-amber-400";
            case "AI_SPEAKING": return "text-blue-400";
            case "USER_TURN": return "text-emerald-400";
            case "PROCESSING": return "text-purple-400";
            case "ENDED": return "text-white";
            default: return "text-neutral-400";
        }
    };

    const getPhaseGlow = () => {
        switch (phase) {
            case "AI_THINKING": return "shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]";
            case "AI_SPEAKING": return "shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]";
            case "USER_TURN": return "shadow-[0_0_40px_-10px_rgba(52,211,153,0.3)]";
            default: return "";
        }
    };

    // ──────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────
    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />

            {/* Ambient Background */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] rounded-full bg-emerald-600/[0.03] blur-[150px] pointer-events-none" />

            {/* Tab Violation Warning Banner */}
            {tabWarningVisible && (
                <div className="fixed top-16 left-0 right-0 z-[100] flex justify-center animate-in slide-in-from-top-2">
                    <div className="mx-4 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-xl flex items-center gap-3 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
                        <ShieldAlert size={20} className="text-red-400 animate-pulse" />
                        <span className="text-red-300 text-sm font-bold">Tab switching detected! Warning {violations}/{MAX_VIOLATIONS}</span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 pt-20 pb-6 px-4 md:px-6 gap-4 overflow-hidden relative z-10">

                {/* LEFT PANEL — Chat Transcript */}
                <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* Chat Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a] relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} className="text-blue-400" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Interview Transcript</span>
                            </div>
                            {interviewStarted && (
                                <div className="flex items-center gap-2 ml-4">
                                    <div className={`w-2 h-2 rounded-full ${phase === "ENDED" ? "bg-neutral-500" : "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                        {phase === "ENDED" ? "Session Ended" : "Live"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {interviewStarted && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <Clock size={14} className="text-neutral-400" />
                                    <span className="text-sm font-mono font-bold text-neutral-300">{formatTime(elapsedTime)}</span>
                                </div>
                            )}
                            {questionCount > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Q{questionCount}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                        {!interviewStarted && (
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
                                        AI Interview Session
                                    </h2>
                                    <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Role: <span className="text-white font-semibold">{role}</span> · 
                                        Difficulty: <span className="text-white font-semibold">{difficulty}</span>
                                    </p>
                                    {jobDescription && (
                                        <p className="text-neutral-600 text-xs mt-2 max-w-sm mx-auto">Job description provided ✓</p>
                                    )}
                                </div>
                                <button
                                    onClick={startInterview}
                                    className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-sm flex items-center gap-3 group hover:bg-neutral-200 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:-translate-y-1"
                                >
                                    <PlayCircle size={20} className="group-hover:scale-110 transition-transform" />
                                    Start Interview
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="mr-3 flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]">
                                            <Bot size={16} className="text-blue-400" />
                                        </div>
                                    </div>
                                )}

                                <div
                                    className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-white/10 border border-white/10 text-white rounded-br-none shadow-[0_5px_20px_-5px_rgba(255,255,255,0.05)]"
                                        : "bg-blue-500/5 border border-blue-500/20 text-neutral-300 rounded-bl-none shadow-[0_5px_20px_-5px_rgba(59,130,246,0.05)]"
                                        }`}
                                >
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

                        {/* Live AI Speaking Text */}
                        {currentAIText && phase === "AI_SPEAKING" && (
                            <div className="flex w-full justify-start animate-in slide-in-from-bottom-2">
                                <div className="mr-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)] animate-pulse">
                                        <Volume2 size={16} className="text-blue-400" />
                                    </div>
                                </div>
                                <div className="max-w-[80%] rounded-2xl rounded-bl-none px-5 py-4 text-sm leading-relaxed bg-blue-500/5 border border-blue-500/20 text-neutral-300 shadow-[0_0_20px_-5px_rgba(59,130,246,0.1)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex gap-1">
                                            <div className="w-1 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                                            <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                                            <div className="w-1 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                                            <div className="w-1 h-5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/60">Speaking</span>
                                    </div>
                                    {currentAIText}
                                </div>
                            </div>
                        )}

                        {/* AI Thinking Indicator */}
                        {phase === "AI_THINKING" && (
                            <div className="flex w-full justify-start animate-in slide-in-from-bottom-2">
                                <div className="mr-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(245,158,11,0.4)]">
                                        <Bot size={16} className="text-amber-400 animate-pulse" />
                                    </div>
                                </div>
                                <div className="rounded-2xl rounded-bl-none px-6 py-4 bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 shadow-inner">
                                    <Loader2 size={16} className="text-amber-400 animate-spin" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400/80">Thinking...</span>
                                </div>
                            </div>
                        )}

                        {/* Live Transcript — what user is currently saying */}
                        {phase === "USER_TURN" && liveTranscript && (
                            <div className="flex w-full justify-end animate-in slide-in-from-bottom-2">
                                <div className="max-w-[80%] rounded-2xl rounded-br-none px-5 py-4 text-sm leading-relaxed bg-emerald-500/5 border border-emerald-500/20 border-dashed text-neutral-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">Listening...</span>
                                    </div>
                                    {liveTranscript}
                                </div>
                                <div className="ml-3 flex-shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(52,211,153,0.4)]">
                                        <Mic size={16} className="text-emerald-400 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interview Ended Summary */}
                        {phase === "ENDED" && (
                            <div className="flex flex-col items-center gap-6 py-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(52,211,153,0.2)]">
                                    <CheckCircle2 size={32} className="text-emerald-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-extrabold text-white mb-2">Interview Complete</h3>
                                    <p className="text-neutral-400 text-sm">Duration: {formatTime(elapsedTime)} · Questions: {questionCount}</p>
                                </div>
                                <button
                                    onClick={() => navigate("/ai-interview")}
                                    className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] flex items-center gap-2"
                                >
                                    <ChevronRight size={16} />
                                    Start New Interview
                                </button>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* RIGHT PANEL — Controls */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-4">

                    {/* Status Card */}
                    <div className={`bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 relative overflow-hidden ${getPhaseGlow()}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Interview Status</div>

                            <div className={`text-lg font-bold mb-4 ${getPhaseColor()}`}>
                                {getPhaseLabel()}
                            </div>

                            {/* Microphone Visualizer */}
                            {phase === "USER_TURN" && listening && (
                                <div className="flex items-center justify-center gap-1 h-12 mb-4">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-emerald-400 rounded-full animate-pulse"
                                            style={{
                                                height: `${Math.random() * 100}%`,
                                                animationDelay: `${i * 80}ms`,
                                                animationDuration: `${600 + Math.random() * 400}ms`
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* AI Thinking Animation */}
                            {phase === "AI_THINKING" && (
                                <div className="flex items-center justify-center h-12 mb-4">
                                    <div className="relative w-12 h-12">
                                        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
                                        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-amber-400/50 animate-[spin_1.5s_linear_infinite_reverse]" />
                                    </div>
                                </div>
                            )}

                            {/* AI Speaking Animation */}
                            {phase === "AI_SPEAKING" && (
                                <div className="flex items-center justify-center gap-1.5 h-12 mb-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1.5 bg-blue-400 rounded-full"
                                            style={{
                                                animation: "soundWave 0.8s ease-in-out infinite alternate",
                                                animationDelay: `${i * 100}ms`,
                                                height: "4px"
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Interview Config Info */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Role</span>
                                    <span className="text-xs font-semibold text-neutral-300">{role}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Difficulty</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                                        difficulty === "Easy" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                                        difficulty === "Medium" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                                        "bg-red-400/10 text-red-400 border border-red-400/20"
                                    }`}>
                                        {difficulty}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Violations</span>
                                    <span className={`text-xs font-bold ${violations > 0 ? "text-red-400" : "text-neutral-500"}`}>
                                        {violations}/{MAX_VIOLATIONS}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    {interviewStarted && phase !== "ENDED" && (
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                            <div className="relative z-10 space-y-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Controls</div>

                                {/* Manual Send Button */}
                                {phase === "USER_TURN" && (
                                    <button
                                        onClick={handleManualSend}
                                        disabled={!liveTranscript.trim()}
                                        className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Send size={14} />
                                        Send Answer
                                    </button>
                                )}

                                {/* Skip AI Speaking */}
                                {phase === "AI_SPEAKING" && (
                                    <button
                                        onClick={skipSpeaking}
                                        className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-all"
                                    >
                                        <PauseCircle size={14} />
                                        Skip Speaking
                                    </button>
                                )}

                                {/* Mute/Unmute */}
                                <button
                                    onClick={toggleMute}
                                    className={`w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                        isMuted
                                            ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                            : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    {isMuted ? "Unmute AI" : "Mute AI Voice"}
                                </button>

                                {/* End Interview */}
                                <button
                                    onClick={() => setShowExitConfirm(true)}
                                    className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={14} />
                                    End Interview
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mic Status Indicator */}
                    {interviewStarted && phase !== "ENDED" && (
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Microphone</div>

                                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    phase === "USER_TURN" && listening
                                        ? "bg-emerald-500/20 border-2 border-emerald-500/40 shadow-[0_0_30px_-5px_rgba(52,211,153,0.4)]"
                                        : "bg-white/5 border-2 border-white/10"
                                }`}>
                                    {phase === "USER_TURN" && listening && (
                                        <>
                                            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
                                            <div className="absolute -inset-2 rounded-full border border-emerald-400/10 animate-pulse" />
                                        </>
                                    )}
                                    {phase === "USER_TURN" && listening
                                        ? <Mic size={24} className="text-emerald-400 relative z-10" />
                                        : <MicOff size={24} className="text-neutral-500 relative z-10" />
                                    }
                                </div>

                                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                    phase === "USER_TURN" && listening ? "text-emerald-400" : "text-neutral-500"
                                }`}>
                                    {phase === "USER_TURN" && listening ? "Active — Speak Now" : "Standby"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Exit Confirmation Modal */}
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
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Continue
                                </button>
                                <button
                                    onClick={endInterview}
                                    className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                >
                                    End Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animation for sound wave */}
            <style>{`
                @keyframes soundWave {
                    0% { height: 4px; }
                    100% { height: 28px; }
                }
            `}</style>
        </div>
    );
}