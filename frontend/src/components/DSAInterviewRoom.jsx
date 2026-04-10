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
    TerminalSquare,
    XCircle,
    CheckCircle2,
    Code2,
    LayoutGrid,
    ChevronDown
} from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";

export default function DSAInterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { difficulty, duration } = location.state || { difficulty: "Easy", duration: 60 };

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [codes, setCodes] = useState(() => {
        try {
            const savedLang = sessionStorage.getItem(`interview_lang_${difficulty}`) || "python";
            const saved = sessionStorage.getItem(`interview_codes_${difficulty}_${savedLang}`);
            return saved ? JSON.parse(saved) : ["", "", ""];
        } catch { return ["", "", ""]; }
    });
    const [language, setLanguage] = useState(() => {
        return sessionStorage.getItem(`interview_lang_${difficulty}`) || "python";
    });
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [interviewEnded, setInterviewEnded] = useState(false);
    const [activeTab, setActiveTab] = useState("Description");
    const [leftWidth, setLeftWidth] = useState(50);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [solvedQuestions, setSolvedQuestions] = useState({});
    const [submissionResult, setSubmissionResult] = useState(null);
    const [progressPercent, setProgressPercent] = useState(0);
    const [submitStage, setSubmitStage] = useState("");
    const [liveTestcases, setLiveTestcases] = useState([]);

    // Console States
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [consoleHeight, setConsoleHeight] = useState(300);
    const [isRunning, setIsRunning] = useState(false);
    const [runResults, setRunResults] = useState(null);
    const [showRunResult, setShowRunResult] = useState(false);
    const [activeTestcaseTab, setActiveTestcaseTab] = useState(0);

    const languages = ["python", "javascript", "java", "cpp"];

    const timerRef = useRef(null);

    // Fetch Questions
    useEffect(() => {
        async function fetchInterviewQuestions() {
            try {
                const response = await fetch(`${API_BASE_URL}/question/fetchrandom?difficulty=${difficulty}`, {
                    headers: COMMON_HEADERS
                });
                const data = await response.json();

                if (data.status) {
                    // Enrich questions with testcases by fetching individual details
                    const enrichedQuestions = await Promise.all(
                        data.doc.map(async (q) => {
                            try {
                                const qRes = await fetch(`${API_BASE_URL}/question/fetchquestion?qno=${q.qno}`, {
                                    credentials: "include",
                                    headers: COMMON_HEADERS
                                });
                                const qData = await qRes.json();
                                return qData.status ? qData.doc : q;
                            } catch (e) {
                                console.error(`Failed to fetch details for question ${q.qno}:`, e);
                                return q;
                            }
                        })
                    );

                    setQuestions(enrichedQuestions);
                    // Only set defaults if no saved codes exist for the current language
                    const savedLang = sessionStorage.getItem(`interview_lang_${difficulty}`) || "python";
                    const savedCodes = sessionStorage.getItem(`interview_codes_${difficulty}_${savedLang}`);
                    if (!savedCodes || JSON.parse(savedCodes).every(c => !c)) {
                        if (savedLang === "python") {
                            setCodes(enrichedQuestions.map(() => "# Start writing your code here"));
                        } else {
                            setCodes(enrichedQuestions.map(() => "// Start writing your code here"));
                        }
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

    // Persist codes to sessionStorage (keyed by difficulty + language)
    useEffect(() => {
        sessionStorage.setItem(`interview_codes_${difficulty}_${language}`, JSON.stringify(codes));
    }, [codes, difficulty, language]);

    // Persist language to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(`interview_lang_${difficulty}`, language);
    }, [language, difficulty]);

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

    // Reset Console State on Question Change
    useEffect(() => {
        setRunResults(null);
        setActiveTestcaseTab(0);
        setShowRunResult(false);
    }, [currentIndex]);

    const handleCodeChange = (value) => {
        const newCodes = [...codes];
        newCodes[currentIndex] = value;
        setCodes(newCodes);
    };

    const handleSubmit = async () => {
        if (!codes[currentIndex].trim()) {
            toast.error("Please write some code before submitting.");
            return;
        }

        setIsSubmitting(true);
        setActiveTab("Submissions");
        setSubmissionResult({ status: "running" });
        setProgressPercent(0);
        setSubmitStage("Connecting to Matrix...");
        setLiveTestcases([]);

        try {
            const response = await fetch(`${API_BASE_URL}/question/interviewsubmit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    qno: questions[currentIndex].qno,
                    language: language,
                    code: codes[currentIndex]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to establish telemetry link");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop();

                for (let part of parts) {
                    if (part.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(part.substring(6));

                            if (data.stage === "running") {
                                setSubmitStage(`Executing Test Case ${data.testcase} of ${data.total}`);
                                setProgressPercent((data.testcase / data.total) * 90);
                                setLiveTestcases(prev => {
                                    if (prev.find(t => t.id === data.testcase)) return prev;
                                    return [...prev, { id: data.testcase, status: 'running' }];
                                });
                            } else if (data.stage === "passed") {
                                setLiveTestcases(prev => prev.map(t =>
                                    t.id === data.testcase ? { ...t, status: 'passed', time: data.time } : t
                                ));
                            } else if (data.stage === "completed") {
                                setProgressPercent(100);
                                setSubmitStage("Finalizing Telemetry...");

                                setTimeout(() => {
                                    setSubmissionResult(data);
                                    if (data.status) {
                                        toast.success(data.message || "All testcases passed!");
                                        setSolvedQuestions(prev => ({ ...prev, [currentIndex]: true }));
                                    } else {
                                        toast.error(data.message || "Submission failed");
                                    }
                                }, 300);
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE JSON:", e, part);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Submission failed:", error);
            toast.error(error.message || "Network error");
            setSubmissionResult({ status: false, message: error.message || "Network error" });
        } finally {
            setTimeout(() => setIsSubmitting(false), 500);
        }
    };

    const handleRun = async () => {
        if (!codes[currentIndex].trim()) {
            toast.error("Code cannot be empty");
            return;
        }

        setIsRunning(true);
        setShowRunResult(true);
        setIsConsoleOpen(true);
        setRunResults(null);

        try {
            const response = await fetch(`${API_BASE_URL}/question/runcode`, {
                method: "POST",
                credentials: "include",
                headers: COMMON_HEADERS,
                body: JSON.stringify({
                    qno: questions[currentIndex].qno,
                    code: codes[currentIndex],
                    language,
                    testcases: questions[currentIndex].sampleTestcases
                })
            });

            const data = await response.json();
            if (response.ok && data.status) {
                setRunResults(data.results);
            } else {
                toast.error(data.message || "Failed to run testcases");
            }
        } catch (error) {
            console.error("Run error:", error);
            toast.error("An error occurred while running");
        } finally {
            setIsRunning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    const startHorizontalDrag = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = leftWidth;
        const containerWidth = window.innerWidth - 48; // px-6 (24px) * 2

        const doDrag = (e) => {
            const newWidth = startWidth + ((e.clientX - startX) / containerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setLeftWidth(newWidth);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const startDrag = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = consoleHeight;

        const doDrag = (e) => {
            const newHeight = startHeight - (e.clientY - startY);
            if (newHeight > 100 && newHeight < window.innerHeight - 200) {
                setConsoleHeight(newHeight);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />

            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row flex-1 pt-20 pb-6 px-6 gap-2 overflow-hidden relative z-10">

                {/* LEFT PANEL */}
                <div style={{ '--left-width': `${leftWidth}%` }} className="lg:w-[var(--left-width)] w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
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
                            <button
                                onClick={() => setActiveTab("Submissions")}
                                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${activeTab === "Submissions"
                                    ? "bg-white/10 text-white shadow-inner"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <TerminalSquare size={14} className={activeTab === "Submissions" ? "text-blue-400" : ""} /> Submissions
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
                                            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-bold text-xl transition-all duration-300 relative overflow-hidden group ${currentIndex === idx
                                                ? "border-white bg-white/10 text-white scale-110 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                                                : solvedQuestions[idx]
                                                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                                                    : "border-white/10 bg-white/[0.02] text-neutral-500 hover:border-white/30 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            {solvedQuestions[idx] && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />}
                                            {solvedQuestions[idx] && currentIndex !== idx ? (
                                                <CheckCircle2 size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] relative z-10" />
                                            ) : (
                                                <span className="relative z-10">{idx + 1}</span>
                                            )}
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

                        {activeTab === "Submissions" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                                {!submissionResult ? (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 mt-20">
                                        <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                                            <Send size={24} className="text-white/20 ml-1" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 cursor-pointer">Live Testing</div>
                                            <div className="text-sm font-medium text-neutral-600">Start by clicking submit</div>
                                        </div>
                                    </div>
                                ) : submissionResult.status === "running" ? (
                                    <div className="flex flex-col h-full mt-4">
                                        <div className="flex flex-col items-center gap-6 mb-8 mt-6">
                                            <div className="relative w-24 h-24 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full border border-white/5 bg-white/[0.02]" />
                                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-l-blue-500/50 animate-[spin_2s_linear_infinite]" />
                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] animate-pulse">
                                                    <Code2 size={18} className="text-blue-400" />
                                                </div>
                                            </div>

                                            <div className="w-full max-w-md flex flex-col items-center gap-4">
                                                <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                                    <span>{submitStage}</span>
                                                    <span className="text-blue-400">{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all duration-300 relative shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                                                        style={{ width: `${progressPercent}%` }}
                                                    >
                                                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.5s_infinite]" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {liveTestcases.length > 0 && (
                                            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col relative">
                                                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 sticky top-0 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Live Telemetry Feed</span>
                                                </div>
                                                <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                                                    {liveTestcases.map((tc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded-xl mx-2">
                                                            <div className="flex items-center gap-3">
                                                                {tc.status === 'running' ? (
                                                                    <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                                                                ) : tc.status === 'passed' ? (
                                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                                ) : (
                                                                    <XCircle size={16} className="text-red-400" />
                                                                )}
                                                                <span className="text-sm font-mono text-neutral-300">Test Case {tc.id}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                {tc.time && <span className="text-[10px] font-mono text-neutral-500">{tc.time}s</span>}
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${tc.status === 'running' ? 'text-blue-400 animate-pulse' : tc.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {tc.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="h-4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : submissionResult.status === true ? (
                                    <div className="p-8 bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl shadow-[0_0_50px_-10px_rgba(52,211,153,0.15)] mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

                                        <div className="flex items-center gap-4 mb-8 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                                                <CheckCircle2 size={28} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-extrabold text-emerald-400 tracking-tight">Accepted</h2>
                                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/60 mt-1">{submissionResult.message}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Runtime Telemetry</div>
                                                <div className="text-3xl font-extrabold text-white flex items-end gap-1">
                                                    {submissionResult.details?.time ? parseFloat(submissionResult.details.time).toFixed(3) : "0.00"} <span className="text-sm text-neutral-500 mb-1">sec</span>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Memory Profile</div>
                                                <div className="text-3xl font-extrabold text-white flex items-end gap-1">
                                                    {submissionResult.details?.memory || "0"} <span className="text-sm text-neutral-500 mb-1">KB</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-[0_0_30px_-5px_rgba(239,68,68,0.1)] space-y-6 relative">
                                        <div className="text-red-400 font-bold text-xl flex items-center gap-2">
                                            <XCircle size={24} />
                                            <span>Failed</span>
                                        </div>
                                        <div className="text-red-400/80 text-sm font-medium">{submissionResult.message}</div>

                                        {submissionResult.failed_testcase && (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Input</div>
                                                    <pre className="p-4 bg-[#030303] border border-red-500/20 rounded-xl text-sm overflow-x-auto text-neutral-300 font-mono shadow-inner">
                                                        {submissionResult.failed_testcase.input}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Expected Output</div>
                                                    <pre className="p-4 bg-[#030303] border border-red-500/20 rounded-xl text-sm overflow-x-auto text-neutral-300 font-mono shadow-inner">
                                                        {submissionResult.failed_testcase.expected_output}
                                                    </pre>
                                                </div>
                                                {submissionResult.details && submissionResult.details.stdout && (
                                                    <div>
                                                        <div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Your Output</div>
                                                        <pre className="p-4 bg-[#030303] border border-red-500/20 rounded-xl text-sm overflow-x-auto text-neutral-300 font-mono shadow-inner">
                                                            {(() => {
                                                                try { return typeof window !== 'undefined' ? atob(submissionResult.details.stdout) : submissionResult.details.stdout; }
                                                                catch (e) { return submissionResult.details.stdout; }
                                                            })()}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {submissionResult.details && submissionResult.details.compile_output && (
                                            <div>
                                                <div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Compiler Output</div>
                                                <pre className="p-4 bg-[#030303] border border-red-500/30 rounded-xl text-sm overflow-x-auto text-red-400 font-mono shadow-inner whitespace-pre-wrap">
                                                    {(() => {
                                                        try { return typeof window !== 'undefined' ? atob(submissionResult.details.compile_output) : submissionResult.details.compile_output; }
                                                        catch (e) { return submissionResult.details.compile_output; }
                                                    })()}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Horizontal Drag Handle */}
                <div
                    className="hidden lg:block w-2 bg-transparent hover:bg-white/10 cursor-col-resize transition-colors rounded-full z-50 shrink-0"
                    onMouseDown={startHorizontalDrag}
                />

                {/* RIGHT PANEL */}
                <div style={{ '--right-width': `${100 - leftWidth}%` }} className="lg:w-[var(--right-width)] w-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
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
                                                // Save current codes for the current language before switching
                                                sessionStorage.setItem(`interview_codes_${difficulty}_${language}`, JSON.stringify(codes));
                                                setShowLangDropdown(false);
                                                setLanguage(lang);

                                                // Restore saved codes for the target language, or use placeholder
                                                const savedCodes = sessionStorage.getItem(`interview_codes_${difficulty}_${lang}`);
                                                if (savedCodes) {
                                                    const parsed = JSON.parse(savedCodes);
                                                    if (parsed.some(c => c)) {
                                                        setCodes(parsed);
                                                        return;
                                                    }
                                                }
                                                const placeholder = lang === "python" ? "# Start writing your code here" : "// Start writing your code here";
                                                setCodes(codes.map(() => placeholder));
                                            }}
                                            className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                                        >
                                            {lang}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Run & Submit Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRun}
                                disabled={isRunning || isSubmitting}
                                className={`px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 text-neutral-300 shadow-sm ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Play size={14} className="text-emerald-400" /> {isRunning ? "Running" : "Run"}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`px-6 py-2 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] hover:-translate-y-0.5'}`}
                            >
                                {isSubmitting ? (
                                    <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Send size={14} />
                                )}
                                {isSubmitting ? "Evaluating" : "Submit"}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden relative z-10 bg-[#0a0a0a]" style={{ height: isConsoleOpen ? `calc(100% - ${consoleHeight}px)` : '100%' }}>
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

                    {/* Draggable Console Area */}
                    <div
                        className="h-1 bg-white/5 hover:bg-white/20 cursor-row-resize z-50 transition-colors"
                        onMouseDown={startDrag}
                    />

                    {/* Console Header/Toggle */}
                    <div className="flex flex-shrink-0 items-center justify-between px-4 py-2 bg-[#0a0a0a] border-t border-white/10 cursor-pointer select-none"
                        onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
                        <div className="flex items-center gap-2 text-neutral-400 font-bold text-[11px] uppercase tracking-widest hover:text-white transition-colors">
                            <TerminalSquare size={14} /> Console {isConsoleOpen ? "▼" : "▲"}
                        </div>
                    </div>

                    {/* Console Body */}
                    {isConsoleOpen && (
                        <div style={{ height: consoleHeight }} className="flex flex-col bg-[#0a0a0a] border-t border-white/5 relative z-40 overflow-hidden text-sm">
                            <div className="flex items-center gap-2 px-2 py-2 border-b border-white/5 bg-white/[0.02]">
                                <button onClick={() => setShowRunResult(false)} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${!showRunResult ? "bg-white/10 text-white shadow-inner" : "text-neutral-500 hover:text-white hover:bg-white/5"}`}>Testcases</button>
                                <button onClick={() => setShowRunResult(true)} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${showRunResult ? "bg-white/10 text-white shadow-inner" : "text-neutral-500 hover:text-white hover:bg-white/5"}`}>Test Result</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
                                {questions[currentIndex]?.sampleTestcases && !showRunResult ? (
                                    <div className="flex flex-col h-full gap-4">
                                        <div className="flex gap-2">
                                            {questions[currentIndex].sampleTestcases.map((_, i) => (
                                                <button key={i} onClick={() => setActiveTestcaseTab(i)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTestcaseTab === i ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-neutral-400 border border-white/5 hover:bg-white/5"}`}>Case {i + 1}</button>
                                            ))}
                                        </div>
                                        {questions[currentIndex].sampleTestcases[activeTestcaseTab] && (
                                            <div className="flex-1 flex flex-col gap-2">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Input</div>
                                                <div className="w-full flex-1 min-h-[60px] bg-[#030303] border border-white/10 rounded-xl p-3 text-neutral-300 font-mono text-sm opacity-70">
                                                    {questions[currentIndex].sampleTestcases[activeTestcaseTab].input}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full gap-4">
                                        {isRunning ? (
                                            <div className="flex items-center justify-center flex-1 text-neutral-500 gap-2">
                                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-sm font-medium tracking-wide text-blue-400">Executing...</span>
                                            </div>
                                        ) : runResults ? (
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="flex gap-2">
                                                    {runResults.map((res, i) => {
                                                        const isAccepted = res.result.status.id === 3;
                                                        return (
                                                            <button key={i} onClick={() => setActiveTestcaseTab(i)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTestcaseTab === i ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-neutral-400 border border-white/5 hover:bg-white/5"}`}>
                                                                {isAccepted ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div> : <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
                                                                Case {i + 1}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                {runResults[activeTestcaseTab] && (
                                                    <div className="space-y-4">
                                                        <div className="text-lg font-bold flex items-center gap-2">
                                                            {runResults[activeTestcaseTab].result.status.id === 3 ? (
                                                                <span className="text-emerald-400">Accepted</span>
                                                            ) : (
                                                                <span className="text-red-400">{runResults[activeTestcaseTab].result.status.description}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 tracking-widest">Input</div>
                                                            <pre className="p-3 bg-[#030303] rounded-xl border border-white/5 text-neutral-300 font-mono shadow-inner overflow-x-auto">{runResults[activeTestcaseTab].input}</pre>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 tracking-widest">Your Output</div>
                                                            <pre className="p-3 bg-[#030303] rounded-xl border border-white/5 text-neutral-300 font-mono shadow-inner overflow-x-auto">
                                                                {(() => {
                                                                    try { return typeof window !== 'undefined' ? atob(runResults[activeTestcaseTab].result.stdout || '') : runResults[activeTestcaseTab].result.stdout; }
                                                                    catch (e) { return runResults[activeTestcaseTab].result.stdout; }
                                                                })()}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center flex-1 text-neutral-600 italic">No run results yet.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
