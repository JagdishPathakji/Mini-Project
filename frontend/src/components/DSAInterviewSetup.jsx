import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { Timer, Filter, Play, Clock, ChevronRight } from "lucide-react";

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
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <Navbar />

            <main className="pt-32 pb-20 max-w-7xl mx-auto px-6 sm:px-8">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-16">
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
                        DSA Interview <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500 text-nowrap">Session Setup.</span>
                    </h1>
                    <p className="text-neutral-400 text-lg max-w-2xl leading-relaxed">
                        Select your preferences to begin a simulated technical interview.
                    </p>
                </div>

                {/* Setup Content */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                        {/* Difficulty Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-neutral-900 rounded-lg text-white font-bold">
                                    <Filter size={20} />
                                </div>
                                <h2 className="text-xl font-bold">Difficulty Level</h2>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {["Easy", "Medium", "Hard"].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={`px-6 py-2 rounded-full border transition-all text-sm font-medium ${difficulty === level
                                                ? "bg-white text-black border-white"
                                                : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white"
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-neutral-500 leading-relaxed">
                                Choose questions based on your current preparation level.
                            </p>
                        </div>

                        {/* Duration Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-neutral-900 rounded-lg text-white font-bold">
                                    <Clock size={20} />
                                </div>
                                <h2 className="text-xl font-bold">Duration</h2>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {[
                                    { label: "30 Mins", value: "30" },
                                    { label: "1 Hour", value: "60" },
                                    { label: "1.5 Hours", value: "90" }
                                ].map((time) => (
                                    <button
                                        key={time.value}
                                        onClick={() => setDuration(time.value)}
                                        className={`px-6 py-2 rounded-full border transition-all text-sm font-medium ${duration === time.value
                                                ? "bg-white text-black border-white"
                                                : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white"
                                            }`}
                                    >
                                        {time.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-neutral-500 leading-relaxed">
                                Set the time limit for the entire interview session.
                            </p>
                        </div>

                    </div>

                    {/* Start Action */}
                    <div className="mt-20 flex flex-col items-center">
                        <button
                            onClick={handleStartInterview}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group"
                        >
                            Start Interview <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="mt-6 text-xs text-neutral-600 uppercase tracking-widest font-bold">
                            Pressing start will fetch 3 questions immediately.
                        </p>
                    </div>
                </div>
            </main>

            {/* Simple Footer Decoration matching Landing */}
            <div className="border-t border-neutral-900 bg-black py-12 px-6 text-center opacity-50">
                <p className="text-neutral-500 text-xs tracking-widest uppercase font-bold">Simulated Interview Platform</p>
            </div>
        </div>
    );
}
