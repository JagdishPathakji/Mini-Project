import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL } from "../config";
import {
    Mic, MicOff, Square, Send, Loader2, ChevronDown, ChevronUp,
    Sparkles, Star, MessageSquare, Tag, ArrowRight, Trophy,
    Volume2, AlertCircle, CheckCircle, Clock, Brain, X, BarChart3
} from "lucide-react";

// ── State Machine ───────────────────────────────────────────────────
const STATES = {
    INITIALIZING: "INITIALIZING",
    IDLE: "IDLE",           // Waiting for user to start recording
    RECORDING: "RECORDING",
    TRANSCRIBING: "TRANSCRIBING",
    EVALUATING: "EVALUATING",
    ERROR: "ERROR",
};

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, experienceLevel, jd } = location.state || {};

    // Core state
    const [phase, setPhase] = useState(STATES.INITIALIZING);
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [currentSkillTag, setCurrentSkillTag] = useState("");
    const [extractedSkills, setExtractedSkills] = useState([]);
    const [transcript, setTranscript] = useState([]); // { type: 'question'|'answer'|'evaluation', ... }
    const [conversationHistory, setConversationHistory] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSummary, setShowSummary] = useState(false);

    // Recording
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    // UI refs
    const chatEndRef = useRef(null);
    const [expandedEval, setExpandedEval] = useState(null);

    // ── Auto-scroll chat ────────────────────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    // ── Redirect if no state ────────────────────────────────────────
    useEffect(() => {
        if (!role || !experienceLevel) {
            navigate("/ai-interview", { replace: true });
        }
    }, [role, experienceLevel, navigate]);

    // ── Start interview — get first question ────────────────────────
    useEffect(() => {
        if (!role) return;
        const startInterview = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE_URL}/user/interview/start`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ role, experienceLevel, jd }),
                });
                const data = await res.json();

                if (data.status) {
                    setCurrentQuestion(data.question);
                    setCurrentSkillTag(data.skillTag || "General");
                    if (data.extractedSkills?.length > 0) {
                        setExtractedSkills(data.extractedSkills);
                    }
                    setTranscript([{
                        type: "question",
                        question: data.question,
                        skillTag: data.skillTag || "General",
                        id: Date.now(),
                    }]);
                    setPhase(STATES.IDLE);
                } else {
                    throw new Error(data.message || "Failed to start interview");
                }
            } catch (err) {
                console.error("Start interview error:", err);
                setErrorMsg(err.message);
                setPhase(STATES.ERROR);
            }
        };

        startInterview();
    }, [role, experienceLevel, jd]);

    // ── Recording timer ─────────────────────────────────────────────
    useEffect(() => {
        if (phase === STATES.RECORDING) {
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // ── Cleanup on unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    // ── Start Recording ─────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm",
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                handleAudioReady();
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100);
            setPhase(STATES.RECORDING);
        } catch (err) {
            console.error("Mic access error:", err);
            setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
            setPhase(STATES.ERROR);
        }
    }, []);

    // ── Stop Recording ──────────────────────────────────────────────
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    }, []);

    // ── Process audio after recording stops ─────────────────────────
    const handleAudioReady = async () => {
        setPhase(STATES.TRANSCRIBING);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Step 1: Transcribe via Whisper
        let transcribedText = "";
        try {
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");

            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/user/interview/transcribe`, {
                method: "POST",
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            const data = await res.json();
            if (data.status) {
                transcribedText = data.text;
            } else {
                throw new Error(data.message || "Transcription failed");
            }
        } catch (err) {
            console.error("Transcription error:", err);
            setErrorMsg("Failed to transcribe audio: " + err.message);
            setPhase(STATES.ERROR);
            return;
        }

        // Add user answer to transcript
        const answerId = Date.now();
        setTranscript((prev) => [
            ...prev,
            { type: "answer", text: transcribedText, id: answerId },
        ]);

        // Step 2: Evaluate via AI
        setPhase(STATES.EVALUATING);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/user/interview/evaluate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    question: currentQuestion,
                    userAnswer: transcribedText,
                    role,
                    experienceLevel,
                    jd,
                    conversationHistory,
                }),
            });

            const data = await res.json();
            if (data.status) {
                const evalId = Date.now();

                // Add evaluation to transcript
                setTranscript((prev) => [
                    ...prev,
                    {
                        type: "evaluation",
                        score: data.score,
                        feedback: data.feedback,
                        improvedAnswer: data.improvedAnswer,
                        id: evalId,
                    },
                    {
                        type: "question",
                        question: data.nextQuestion,
                        skillTag: data.skillTag || "General",
                        id: evalId + 1,
                    },
                ]);

                // Update state
                setConversationHistory((prev) => [
                    ...prev,
                    { question: currentQuestion, answer: transcribedText },
                ]);
                setCurrentQuestion(data.nextQuestion);
                setCurrentSkillTag(data.skillTag || "General");
                setPhase(STATES.IDLE);
            } else {
                throw new Error(data.message || "Evaluation failed");
            }
        } catch (err) {
            console.error("Evaluation error:", err);
            setErrorMsg("Failed to evaluate answer: " + err.message);
            setPhase(STATES.ERROR);
        }
    };

    // ── Retry after error ───────────────────────────────────────────
    const handleRetry = () => {
        setErrorMsg("");
        setPhase(STATES.IDLE);
    };

    // ── End interview ───────────────────────────────────────────────
    const handleEndInterview = () => {
        setShowSummary(true);
    };

    // ── Calculate summary stats ─────────────────────────────────────
    const evaluations = transcript.filter((t) => t.type === "evaluation");
    const avgScore = evaluations.length > 0
        ? (evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length).toFixed(1)
        : 0;

    const getScoreColor = (score) => {
        if (score >= 8) return "text-emerald-400";
        if (score >= 6) return "text-amber-400";
        if (score >= 4) return "text-orange-400";
        return "text-red-400";
    };

    const getScoreBg = (score) => {
        if (score >= 8) return "bg-emerald-400/10 border-emerald-400/30";
        if (score >= 6) return "bg-amber-400/10 border-amber-400/30";
        if (score >= 4) return "bg-orange-400/10 border-orange-400/30";
        return "bg-red-400/10 border-red-400/30";
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    if (!role) return null;

    // ════════════════════════════════════════════════════════════════
    //  SUMMARY SCREEN
    // ════════════════════════════════════════════════════════════════
    if (showSummary) {
        return (
            <div className="min-h-screen bg-[#030303] text-white font-sans relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/8 blur-[120px] pointer-events-none" />
                <Navbar />

                <main className="pt-28 pb-24 max-w-4xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-12">
                        <Trophy size={48} className="mx-auto mb-4 text-amber-400" />
                        <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent mb-4">
                            Interview Complete
                        </h1>
                        <p className="text-neutral-400">Here's how you performed</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                            <p className="text-3xl font-bold text-white mb-1">{evaluations.length}</p>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Questions Answered</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                            <p className={`text-3xl font-bold mb-1 ${getScoreColor(parseFloat(avgScore))}`}>{avgScore}/10</p>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Average Score</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                            <p className="text-3xl font-bold text-white mb-1">{role}</p>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Role</p>
                        </div>
                    </div>

                    {/* Extracted Skills */}
                    {extractedSkills.length > 0 && (
                        <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                            <h3 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Skills Tested</h3>
                            <div className="flex flex-wrap gap-2">
                                {extractedSkills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Per-Question Breakdown */}
                    <div className="space-y-4 mb-10">
                        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Question-by-Question Breakdown</h3>
                        {transcript.filter(t => t.type === "question").map((q, idx) => {
                            // Find corresponding answer and evaluation
                            const qIndex = transcript.indexOf(q);
                            const answer = transcript.find((t, i) => i > qIndex && t.type === "answer");
                            const evaluation = transcript.find((t, i) => i > qIndex && t.type === "evaluation");
                            if (!answer || !evaluation) return null;

                            return (
                                <div key={q.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-neutral-500">Q{idx + 1}</span>
                                            {q.skillTag && (
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-neutral-400">
                                                    {q.skillTag}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-lg font-bold ${getScoreColor(evaluation.score)}`}>
                                            {evaluation.score}/10
                                        </span>
                                    </div>
                                    <p className="text-sm text-white mb-2">{q.question}</p>
                                    <p className="text-xs text-neutral-400 mb-2"><strong className="text-neutral-300">Your answer:</strong> {answer.text}</p>
                                    <p className="text-xs text-neutral-400"><strong className="text-neutral-300">Feedback:</strong> {evaluation.feedback}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => navigate("/ai-interview")}
                            className="px-8 py-3 rounded-2xl bg-white text-black font-bold hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
                        >
                            New Interview
                        </button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all hover:-translate-y-0.5"
                        >
                            Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  MAIN INTERVIEW ROOM
    // ════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden flex flex-col">
            {/* Ambient Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/8 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/6 blur-[120px] pointer-events-none" />

            <Navbar />

            {/* ── Header Bar ── */}
            <div className="pt-20 px-6 pb-4 relative z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                            <Brain size={14} className="text-violet-400" />
                            <span className="text-xs text-neutral-400 font-medium">{role}</span>
                        </div>
                        {currentSkillTag && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                                <Tag size={12} className="text-cyan-400" />
                                <span className="text-xs text-neutral-400 font-medium">{currentSkillTag}</span>
                            </div>
                        )}
                        {evaluations.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                                <BarChart3 size={12} className="text-amber-400" />
                                <span className="text-xs text-neutral-400 font-medium">Avg: {avgScore}/10</span>
                            </div>
                        )}
                    </div>
                    <button
                        id="end-interview-btn"
                        onClick={handleEndInterview}
                        disabled={evaluations.length === 0}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${evaluations.length > 0
                            ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
                            : "bg-white/5 border border-white/5 text-neutral-600 cursor-not-allowed"
                            }`}
                    >
                        End Interview
                    </button>
                </div>

                {/* Extracted Skills Pills */}
                {extractedSkills.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-3 flex flex-wrap gap-1.5">
                        {extractedSkills.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-violet-500/8 border border-violet-500/15 text-[10px] text-violet-300/80">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Chat Transcript ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 relative z-10">
                <div className="max-w-4xl mx-auto space-y-4">
                    {transcript.map((item) => {
                        if (item.type === "question") {
                            return (
                                <div key={item.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1">
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                    <div className="flex-1 max-w-[85%]">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-semibold text-neutral-400">Interviewer</span>
                                            {item.skillTag && (
                                                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">
                                                    {item.skillTag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06]">
                                            <p className="text-sm text-white leading-relaxed">{item.question}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "answer") {
                            return (
                                <div key={item.id} className="flex gap-3 items-start justify-end">
                                    <div className="flex-1 max-w-[85%]">
                                        <div className="flex items-center gap-2 mb-1.5 justify-end">
                                            <span className="text-xs font-semibold text-neutral-400">You</span>
                                        </div>
                                        <div className="p-4 rounded-2xl rounded-tr-sm bg-violet-500/10 border border-violet-500/20 ml-auto">
                                            <p className="text-sm text-white leading-relaxed">{item.text}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center shrink-0 mt-1 border border-white/10">
                                        <Mic size={14} className="text-neutral-400" />
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "evaluation") {
                            const isExpanded = expandedEval === item.id;
                            return (
                                <div key={item.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 shrink-0" /> {/* spacer */}
                                    <div className="flex-1 max-w-[85%]">
                                        <div
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${getScoreBg(item.score)}`}
                                            onClick={() => setExpandedEval(isExpanded ? null : item.id)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center gap-1.5 text-sm font-bold ${getScoreColor(item.score)}`}>
                                                        <Star size={14} />
                                                        <span>{item.score}/10</span>
                                                    </div>
                                                    <span className="text-xs text-neutral-500">Score</span>
                                                </div>
                                                {isExpanded ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                                            </div>

                                            <p className="text-xs text-neutral-300 leading-relaxed">{item.feedback}</p>

                                            {isExpanded && item.improvedAnswer && (
                                                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-2 flex items-center gap-1.5">
                                                        <CheckCircle size={10} />
                                                        Improved Answer
                                                    </p>
                                                    <p className="text-xs text-neutral-400 leading-relaxed">{item.improvedAnswer}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })}

                    {/* Status indicator */}
                    {(phase === STATES.TRANSCRIBING || phase === STATES.EVALUATING || phase === STATES.INITIALIZING) && (
                        <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1">
                                <Loader2 size={14} className="text-white animate-spin" />
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06]">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    <span className="text-xs text-neutral-400">
                                        {phase === STATES.INITIALIZING && "Starting interview..."}
                                        {phase === STATES.TRANSCRIBING && "Transcribing your audio..."}
                                        {phase === STATES.EVALUATING && "AI is evaluating..."}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* ── Bottom Control Bar ── */}
            <div className="relative z-10 border-t border-white/[0.05] bg-[#030303]/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-center gap-6">

                    {/* Error state */}
                    {phase === STATES.ERROR && (
                        <div className="flex items-center gap-4 w-full">
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-300 truncate">{errorMsg}</p>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="px-6 py-3 rounded-2xl bg-white/10 border border-white/10 text-sm font-semibold text-white hover:bg-white/15 transition-all shrink-0"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Idle — ready to record */}
                    {phase === STATES.IDLE && (
                        <div className="flex flex-col items-center gap-3">
                            <button
                                id="mic-btn"
                                onClick={startRecording}
                                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
                            >
                                <Mic size={24} className="text-white" />
                            </button>
                            <span className="text-xs text-neutral-500">Tap to answer</span>
                        </div>
                    )}

                    {/* Recording */}
                    {phase === STATES.RECORDING && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                {/* Pulsing ring */}
                                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                                <div className="absolute -inset-2 rounded-full border-2 border-red-500/30 animate-pulse" />
                                <button
                                    id="stop-btn"
                                    onClick={stopRecording}
                                    className="relative w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] cursor-pointer"
                                >
                                    <Square size={20} className="text-white" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs text-red-400 font-mono font-semibold">{formatTime(recordingTime)}</span>
                                <span className="text-xs text-neutral-500">Recording...</span>
                            </div>
                        </div>
                    )}

                    {/* Transcribing / Evaluating */}
                    {(phase === STATES.TRANSCRIBING || phase === STATES.EVALUATING || phase === STATES.INITIALIZING) && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <Loader2 size={24} className="text-violet-400 animate-spin" />
                            </div>
                            <span className="text-xs text-neutral-500">
                                {phase === STATES.INITIALIZING && "Preparing..."}
                                {phase === STATES.TRANSCRIBING && "Transcribing..."}
                                {phase === STATES.EVALUATING && "Evaluating..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
