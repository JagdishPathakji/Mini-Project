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
    AlertCircle,
    CheckCircle2,
    Code2,
    LayoutGrid,
    ChevronDown
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
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [interviewEnded, setInterviewEnded] = useState(false);
    const [activeTab, setActiveTab] = useState("Description");

    const languages = ["python", "javascript", "java", "cpp", "c"];

    const timerRef = useRef(null);

    // Fetch Questions
    useEffect(() => {
        async function fetchInterviewQuestions() {
            try {
                const response = await fetch(`http://localhost:3000/question/fetchrandom?difficulty=${difficulty}`);
                const data = await response.json();

                if (data.status) {
                    setQuestions(data.doc);
                    if ("python" === language) {
                        setCodes(data.doc.map(q => "# Start writing your code here"));
                    }
                    else {
                        setCodes(data.doc.map(q => "// Start writing your code here"));
                    }
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
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />

            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row flex-1 pt-20 pb-6 px-6 gap-6 overflow-hidden relative z-10">

                {/* LEFT PANEL */}
                <div className="lg:w-1/2 w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* Tabs / Header */}
                    <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#0a0a0a] relative z-10">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab("Description")}
                                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === "Description"
                                    ? "bg-white/10 text-white shadow-inner"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Code2 size={14} className={activeTab === "Description" ? "text-blue-400" : ""} /> Problem
                            </button>
                            <button
                                onClick={() => setActiveTab("Question Nav")}
                                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === "Question Nav"
                                    ? "bg-white/10 text-white shadow-inner"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <LayoutGrid size={14} className={activeTab === "Question Nav" ? "text-purple-400" : ""} /> Navigation
                            </button>
                        </div>

                        {/* Timer */}
                        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-sm font-bold shadow-inner transition-colors duration-500 ${timeLeft < 300
                            ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] animate-pulse'
                            : 'bg-white/5 border-white/10 text-neutral-300'}`}>
                            <Timer size={16} className={timeLeft < 300 ? "text-red-500 animate-bounce" : "text-neutral-400"} />
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                        {activeTab === "Description" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex flex-col relative">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-4">
                                        {currentIndex + 1}. {currentQuestion.qheading}
                                    </h1>

                                    <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-white mb-8">
                                        <span className={`px-3 py-1.5 rounded-lg border ${currentQuestion.qdifficulty?.toLowerCase() === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                            currentQuestion.qdifficulty?.toLowerCase() === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                'bg-red-500/10 border-red-500/20 text-red-500'
                                            }`}>
                                            {currentQuestion.qdifficulty}
                                        </span>
                                        {currentQuestion.qtags?.map(tag => (
                                            <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-neutral-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div
                                        className="text-neutral-400 leading-relaxed text-sm p-6 bg-white/[0.02] border border-white/5 rounded-2xl shadow-inner
                                            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-white 
                                            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-white 
                                            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-white 
                                            [&_p]:mb-4 
                                            [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-4 [&_ul]:space-y-1 
                                            [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-4 [&_ol]:space-y-1 
                                            [&_pre]:p-5 [&_pre]:bg-[#030303] [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-6 [&_pre]:border [&_pre]:border-white/5 [&_pre]:text-sm [&_pre]:font-mono [&_pre]:text-neutral-300 [&_pre]:shadow-inner
                                            [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-white [&_code]:font-mono [&_code]:text-[13px]
                                            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:rounded-none 
                                            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-neutral-400 [&_blockquote]:bg-blue-500/5 [&_blockquote]:rounded-r-lg 
                                            [&_a]:text-blue-400 [&_a]:hover:underline 
                                            [&_table]:min-w-full [&_table]:text-left [&_table]:border-collapse [&_table]:mb-4 [&_table]:text-sm
                                            [&_th]:border-b [&_th]:border-white/10 [&_th]:p-3 [&_th]:font-semibold [&_th]:text-white [&_th]:bg-white/5 
                                            [&_td]:border-b [&_td]:border-white/5 [&_td]:p-3"
                                        dangerouslySetInnerHTML={{ __html: currentQuestion.qdescription }}
                                    />
                                </div>


                            </div>
                        )}

                        {activeTab === "Question Nav" && (
                            <div className="p-10 flex flex-col items-center justify-center gap-8 h-full text-center">
                                <h3 className="text-neutral-500 uppercase tracking-[0.3em] text-[10px] font-extrabold flex items-center justify-center gap-4 w-full">
                                    <div className="h-px bg-white/10 flex-1"></div>
                                    Interview Progress
                                    <div className="h-px bg-white/10 flex-1"></div>
                                </h3>
                                <div className="flex flex-wrap items-center justify-center gap-4">
                                    {questions.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setCurrentIndex(idx);
                                                setActiveTab("Description");
                                            }}
                                            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-bold text-xl transition-all duration-300 ${currentIndex === idx
                                                ? "border-white bg-white/10 text-white scale-110 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                                                : "border-white/10 bg-white/[0.02] text-neutral-500 hover:border-white/30 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-8 flex flex-col gap-3 w-full max-w-xs p-6 bg-white/[0.02] border border-white/5 rounded-3xl shadow-inner">
                                    <button
                                        onClick={handleInterviewComplete}
                                        className="w-full bg-white text-black py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} /> Finish Interview
                                    </button>
                                    <button
                                        onClick={() => setShowExitConfirm(true)}
                                        className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]"
                                    >
                                        Abort Session
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="lg:w-1/2 w-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* Editor Header */}
                    <div className="flex flex-shrink-0 justify-between items-center px-6 h-16 border-b border-white/5 bg-[#0a0a0a] relative z-50 text-neutral-500">
                        {/* Language Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setShowLangDropdown(!showLangDropdown)
                                }
                                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border border-white/10 bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-white"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse mr-1"></div>
                                {language}
                                <ChevronDown size={14} />
                            </button>

                            {showLangDropdown && (
                                <div className="absolute top-full mt-2 w-40 bg-neutral-900 border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-[100]">
                                    {languages.map(lang => (
                                        <div
                                            key={lang}
                                            onClick={() => {
                                                setLanguage(lang);
                                                setShowLangDropdown(false);

                                                const newCodes = [...codes];
                                                if (lang === "python") {
                                                    newCodes[currentIndex] = "# start writing your code here";
                                                } else {
                                                    newCodes[currentIndex] = "// start writing your code here";
                                                }
                                                setCodes(newCodes);
                                            }}
                                            className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                                        >
                                            {lang}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Run & Submit */}
                        <div className="flex items-center gap-3">
                            <button className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 text-neutral-300 shadow-sm">
                                <Play size={14} className="text-emerald-400" /> Run
                            </button>
                            <button className="px-6 py-2 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] hover:-translate-y-0.5">
                                <Send size={14} /> Submit
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden relative z-10 bg-[#0a0a0a]">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={codes[currentIndex]}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                padding: { top: 20 },
                                smoothScrolling: true,
                                scrollbar: {
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* EXIT CONFIRMATION MODAL */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)}></div>
                    <div className="relative bg-neutral-950/80 border border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-[pulse_2s_ease-in-out_infinite]">
                                <AlertCircle size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white">Abort Interview?</h3>
                            <p className="text-neutral-400 text-sm mb-8 leading-relaxed max-w-xs">
                                All code and progression will be lost. This action is irreversible.
                            </p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-neutral-300 hover:bg-white/10 hover:text-white transition-all shadow-inner"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => navigate("/dashboard")}
                                    className="px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_-5px_rgba(239,68,68,0.6)]"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPLETION MODAL */}
            {interviewEnded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="relative text-center animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-md w-full">
                        <div className="w-24 h-24 bg-emerald-600/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_-15px_rgba(52,211,153,0.5)] animate-pulse">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">Interview Finished</h2>
                        <p className="text-neutral-400 mb-8 text-base font-medium">Redirecting to Evaluation Dashboard...</p>

                        <div className="flex items-center justify-center gap-3 text-xs font-bold text-neutral-500 tracking-[0.3em] uppercase">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            Processing Matrix
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
