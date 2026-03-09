import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { Briefcase, Filter, FileText } from "lucide-react";

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

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <Navbar />

            <main className="pt-24 pb-12 max-w-4xl mx-auto px-6">

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold mb-2">Interview Setup</h1>
                    <p className="text-neutral-400">
                        Configure your mock interview session.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-8 space-y-8 shadow-sm">

                    {/* Role */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            <Briefcase size={16} />
                            Role
                        </div>

                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                        >
                            <option value="">Select Role</option>
                            <option value="Frontend Developer">Frontend Developer</option>
                            <option value="Backend Developer">Backend Developer</option>
                            <option value="Fullstack Developer">Fullstack Developer</option>
                            <option value="Data Scientist">Data Scientist</option>
                        </select>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            <Filter size={16} />
                            Difficulty
                        </div>

                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                        >
                            <option value="">Select Difficulty</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    {/* Job Description */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            <FileText size={16} />
                            Job Description
                        </div>

                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste job description here..."
                            rows={6}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Button */}
                    <div className="pt-2">
                        <button
                            onClick={handleStartInterview}
                            disabled={!role || !difficulty}
                            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Start Interview
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}