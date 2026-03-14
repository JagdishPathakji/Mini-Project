import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Editor from "@monaco-editor/react";
import {
    Timer,
    ChevronLeft,
    ChevronRight,
    Play,
    Send,
    LogOut,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import Navbar from "./Navbar";

export default function DSAInterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { difficulty, duration } = location.state || { difficulty: "Easy", duration: 60 };

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [codes, setCodes] = useState(["", "", ""]);
    const [language, setLanguage] = useState("python");
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [interviewEnded, setInterviewEnded] = useState(false);
    const [activeTab, setActiveTab] = useState("Description");

    const timerRef = useRef(null);

    // Fetch Questions
    useEffect(() => {
        async function fetchInterviewQuestions() {
            try {
                const response = await fetch(`http://localhost:3000/question/fetchrandom?difficulty=${difficulty}`);
                const data = await response.json();

                if (data.status) {
                    setQuestions(data.doc);
                    setCodes(data.doc.map(q => q.qstartcode || ""));
                    setLoading(false);
                } else {
                    toast.error(data.message || "Failed to load questions");
                    navigate("/dsa-interview");
                }
            } catch (error) {
                console.error(error);
                toast.error("Network error. Please try again.");
                navigate("/dsa-interview");
            }
        }

        fetchInterviewQuestions();
    }, [difficulty, navigate]);

    // Timer Logic
    useEffect(() => {
        if (loading) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleInterviewComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [loading]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const handleInterviewComplete = () => {
        setInterviewEnded(true);
        clearInterval(timerRef.current);
        toast.success("Interview finished!");
        setTimeout(() => navigate("/dashboard"), 3000);
    };

    const handleCodeChange = (value) => {
        const newCodes = [...codes];
        newCodes[currentIndex] = value;
        setCodes(newCodes);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
            <Navbar />

            <div className="flex flex-col lg:flex-row flex-1 pt-16 overflow-hidden">

                {/* LEFT PANEL matching Solve.jsx */}
                <div className="lg:w-1/2 w-full border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col h-full overflow-hidden">

                    {/* Tabs matching Solve.jsx */}
                    <div className="flex flex-shrink-0 border-b border-neutral-800 bg-neutral-950">
                        {["Description", "Question Nav"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 text-sm font-medium transition-all ${activeTab === tab
                                    ? "border-b-2 border-white text-white"
                                    : "text-neutral-500 hover:text-white"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}

                        {/* Interview Specific: Timer in the Tab Bar */}
                        <div className="flex-1 flex justify-end items-center px-4 font-mono text-sm font-bold text-neutral-400">
                            <div className={`flex items-center gap-2 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : ''}`}>
                                <Timer size={14} /> {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {activeTab === "Description" && (
                            <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                <h1 className="text-2xl font-bold">
                                    {currentIndex + 1}. {currentQuestion.qheading}
                                </h1>

                                <div className="flex gap-3 text-xs text-neutral-400 uppercase tracking-wide">
                                    <span className="border border-neutral-700 px-3 py-1 rounded-full text-white font-bold">
                                        {currentQuestion.qdifficulty}
                                    </span>
                                    {currentQuestion.qtags?.map(tag => (
                                        <span key={tag} className="border border-neutral-800 px-3 py-1 rounded-full font-medium">#{tag}</span>
                                    ))}
                                </div>

                                <div className="text-neutral-300 whitespace-pre-wrap leading-relaxed text-sm">
                                    {currentQuestion.qdescription}
                                </div>

                                <div className="pt-10 flex gap-4">
                                    <button
                                        disabled={currentIndex === 0}
                                        onClick={() => setCurrentIndex(prev => prev - 1)}
                                        className="px-4 py-2 border border-neutral-800 rounded-md text-sm text-neutral-400 hover:border-white hover:text-white disabled:opacity-20 transition-all font-bold"
                                    >
                                        <ChevronLeft size={16} className="inline mr-1" /> Previous
                                    </button>
                                    <button
                                        disabled={currentIndex === questions.length - 1}
                                        onClick={() => setCurrentIndex(prev => prev + 1)}
                                        className="px-4 py-2 border border-neutral-800 rounded-md text-sm text-neutral-400 hover:border-white hover:text-white disabled:opacity-20 transition-all font-bold"
                                    >
                                        Next <ChevronRight size={16} className="inline ml-1" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "Question Nav" && (
                            <div className="p-10 flex flex-col items-center justify-center gap-6 h-full text-center">
                                <h3 className="text-neutral-500 uppercase tracking-widest text-xs font-bold">Interview Progress</h3>
                                <div className="flex gap-4">
                                    {questions.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setCurrentIndex(idx);
                                                setActiveTab("Description");
                                            }}
                                            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all ${currentIndex === idx
                                                    ? "border-white bg-white text-black scale-110 shadow-lg"
                                                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-8 flex flex-col gap-3 w-full max-w-[200px]">
                                    <button
                                        onClick={handleInterviewComplete}
                                        className="w-full bg-white text-black py-2.5 rounded-md font-bold text-sm hover:opacity-90 transition-all"
                                    >
                                        Finish Interview
                                    </button>
                                    <button
                                        onClick={() => setShowExitConfirm(true)}
                                        className="w-full py-2.5 rounded-md font-bold text-sm text-neutral-500 hover:text-red-500 transition-all"
                                    >
                                        Exit Session
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL matching Solve.jsx */}
                <div className="lg:w-1/2 w-full flex flex-col bg-black h-full overflow-hidden">

                    {/* Editor Header matching Solve.jsx */}
                    <div className="flex flex-shrink-0 justify-between items-center px-5 h-14 border-b border-neutral-800 bg-neutral-950 text-neutral-500">
                        <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
                            {language.toUpperCase()} ENVIRONMENT
                        </div>

                        {/* Run & Submit matching Solve.jsx style */}
                        <div className="flex items-center gap-3">
                            <button className="px-5 py-1.5 border border-neutral-700 rounded-md text-sm hover:border-white transition flex items-center gap-2">
                                <Play size={15} /> Run
                            </button>
                            <button className="px-5 py-1.5 bg-white text-black rounded-md text-sm font-semibold hover:opacity-90 transition flex items-center gap-2">
                                <Send size={15} /> Submit
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor matching Solve.jsx */}
                    <div className="flex-1 overflow-hidden bg-black">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={codes[currentIndex]}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                scrollbar: {
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* EXIT CONFIRMATION MODAL - PERFECT CENTERING */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)}></div>
                    <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-sm p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mb-4 border border-neutral-800">
                                <AlertCircle size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">Exit Interview?</h3>
                            <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
                                Your current progress will be lost. This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="px-4 py-2 rounded-lg border border-neutral-800 text-sm font-medium hover:bg-neutral-900 transition-colors text-neutral-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => navigate("/dashboard")}
                                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPLETION MODAL - PERFECT CENTERING */}
            {interviewEnded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
                    <div className="relative text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto border border-white/10">
                            <CheckCircle2 size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-white">Interview Completed</h2>
                        <p className="text-neutral-500 mb-8">Redirecting to dashboard...</p>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-700 tracking-[0.2em] uppercase">
                            <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
                            Processing
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
