import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL } from "../config";
import {
    Mic, Square, Loader2, ChevronDown, ChevronUp,
    Sparkles, Star, Tag, Trophy, Volume2, VolumeX,
    AlertCircle, CheckCircle, Brain, BarChart3
} from "lucide-react";

// ── State Machine ───────────────────────────────────────────────────
const STATES = {
    INITIALIZING: "INITIALIZING",
    SPEAKING: "SPEAKING",       // AI is reading the question aloud
    IDLE: "IDLE",               // Waiting for user to start recording
    RECORDING: "RECORDING",     // User is speaking (audio being captured)
    TRANSCRIBING: "TRANSCRIBING", // Audio sent to Groq Whisper
    EVALUATING: "EVALUATING",   // Answer sent to AI for evaluation
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
    const [transcript, setTranscript] = useState([]);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSummary, setShowSummary] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);

    // Recording state
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    // Refs — these keep the latest values accessible inside stale closures
    const synthRef = useRef(window.speechSynthesis);
    const chatEndRef = useRef(null);
    const [expandedEval, setExpandedEval] = useState(null);
    const [tabChanges, setTabChanges] = useState(0);

    const handleEndInterviewRef = useRef(null);

    // Increment tab change counter and auto‑end interview after 4 visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !showSummary) {
                setTabChanges(prev => {
                    const newCount = prev + 1;
                    if (newCount > 4) {
                        // Exceeded allowed changes – finish interview
                        if (handleEndInterviewRef.current) handleEndInterviewRef.current();
                    }
                    return newCount;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [showSummary]);
    const isMountedRef = useRef(true);
    const currentQuestionRef = useRef("");
    const conversationHistoryRef = useRef([]);

    // Keep refs in sync with state
    useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
    useEffect(() => { conversationHistoryRef.current = conversationHistory; }, [conversationHistory]);

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

    // ── Cleanup on unmount ──────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            synthRef.current.cancel();
            clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

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

    // ══════════════════════════════════════════════════════════════════
    //  TEXT-TO-SPEECH — AI speaks the question aloud
    // ══════════════════════════════════════════════════════════════════
    const speakText = useCallback((text, onDone) => {
        synthRef.current.cancel();

        if (!ttsEnabled) {
            onDone?.();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = "en-US";

        // Pick the best available voice
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(v =>
            v.name.includes("Google") && v.lang.startsWith("en")
        ) || voices.find(v => v.lang.startsWith("en") && v.localService === false)
            || voices.find(v => v.lang.startsWith("en"));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
            if (isMountedRef.current) onDone?.();
        };
        utterance.onerror = () => {
            if (isMountedRef.current) onDone?.();
        };

        synthRef.current.speak(utterance);
    }, [ttsEnabled]);

    // ══════════════════════════════════════════════════════════════════
    //  Start Interview — get first question, then speak it
    // ══════════════════════════════════════════════════════════════════
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

                if (!isMountedRef.current) return;

                if (data.status) {
                    const question = data.question;
                    setCurrentQuestion(question);
                    setCurrentSkillTag(data.skillTag || "General");
                    if (data.extractedSkills?.length > 0) {
                        setExtractedSkills(data.extractedSkills);
                    }
                    setTranscript([{
                        type: "question",
                        question,
                        skillTag: data.skillTag || "General",
                        id: Date.now(),
                    }]);

                    // Speak the question aloud
                    setPhase(STATES.SPEAKING);
                    speakText(question, () => {
                        if (isMountedRef.current) setPhase(STATES.IDLE);
                    });
                } else {
                    throw new Error(data.message || "Failed to start interview");
                }
            } catch (err) {
                console.error("Start interview error:", err);
                if (isMountedRef.current) {
                    setErrorMsg(err.message);
                    setPhase(STATES.ERROR);
                }
            }
        };

        startInterview();
    }, [role, experienceLevel, jd, speakText]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!showSummary) {
                e.preventDefault();
                e.returnValue = "Are you sure you want to leave the interview?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [showSummary]);

    // ══════════════════════════════════════════════════════════════════
    //  START RECORDING — capture mic audio via MediaRecorder
    // ══════════════════════════════════════════════════════════════════
    const startRecording = useCallback(async () => {
        try {
            synthRef.current.cancel(); // stop any TTS

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
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
            // NO timeslice — records as one continuous blob for better quality
            mediaRecorder.start();
            setPhase(STATES.RECORDING);
        } catch (err) {
            console.error("Mic access error:", err);
            setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
            setPhase(STATES.ERROR);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    }, []);

    // ══════════════════════════════════════════════════════════════════
    //  PROCESS AUDIO — send to Groq Whisper, then evaluate
    // ══════════════════════════════════════════════════════════════════
    const handleAudioReady = async () => {
        if (!isMountedRef.current) return;

        setPhase(STATES.TRANSCRIBING);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (audioBlob.size < 100) {
            console.error("Audio blob too small:", audioBlob.size);
            setErrorMsg("Recording failed: Audio was empty or too short. Please try speaking again.");
            setPhase(STATES.IDLE);
            return;
        }

        // Step 1: Transcribe via Groq Whisper
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
            if (isMountedRef.current) {
                setErrorMsg("Failed to transcribe audio: " + err.message);
                setPhase(STATES.ERROR);
            }
            return;
        }

        if (!isMountedRef.current) return;

        // Add user answer to transcript
        setTranscript((prev) => [
            ...prev,
            { type: "answer", text: transcribedText, id: Date.now() },
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
                    question: currentQuestionRef.current,
                    userAnswer: transcribedText,
                    role,
                    experienceLevel,
                    jd,
                    conversationHistory: conversationHistoryRef.current,
                }),
            });

            const data = await res.json();
            if (!isMountedRef.current) return;

            if (data.status) {
                const evalId = Date.now();

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

                setConversationHistory((prev) => [
                    ...prev,
                    { question: currentQuestionRef.current, answer: transcribedText },
                ]);
                setCurrentQuestion(data.nextQuestion);
                setCurrentSkillTag(data.skillTag || "General");

                // Speak the next question aloud
                setPhase(STATES.SPEAKING);
                speakText(data.nextQuestion, () => {
                    if (isMountedRef.current) setPhase(STATES.IDLE);
                });
            } else {
                throw new Error(data.message || "Evaluation failed");
            }
        } catch (err) {
            console.error("Evaluation error:", err);
            if (isMountedRef.current) {
                setErrorMsg("Failed to evaluate answer: " + err.message);
                setPhase(STATES.ERROR);
            }
        }
    };

    // ── Retry ───────────────────────────────────────────────────────
    const handleRetry = () => {
        setErrorMsg("");
        setPhase(STATES.IDLE);
    };

    // ── End interview ───────────────────────────────────────────────
    const handleEndInterview = () => {
        synthRef.current.cancel();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setShowSummary(true);
    };

    useEffect(() => {
        handleEndInterviewRef.current = handleEndInterview;
    });

    // ── Stats ───────────────────────────────────────────────────────
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

    const getScoreGrade = (score) => {
        if (score >= 9) return "Excellent";
        if (score >= 7) return "Good";
        if (score >= 5) return "Average";
        if (score >= 3) return "Needs Work";
        return "Poor";
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    if (!role) return null;

    // ════════════════════════════════════════════════════════════════
    //  SUMMARY SCREEN
    // ════════════════════════════════════════════════════════════════
    if (showSummary) {
        const totalScore = evaluations.reduce((s, e) => s + e.score, 0);
        return (
            <div className="min-h-screen bg-[#030303] text-white font-sans relative overflow-x-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/8 blur-[120px] pointer-events-none" />
                <Navbar />
                <div className="h-20 shrink-0 w-full" />

                <main className="pt-12 pb-24 max-w-4xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                            <Trophy size={36} className="text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent mb-3">
                            Interview Complete
                        </h1>
                        <p className="text-neutral-400 text-sm">Here's your performance breakdown</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                            <p className="text-2xl font-bold text-white mb-1">{evaluations.length}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Questions</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                            <p className={`text-2xl font-bold mb-1 ${getScoreColor(parseFloat(avgScore))}`}>{avgScore}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Avg Score</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                            <p className="text-2xl font-bold text-white mb-1">{totalScore}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Total Points</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                            <p className={`text-2xl font-bold mb-1 ${getScoreColor(parseFloat(avgScore))}`}>{getScoreGrade(parseFloat(avgScore))}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Grade</p>
                        </div>
                    </div>

                    {/* Extracted Skills */}
                    {extractedSkills.length > 0 && (
                        <div className="mb-8 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <h3 className="text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Skills Assessed</h3>
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
                    <div className="space-y-3 mb-10">
                        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Detailed Breakdown</h3>
                        {transcript.filter(t => t.type === "question").map((q, idx) => {
                            const qIndex = transcript.indexOf(q);
                            const answer = transcript.find((t, i) => i > qIndex && t.type === "answer");
                            const evaluation = transcript.find((t, i) => i > qIndex && t.type === "evaluation");
                            if (!answer || !evaluation) return null;

                            return (
                                <div key={q.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-neutral-500 font-bold">{idx + 1}</span>
                                            {q.skillTag && (
                                                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-[10px] text-violet-300">
                                                    {q.skillTag}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${getScoreBg(evaluation.score)}`}>
                                            <Star size={12} className={getScoreColor(evaluation.score)} />
                                            <span className={`text-sm font-bold ${getScoreColor(evaluation.score)}`}>{evaluation.score}/10</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-white mb-3 font-medium">{q.question}</p>
                                    <div className="space-y-2 text-xs">
                                        <p className="text-neutral-400"><span className="text-neutral-300 font-semibold">Your answer:</span> {answer.text}</p>
                                        <p className="text-neutral-400"><span className="text-neutral-300 font-semibold">Feedback:</span> {evaluation.feedback}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => navigate("/ai-interview")}
                            className="px-8 py-3 rounded-2xl bg-white text-black font-bold hover:bg-neutral-200 transition-all hover:-translate-y-0.5 shadow-[0_0_30px_-8px_rgba(255,255,255,0.15)]"
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
        <div className="min-h-[100dvh] bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-x-hidden overflow-y-auto flex flex-col">
            {/* Ambient Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/8 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/6 blur-[120px] pointer-events-none" />

            <Navbar />
            <div className="h-16 shrink-0 w-full" />

            {/* ── Header Bar ── */}
            <div className="pt-6 px-6 pb-3 relative z-10 border-b border-white/[0.04]">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                            <Brain size={14} className="text-violet-400" />
                            <span className="text-xs text-neutral-300 font-medium">{role}</span>
                        </div>
                        {currentSkillTag && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                                <Tag size={12} className="text-cyan-400" />
                                <span className="text-xs text-neutral-300 font-medium">{currentSkillTag}</span>
                            </div>
                        )}
                        {evaluations.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                                <BarChart3 size={12} className="text-amber-400" />
                                <span className="text-xs text-neutral-300 font-medium">Avg: {avgScore}/10</span>
                            </div>
                        )}
                        {tabChanges > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]">
                                <AlertCircle size={12} className="text-red-400 animate-pulse" />
                                <span className="text-xs text-red-400 font-bold">Warnings: {tabChanges}/4</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* TTS toggle */}
                        <button
                            onClick={() => { setTtsEnabled(e => !e); synthRef.current.cancel(); }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${ttsEnabled
                                ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                                : "bg-white/5 border-white/10 text-neutral-500"
                                }`}
                            title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
                        >
                            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>
                        <button
                            id="end-interview-btn"
                            onClick={handleEndInterview}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_-3px_rgba(220,38,38,0.5)] transition-all cursor-pointer"
                        >
                            Exit Interview
                        </button>
                    </div>
                </div>

                {/* Extracted Skills Pills */}
                {extractedSkills.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-3 flex flex-wrap gap-1.5 pb-2">
                        {extractedSkills.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-violet-500/8 border border-violet-500/15 text-[10px] text-violet-300/80">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Chat Transcript ── */}
            <div className="flex-1 px-6 py-6 pb-6 relative z-10 overflow-y-auto scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-5 flex flex-col">
                    {transcript.map((item) => {
                        if (item.type === "question") {
                            return (
                                <div key={item.id} className="flex gap-3 items-start animate-fadeIn">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                        <Sparkles size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 max-w-[80%]">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-semibold text-violet-400">Interviewer</span>
                                            {item.skillTag && (
                                                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">
                                                    {item.skillTag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                                            <p className="text-sm text-white leading-relaxed">{item.question}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "answer") {
                            return (
                                <div key={item.id} className="flex gap-3 items-start justify-end animate-fadeIn">
                                    <div className="flex-1 max-w-[80%]">
                                        <div className="flex items-center gap-2 mb-1.5 justify-end">
                                            <span className="text-xs font-semibold text-cyan-400">You</span>
                                        </div>
                                        <div className="p-4 rounded-2xl rounded-tr-md bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                                            <p className="text-sm text-white leading-relaxed">{item.text}</p>
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                                        <Mic size={14} className="text-neutral-400" />
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "evaluation") {
                            const isExpanded = expandedEval === item.id;
                            return (
                                <div key={item.id} className="flex gap-3 items-start animate-fadeIn">
                                    <div className="w-9 h-9 shrink-0" />
                                    <div className="flex-1 max-w-[80%]">
                                        <div
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:brightness-110 ${getScoreBg(item.score)}`}
                                            onClick={() => setExpandedEval(isExpanded ? null : item.id)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center gap-1.5 text-sm font-bold ${getScoreColor(item.score)}`}>
                                                        <Star size={14} />
                                                        <span>{item.score}/10</span>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${getScoreColor(item.score)}`}>
                                                        {getScoreGrade(item.score)}
                                                    </span>
                                                </div>
                                                {isExpanded
                                                    ? <ChevronUp size={14} className="text-neutral-500" />
                                                    : <ChevronDown size={14} className="text-neutral-500" />
                                                }
                                            </div>

                                            <p className="text-xs text-neutral-300 leading-relaxed">{item.feedback}</p>

                                            {isExpanded && item.improvedAnswer && (
                                                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                                                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-2 flex items-center gap-1.5">
                                                        <CheckCircle size={10} className="text-emerald-400" />
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

                    {/* Status indicators in chat */}
                    {(phase === STATES.SPEAKING || phase === STATES.TRANSCRIBING || phase === STATES.EVALUATING || phase === STATES.INITIALIZING) && (
                        <div className="flex gap-3 items-start animate-fadeIn">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                {phase === STATES.SPEAKING
                                    ? <Volume2 size={14} className="text-white animate-pulse" />
                                    : <Loader2 size={14} className="text-white animate-spin" />
                                }
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    <span className="text-xs text-neutral-400">
                                        {phase === STATES.INITIALIZING && "Preparing your interview..."}
                                        {phase === STATES.SPEAKING && "AI is speaking the question..."}
                                        {phase === STATES.TRANSCRIBING && "Transcribing your audio..."}
                                        {phase === STATES.EVALUATING && "Evaluating your answer..."}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} className="h-4" />
                </div>
            </div>

            {/* ── Bottom Control Bar ── */}
            <div className="shrink-0 w-full z-20 border-t border-white/[0.06] bg-[#030303]/90 backdrop-blur-2xl relative">
                <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-center gap-6 relative">

                    {/* EXIT BUTTON - ALWAYS VISIBLE */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
                        <button
                            onClick={handleEndInterview}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all"
                        >
                            Exit Interview
                        </button>
                    </div>

                    {/* Error */}
                    {phase === STATES.ERROR && (
                        <div className="flex items-center gap-4 w-full">
                            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-300 line-clamp-2">{errorMsg}</p>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="px-6 py-3 rounded-2xl bg-white/10 border border-white/10 text-sm font-semibold text-white hover:bg-white/15 transition-all shrink-0 cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* SPEAKING — AI is talking */}
                    {phase === STATES.SPEAKING && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="absolute -inset-3 rounded-full border-2 border-violet-500/20 animate-pulse" />
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
                                    <Volume2 size={24} className="text-violet-400 animate-pulse" />
                                </div>
                            </div>
                            <span className="text-xs text-violet-400 font-medium">AI is speaking...</span>
                            <button
                                onClick={() => { synthRef.current.cancel(); setPhase(STATES.IDLE); }}
                                className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                            >
                                Skip →
                            </button>
                        </div>
                    )}

                    {/* IDLE — ready to record */}
                    {phase === STATES.IDLE && (
                        <div className="flex flex-col items-center gap-3">
                            <button
                                id="mic-btn"
                                onClick={startRecording}
                                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_-5px_rgba(139,92,246,0.6)] cursor-pointer"
                            >
                                <Mic size={24} className="text-white" />
                            </button>
                            <span className="text-xs text-neutral-500">Tap to record your answer</span>
                        </div>
                    )}

                    {/* RECORDING — user is speaking */}
                    {phase === STATES.RECORDING && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="absolute -inset-1 rounded-full bg-red-500/20 animate-ping" />
                                <div className="absolute -inset-3 rounded-full border-2 border-red-500/25 animate-pulse" />
                                <div className="absolute -inset-5 rounded-full border border-red-500/10 animate-pulse" style={{ animationDelay: "500ms" }} />
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
                                <span className="text-xs text-red-400 font-mono font-bold">{formatTime(recordingTime)}</span>
                                <span className="text-xs text-neutral-500">Recording...</span>
                            </div>
                        </div>
                    )}

                    {/* TRANSCRIBING / EVALUATING / INITIALIZING */}
                    {(phase === STATES.TRANSCRIBING || phase === STATES.EVALUATING || phase === STATES.INITIALIZING) && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <Loader2 size={24} className="text-violet-400 animate-spin" />
                            </div>
                            <span className="text-xs text-neutral-500">
                                {phase === STATES.INITIALIZING && "Starting interview..."}
                                {phase === STATES.TRANSCRIBING && "Transcribing via Whisper..."}
                                {phase === STATES.EVALUATING && "AI is thinking..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Fade-in animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out;
                }
            `}</style>
        </div>
    );
}
