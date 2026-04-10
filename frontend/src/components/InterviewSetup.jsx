import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import {
    Mic, Briefcase, GraduationCap, FileText, Upload, ChevronRight, Sparkles,
    X, Zap, Brain, Target, Loader2, CheckCircle2
} from "lucide-react";

const EXPERIENCE_LEVELS = [
    { value: "fresher", label: "Fresher", desc: "0-1 year" },
    { value: "junior", label: "Junior", desc: "1-3 years" },
    { value: "mid", label: "Mid-Level", desc: "3-5 years" },
    { value: "senior", label: "Senior", desc: "5+ years" },
];

const ROLE_SUGGESTIONS = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer",
    "DevOps Engineer", "Data Scientist", "ML Engineer",
    "Mobile Developer", "Cloud Architect", "Software Engineer",
    "QA Engineer", "Product Manager", "System Administrator",
];

export default function InterviewSetup() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [role, setRole] = useState("");
    const [experienceLevel, setExperienceLevel] = useState("");
    const [jd, setJd] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [fileName, setFileName] = useState("");
    const [isStarting, setIsStarting] = useState(false);

    const filteredSuggestions = ROLE_SUGGESTIONS.filter((r) =>
        r.toLowerCase().includes(role.toLowerCase()) && role.length > 0
    );

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);

        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
            const text = await file.text();
            setJd(text);
        } else {
            // For other formats, read as text (basic fallback)
            const text = await file.text();
            setJd(text);
        }
    };

    const handleRemoveFile = () => {
        setFileName("");
        setJd("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleStartInterview = () => {
        if (!role.trim() || !experienceLevel) return;
        setIsStarting(true);

        // Navigate to interview room with state
        setTimeout(() => {
            navigate("/interview-room", {
                state: {
                    role: role.trim(),
                    experienceLevel,
                    jd: jd.trim(),
                },
            });
        }, 600);
    };

    const isReady = role.trim().length > 0 && experienceLevel;

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            {/* Ambient Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/8 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-emerald-600/[0.04] blur-[150px] pointer-events-none" />

            <Navbar />

            <main className="pt-32 pb-24 max-w-7xl mx-auto px-6 relative z-10">
                {/* Hero */}
                <div className="flex flex-col items-center text-center mb-16">
                    <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-neutral-400 tracking-wider uppercase font-semibold">
                        <Mic size={14} className="text-violet-400" />
                        <span>Voice-Powered Interview</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                        AI Mock Interview
                    </h1>
                    <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Speak your answers naturally. Our AI listens via Whisper, evaluates in real-time, and adapts questions to your skills.
                    </p>
                </div>

                {/* Setup Cards */}
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                        {/* ─── Role Input ─── */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-violet-400 shadow-inner">
                                    <Briefcase size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Target Role</h2>
                            </div>
                            <div className="relative z-10">
                                <input
                                    id="role-input"
                                    type="text"
                                    value={role}
                                    onChange={(e) => { setRole(e.target.value); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="e.g. Frontend Developer"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                />
                                {showSuggestions && filteredSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                                        {filteredSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => { setRole(s); setShowSuggestions(false); }}
                                                className="w-full px-5 py-3 text-left text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Experience Level ─── */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-cyan-400 shadow-inner">
                                    <GraduationCap size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Experience Level</h2>
                            </div>
                            <div className="flex flex-col gap-3 relative z-10">
                                {EXPERIENCE_LEVELS.map((lvl) => {
                                    const isActive = experienceLevel === lvl.value;
                                    return (
                                        <button
                                            key={lvl.value}
                                            id={`exp-${lvl.value}`}
                                            onClick={() => setExperienceLevel(lvl.value)}
                                            className={`relative px-5 py-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${isActive
                                                ? "border-cyan-500/30 bg-cyan-500/10 text-white shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)]"
                                                : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm font-semibold">{lvl.label}</span>
                                                <span className={`text-xs ${isActive ? "text-cyan-300/70" : "text-neutral-500"}`}>{lvl.desc}</span>
                                            </div>
                                            {isActive && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ─── Job Description (full width) ─── */}
                    <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md mb-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-amber-400 shadow-inner">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Job Description</h2>
                                    <p className="text-xs text-neutral-500 mt-0.5">Optional — AI will tailor questions to the JD</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {fileName && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                                        <CheckCircle2 size={12} />
                                        <span className="max-w-32 truncate">{fileName}</span>
                                        <button onClick={handleRemoveFile} className="hover:text-white transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.text"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="jd-file-upload"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-400 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <Upload size={14} />
                                    <span>Upload .txt</span>
                                </button>
                            </div>
                        </div>

                        <textarea
                            id="jd-textarea"
                            value={jd}
                            onChange={(e) => setJd(e.target.value)}
                            placeholder="Paste the job description here... The AI will analyze it and ask questions based on the skills and requirements mentioned."
                            rows={6}
                            className="relative z-10 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
                        />

                        {jd.trim().length > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-amber-400/80 relative z-10">
                                <Sparkles size={14} />
                                <span>AI will extract skills and ask questions strictly from this JD</span>
                            </div>
                        )}
                    </div>

                    {/* ─── Info Cards ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        {[
                            { icon: Mic, color: "text-violet-400", title: "Voice Input", desc: "Speak naturally, Whisper transcribes" },
                            { icon: Brain, color: "text-cyan-400", title: "AI Evaluation", desc: "Real-time scoring & feedback" },
                            { icon: Target, color: "text-amber-400", title: "Adaptive Questions", desc: "JD-driven or role-based questions" },
                        ].map((card) => (
                            <div key={card.title} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                <card.icon size={20} className={card.color} />
                                <div>
                                    <p className="text-sm font-semibold text-white">{card.title}</p>
                                    <p className="text-xs text-neutral-500">{card.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ─── Start Button ─── */}
                    <div className="flex flex-col items-center pb-8">
                        <button
                            id="start-interview-btn"
                            onClick={handleStartInterview}
                            disabled={!isReady || isStarting}
                            className={`w-full sm:w-auto px-12 py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 group overflow-hidden ${isReady && !isStarting
                                ? "bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-1 cursor-pointer"
                                : "bg-white/10 text-neutral-500 cursor-not-allowed"
                                }`}
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Preparing...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={18} className={isReady ? "text-black group-hover:scale-110 transition-transform" : ""} />
                                    <span>Start Interview</span>
                                    <ChevronRight size={18} className={isReady ? "group-hover:translate-x-1 transition-transform" : ""} />
                                </>
                            )}
                        </button>
                        <p className="mt-6 text-xs text-neutral-500 tracking-wider font-semibold">
                            Voice-Powered &middot; AI-Evaluated &middot; Real-Time Feedback
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
