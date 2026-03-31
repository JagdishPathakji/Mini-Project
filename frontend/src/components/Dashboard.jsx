import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    TerminalSquare,
    Code2,
    ChevronDown
} from "lucide-react";

import Navbar from "./Navbar";

export default function Dashboard() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [windowNo, setWindowNo] = useState(1);
    const [loading, setLoading] = useState(false);

    // Frontend filtering state
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");

    const fetchAllQuestion = async (windowNumber) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/question/fetchallquestion?windowno=${windowNumber}`, {
                credentials: "include",
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const data = await response.json();
            if (data.status) {
                setQuestions(data.doc);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllQuestion(windowNo);
    }, [windowNo]);

    // Derived state for filtering
    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.qheading.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDifficulty = difficultyFilter === "All" || q.qdifficulty.toLowerCase() === difficultyFilter.toLowerCase();
        return matchesSearch && matchesDifficulty;
    });

    const handleQuestionClick = (question) => {
        navigate(`/question/${question.qno}`);
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-emerald-600/[0.03] blur-[150px] pointer-events-none" />

            <Navbar />

            {/* Main Content */}
            <main className="pt-28 pb-16 max-w-7xl mx-auto px-6 relative z-10">

                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center mb-16 mt-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                        Elevate Your Skills
                    </h1>
                    <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Dive into curated problem sets designed to build your algorithmic intuition and crack the toughest technical interviews.
                    </p>
                </div>

                {/* Omnibar Search & Filter Island */}
                <div className="max-w-3xl mx-auto mb-12">
                    <div className="flex flex-col md:flex-row gap-3 p-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search the unknown..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent border-none pl-12 pr-4 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                            />
                        </div>
                        <div className="hidden md:block w-px h-8 bg-white/10 self-center" />
                        <div className="relative w-full md:w-48 shrink-0">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <select
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                className="w-full h-full bg-transparent border-none pl-11 pr-8 py-3.5 text-white appearance-none focus:outline-none focus:ring-0 cursor-pointer text-sm font-medium"
                            >
                                <option value="All" className="bg-neutral-900">All Levels</option>
                                <option value="Easy" className="bg-neutral-900 text-green-400">Easy</option>
                                <option value="Medium" className="bg-neutral-900 text-yellow-400">Medium</option>
                                <option value="Hard" className="bg-neutral-900 text-red-400">Hard</option>
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-neutral-500">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>


                {/* Problem Grid */}
                <div className="mb-10">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center text-neutral-500">
                            <div className="w-10 h-10 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                            <p className="text-sm font-medium tracking-wide uppercase">Connecting to Database...</p>
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="py-24 text-center text-neutral-500 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-sm">
                            <TerminalSquare size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-white mb-2">No problems found</p>
                            <p className="text-sm">Try adjusting your filters or search term.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredQuestions.map((q, idx) => {
                                const diffMeta = 
                                    q.qdifficulty === "Easy" ? { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.15)]" } :
                                    q.qdifficulty === "Medium" ? { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.15)]" } :
                                    { color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]" };

                                return (
                                    <div 
                                        key={q._id || idx} 
                                        onClick={() => handleQuestionClick(q)}
                                        className={`group relative flex flex-col p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 cursor-pointer overflow-hidden ${diffMeta.glow} hover:-translate-y-1`}
                                    >
                                        {/* Subtle internal gradient hover effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                        {/* Card Header: Difficulty & Status */}
                                        <div className="flex justify-between items-center mb-5 relative z-10">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${diffMeta.bg} ${diffMeta.color} ${diffMeta.border}`}>
                                                {q.qdifficulty}
                                            </span>
                                            <div className={`transition-all duration-300 ${q.isSolved ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'opacity-0 group-hover:opacity-100 text-neutral-600 group-hover:text-blue-400'}`}>
                                                <CheckCircle2 size={18} />
                                            </div>
                                        </div>

                                        {/* Problem Title */}
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors leading-tight relative z-10 flex items-start gap-2">
                                            <span className="text-neutral-500 text-sm mt-1">{q.qno}.</span>
                                            {q.qheading}
                                        </h3>

                                        {/* Spacer to push tags to bottom */}
                                        <div className="flex-1" />

                                        {/* Tags & Action Area */}
                                        <div className="flex items-end justify-between mt-6 relative z-10">
                                            <div className="flex gap-2 flex-wrap">
                                                {q.qtags && q.qtags.slice(0, 2).map(t => (
                                                    <span key={t} className="px-2.5 py-1 rounded-lg bg-black/40 text-neutral-400 text-xs font-medium border border-white/5 group-hover:border-white/10 transition-colors">
                                                        {t}
                                                    </span>
                                                ))}
                                                {q.qtags && q.qtags.length > 2 && (
                                                    <span className="px-2.5 py-1 rounded-lg bg-black/40 text-neutral-500 text-xs font-medium border border-white/5">
                                                        +{q.qtags.length - 2}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hover Action Button */}
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 border border-blue-500/20">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && questions.length > 0 && (
                    <div className="flex items-center justify-center gap-6 mt-16 pb-8">
                        <button
                            onClick={() => setWindowNo(prev => Math.max(1, prev - 1))}
                            disabled={windowNo === 1}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 font-medium text-sm backdrop-blur-md"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        
                        <div className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 text-white font-bold backdrop-blur-md shadow-inner">
                            {windowNo}
                        </div>

                        <button
                            onClick={() => setWindowNo(prev => prev + 1)}
                            disabled={questions.length < 10}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 font-medium text-sm backdrop-blur-md"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}
