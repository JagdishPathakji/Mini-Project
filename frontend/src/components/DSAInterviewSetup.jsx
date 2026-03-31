import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { Timer, Filter, Play, Clock, ChevronRight, BrainCircuit, Target, Zap } from "lucide-react";

export default function DSAInterviewSetup() {
    const navigate = useNavigate();

    const [difficulty, setDifficulty] = useState("Easy");
    const [duration, setDuration] = useState("60"); // in minutes

    const handleStartInterview = async () => {
        navigate("/dsa-interview-room", {
            state: {
                difficulty,
                duration: parseInt(duration)
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-emerald-600/[0.02] blur-[150px] pointer-events-none" />

            <Navbar />

            <main className="pt-32 pb-24 max-w-7xl mx-auto px-6 relative z-10">
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                        Configure Your Session
                    </h1>
                    <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Customize your difficulty and time constraints to mimic real-world technical interviews and perform under pressure.
                    </p>
                </div>

                {/* Setup Content */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Difficulty Section */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-blue-400 shadow-inner">
                                    <Target size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Target Difficulty</h2>
                            </div>

                            <div className="flex flex-col gap-3 relative z-10">
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
                                            className={`relative px-5 py-4 rounded-2xl border transition-all duration-300 text-sm font-semibold flex items-center justify-between ${isActive
                                                ? `${meta.border} ${meta.activeBg} text-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)]`
                                                : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            <span>{level}</span>
                                            {isActive && <div className={`w-2 h-2 rounded-full ${meta.bg.replace('/10', '')} shadow-[0_0_10px_currentColor] ${meta.color}`} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Duration Section */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-purple-400 shadow-inner">
                                    <Timer size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Time Constraint</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-3 relative z-10">
                                {[
                                    { label: "30 Minutes", value: "30", desc: "Quick warmup" },
                                    { label: "1 Hour", value: "60", desc: "Standard session" },
                                    { label: "1.5 Hours", value: "90", desc: "Deep focus" }
                                ].map((time) => {
                                    const isActive = duration === time.value;
                                    return (
                                        <button
                                            key={time.value}
                                            onClick={() => setDuration(time.value)}
                                            className={`relative px-5 py-3 rounded-2xl border transition-all duration-300 flex flex-col items-start ${isActive
                                                ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)]"
                                                : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            <span className="text-sm font-semibold mb-0.5">{time.label}</span>
                                            <span className={`text-xs ${isActive ? "text-blue-300/70" : "text-neutral-500"}`}>{time.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Start Action */}
                    <div className="mt-16 flex flex-col items-center pb-8">
                        <button
                            onClick={handleStartInterview}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 group overflow-hidden shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-1"
                        >
                            <Zap size={18} className="text-black group-hover:scale-110 transition-transform" />
                            <span>Initialize Session</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="mt-6 text-xs text-neutral-500 tracking-wider font-semibold">
                            3 Random Problems &middot; Selected Difficulty &middot; Timed Environment
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
