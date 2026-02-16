import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    CheckCircle2
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

    const topics = ["Arrays", "Strings", "Linked List", "Trees", "Graph", "DP", "Recursion", "Backtracking"];

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
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <Navbar />

            {/* Main Content */}
            <main className="pt-24 pb-12 max-w-7xl mx-auto px-6">

                {/* Header Section */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold mb-2">Problem Set</h1>
                    <p className="text-neutral-400">Master data structures and algorithms with curated problems.</p>
                </div>

                {/* Topic Tags */}
                <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {topics.map((topic) => (
                            <button
                                key={topic}
                                className="px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-400 text-sm font-medium hover:border-neutral-600 hover:text-white transition-all whitespace-nowrap"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <select
                            value={difficultyFilter}
                            onChange={(e) => setDifficultyFilter(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-8 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all cursor-pointer"
                        >
                            <option value="All">All Difficulty</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Questions List */}
                <div className="bg-neutral-950 border border-neutral-900 rounded-xl overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-900 bg-neutral-900/30 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <div className="col-span-1">Status</div>
                        <div className="col-span-8 sm:col-span-6">Title</div>
                        <div className="hidden sm:block sm:col-span-3">Tags</div>
                        <div className="col-span-3 sm:col-span-2 text-right">Difficulty</div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center text-neutral-500">
                            <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin mb-4"></div>
                            <p>Loading problems...</p>
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            <p>No questions found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-900">
                            {filteredQuestions.map((q, idx) => {
                                // Color coding for difficulty
                                const diffColor =
                                    q.qdifficulty === "Easy" ? "text-green-500" :
                                        q.qdifficulty === "Medium" ? "text-yellow-500" :
                                            "text-red-500";
                                return (
                                    <div key={q._id || idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-neutral-900/50 transition-colors group" onClick={() => handleQuestionClick(q)}>
                                        <div className="col-span-1 text-neutral-600 group-hover:text-white transition-colors">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div className="col-span-8 sm:col-span-6">
                                            <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors cursor-pointer truncate">
                                                {q.qno}. {q.qheading}
                                            </h3>
                                        </div>
                                        <div className="hidden sm:block sm:col-span-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {q.qtags && q.qtags.slice(0, 2).map(t => (
                                                    <span key={t} className="px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-400 text-xs border border-neutral-800">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`col-span-3 sm:col-span-2 text-right text-sm font-medium ${diffColor}`}>
                                            {q.qdifficulty}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-neutral-500">
                        Page <span className="text-white font-medium">{windowNo}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setWindowNo(prev => Math.max(1, prev - 1))}
                            disabled={windowNo === 1 || loading}
                            className="p-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setWindowNo(prev => prev + 1)}
                            disabled={loading || questions.length < 10}
                            className="p-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
