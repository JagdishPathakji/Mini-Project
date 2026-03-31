import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { Briefcase, Filter, FileText, ChevronRight, Zap, Bot, Target } from "lucide-react";

export default function InterviewSetup() {
    const navigate = useNavigate();

    const [role, setRole] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [jobDescription, setJobDescription] = useState("");

    const handleStartInterview = () => {
        if (!role || !difficulty) return;

        navigate("/interview-room", {
            state: {
                role,
                difficulty,
                jobDescription
            }
        });
    };

    const roles = ["Frontend Developer", "Backend Developer", "Fullstack Developer", "Data Scientist"];

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-emerald-600/[0.02] blur-[150px] pointer-events-none" />

            <Navbar />

            <main className="pt-32 pb-24 max-w-4xl mx-auto px-6 relative z-10">

                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                        Tailor Your Experience
                    </h1>
                    <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Provide a job description and configure your role to generate hyper-realistic, targeted interview questions.
                    </p>
                </div>

                {/* Main Config Form Area */}
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="space-y-12 relative z-10">
                        {/* Role Selection */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-blue-400 shadow-inner">
                                    <Briefcase size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Target Role</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {roles.map((r) => {
                                    const isActive = role === r;
                                    return (
                                        <button
                                            key={r}
                                            onClick={() => setRole(r)}
                                            className={`relative px-5 py-4 rounded-2xl border transition-all duration-300 text-sm font-semibold flex items-center justify-between ${isActive
                                                ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)]"
                                                : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            <span>{r}</span>
                                            {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_currentColor] text-blue-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Difficulty Selection */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-purple-400 shadow-inner">
                                    <Target size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Interview Rigor</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {["Easy", "Medium", "Hard"].map((level) => {
                                    const isActive = difficulty === level;
                                    const meta =
                                        level === "Easy" ? { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", activeBg: "bg-emerald-400/20" } :
                                            level === "Medium" ? { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", activeBg: "bg-amber-400/20" } :
                                                { color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/30", activeBg: "bg-rose-400/20" };

                                    return (
                                        <button
                                            key={level}
                                            onClick={() => setDifficulty(level)}
                                            className={`relative px-5 py-4 rounded-2xl border transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-3 ${isActive
                                                ? `${meta.border} ${meta.activeBg} text-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)]`
                                                : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            <span>{level}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Job Description */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-emerald-400 shadow-inner">
                                    <FileText size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-bold text-white">Job Description <span className="text-sm font-medium text-neutral-500 ml-2">(Optional)</span></h2>
                                </div>
                            </div>

                            <div className="relative group/textarea">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-2xl pointer-events-none opacity-0 group-focus-within/textarea:opacity-100 transition-opacity duration-300" />
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30 rounded-[17px] opacity-0 group-focus-within/textarea:opacity-100 transition-opacity duration-500 blur-[2px]" />

                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description you are preparing for here..."
                                    rows={5}
                                    className="w-full relative z-10 bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-neutral-500 focus:outline-none transition-all resize-none shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submitting Action */}
                <div className="mt-12 flex flex-col items-center pb-8 border-t border-white/5 pt-12">
                    <button
                        onClick={handleStartInterview}
                        disabled={!role || !difficulty}
                        className="w-full sm:w-auto px-12 py-4 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 group overflow-hidden shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-1 disabled:opacity-30 disabled:pointer-events-none disabled:translate-y-0"
                    >
                        <Zap size={18} className="text-black group-hover:scale-110 transition-transform" />
                        <span>Connect AI Interviewer</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="mt-6 text-xs text-neutral-500 tracking-wider font-semibold">
                        Microphone and Camera permissions may be requested
                    </p>
                </div>
            </main>
        </div>
    );
}