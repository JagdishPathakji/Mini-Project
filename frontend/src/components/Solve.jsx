import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Play, Send, ChevronDown, CheckCircle2, XCircle, Code2, TerminalSquare, Clock, ArrowLeft } from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";
import AIAssistant from "./AIAssistant";
import confetti from "canvas-confetti";

export default function Solve() {
    const { qno } = useParams();

    const [question, setQuestion] = useState(null);
    const [activeTab, setActiveTab] = useState("Description");
    const [language, setLanguage] = useState(() => {
        return sessionStorage.getItem(`solve_lang_${qno}`) || "python";
    });
    const [code, setCode] = useState(() => {
        const savedLang = sessionStorage.getItem(`solve_lang_${qno}`) || "python";
        const saved = sessionStorage.getItem(`solve_code_${qno}_${savedLang}`);
        return saved || "";
    });
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [progressPercent, setProgressPercent] = useState(0);
    const [submitStage, setSubmitStage] = useState("");
    const [liveTestcases, setLiveTestcases] = useState([]);

    const [submissionHistory, setSubmissionHistory] = useState(null);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Run Console States
    const [sampleTestcases, setSampleTestcases] = useState([]);
    const [consoleHeight, setConsoleHeight] = useState(300);
    const [leftWidth, setLeftWidth] = useState(50);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [activeTestcaseTab, setActiveTestcaseTab] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [runResults, setRunResults] = useState(null);
    const [showRunResult, setShowRunResult] = useState(false);

    const languages = ["python", "javascript", "java", "cpp"];

    const handleRun = async () => {
        if (!code) {
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
                body: JSON.stringify({ qno, code, language, testcases: sampleTestcases })
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

    const handleSubmit = async () => {
        if (!code) {
            toast.error("Code cannot be empty");
            return;
        }

        setIsSubmitting(true);
        setActiveTab("Submissions");
        setSubmissionResult({ status: "running" });
        setProgressPercent(0);
        setSubmitStage("Connecting to Matrix...");
        setLiveTestcases([]);

        try {
            const response = await fetch(`${API_BASE_URL}/question/questionsubmitted`, {
                method: "POST",
                credentials: "include",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ qno, code, language })
            });

            if (!response.ok) {
                // Not standard SSE, maybe server crashed early (e.g. 500)
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
                                setProgressPercent((data.testcase / data.total) * 90); // 90% is execution
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
                                        // Fire celebration confetti bursts
                                        const duration = 3000;
                                        const end = Date.now() + duration;
                                        const frame = () => {
                                            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#f472b6'] });
                                            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#f472b6'] });
                                            if (Date.now() < end) requestAnimationFrame(frame);
                                        };
                                        frame();
                                        // Big center burst
                                        confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#f472b6','#fb923c'] });
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
            console.error("Submission error:", error);
            toast.error(error.message || "An error occurred while submitting");
            setSubmissionResult({ status: false, message: error.message || "Network error" });
        } finally {
            setTimeout(() => setIsSubmitting(false), 500);
        }
    };

    // Persist code to sessionStorage on every change (keyed by qno + language)
    useEffect(() => {
        if (code) {
            sessionStorage.setItem(`solve_code_${qno}_${language}`, code);
        }
    }, [code, qno, language]);

    // Persist language to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(`solve_lang_${qno}`, language);
    }, [language, qno]);

    async function fetchQuestion() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/question/fetchquestion?qno=${qno}`,
                { credentials: "include", headers: COMMON_HEADERS }
            );
            const data = await response.json();

            if (data.status) {
                setQuestion(data.doc);
                // Only set default code if no saved code exists for current language
                const savedCode = sessionStorage.getItem(`solve_code_${qno}_${language}`);
                if (!savedCode) {
                    const defaultCode = language === "python" ? "# Start writing your code here" : "// Start writing your code here";
                    setCode(defaultCode);
                }
                if (data.doc.sampleTestcases) {
                    setSampleTestcases(data.doc.sampleTestcases);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch question");
        }
    }

    useEffect(() => {
        if (qno) fetchQuestion();
    }, [qno]);

    useEffect(() => {
        if (activeTab === "Submissions" && qno && !isSubmitting) {
            setIsLoadingHistory(true);
            fetch(`${API_BASE_URL}/question/fetchsubmissionshistory?qno=${qno}`, { credentials: "include", headers: COMMON_HEADERS })
                .then(res => res.json())
                .then(data => {
                    if (data.status) {
                        setSubmissionHistory(data.history);
                    } else {
                        setSubmissionHistory([]);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch history:", err);
                    setSubmissionHistory([]);
                })
                .finally(() => setIsLoadingHistory(false));
        }
    }, [activeTab, qno, isSubmitting, submissionResult]);

    const handleRestoreCode = () => {
        if (selectedHistory) {
            setCode(selectedHistory.code);
            setLanguage(selectedHistory.language);
            toast.success("Code restored to editor!");
        }
    };

    const handleAnalyzeAI = () => {
        if (selectedHistory) {
            setCode(selectedHistory.code);
            setLanguage(selectedHistory.language);
            setActiveTab("AI Assistant");
            toast.success("Loaded in AI Assistant");
        }
    };

    if (!question) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

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

    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />

            {/* Ambient Backgrounds */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute shadow-[max] top-[40%] right-[-10%] w-[30%] h-[50%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row flex-1 pt-20 pb-6 px-6 gap-2 overflow-hidden relative z-10">

                {/* LEFT PANEL - Glass Card */}
                <div style={ { '--left-width': `${leftWidth}%` } } className="lg:w-[var(--left-width)] w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {/* Tabs */}
                    <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-[#0a0a0a] relative z-10">
                        {["Description", "AI Assistant", "Submissions"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === tab
                                    ? "bg-white/10 text-white shadow-inner"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                        {activeTab === "Description" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent flex justify-between items-start gap-4">
                                    <span>{question.qno}. {question.qheading}</span>
                                    {question.isSolved && (
                                        <span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(52,211,153,0.15)] group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                                            <CheckCircle2 size={16} className="relative z-10" /> Solved
                                        </span>
                                    )}
                                </h1>

                                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                    <span className={`px-3 py-1.5 rounded-lg border ${question.qdifficulty?.toLowerCase() === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                        question.qdifficulty?.toLowerCase() === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                            'bg-red-500/10 border-red-500/20 text-red-500'
                                        }`}>
                                        {question.qdifficulty}
                                    </span>
                                    {question.qtags?.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-neutral-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div
                                    className="text-neutral-400 leading-relaxed text-sm 
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
                                    dangerouslySetInnerHTML={{ __html: question.qdescription }}
                                />
                            </div>
                        )}

                        {
                            activeTab === "AI Assistant" && (<AIAssistant question={question} code={code} language={language} />)
                        }

                        {activeTab === "Submissions" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                                {!submissionResult ? (
                                    <div className="flex flex-col h-full">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Submission History</h3>
                                            <button onClick={() => {
                                                setIsLoadingHistory(true);
                                                fetch(`${API_BASE_URL}/question/fetchsubmissionshistory?qno=${qno}`, { credentials: "include", headers: COMMON_HEADERS }).then(res=>res.json()).then(data=>setSubmissionHistory(data.history||[])).finally(()=>setIsLoadingHistory(false));
                                            }} className="text-[10px] text-blue-400 hover:text-blue-300">Refresh</button>
                                        </div>
                                        
                                        {isLoadingHistory ? (
                                            <div className="flex items-center justify-center p-8 mt-10">
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                        ) : selectedHistory ? (
                                            <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-inner">
                                                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 sticky top-0 z-10">
                                                    <button onClick={() => setSelectedHistory(null)} className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                                                        <ArrowLeft size={16} />
                                                    </button>
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${selectedHistory.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{selectedHistory.status}</span>
                                                        <span className="text-xs text-neutral-500 font-mono">{selectedHistory.language}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 bg-[#030303]">
                                                    <pre className="text-sm font-mono text-neutral-300 whitespace-pre-wrap">{selectedHistory.code}</pre>
                                                </div>
                                                <div className="p-4 border-t border-white/5 bg-[#0a0a0a] grid grid-cols-2 gap-3">
                                                    <button onClick={handleRestoreCode} className="px-4 py-2 border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-blue-500/20 transition-all flex justify-center items-center gap-2">
                                                        <Code2 size={14} /> Restore
                                                    </button>
                                                    <button onClick={handleAnalyzeAI} className="px-4 py-2 border border-purple-500/20 bg-purple-500/10 text-purple-400 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-purple-500/20 transition-all flex justify-center items-center gap-2">
                                                        <TerminalSquare size={14} /> AI Analyze
                                                    </button>
                                                </div>
                                            </div>
                                        ) : submissionHistory && submissionHistory.length > 0 ? (
                                            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                                {submissionHistory.map((sub, i) => (
                                                    <div key={i} onClick={() => setSelectedHistory(sub)} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 cursor-pointer transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            {sub.status === 'accepted' ? (
                                                                <CheckCircle2 size={18} className="text-emerald-400" />
                                                            ) : (
                                                                <XCircle size={18} className="text-red-400" />
                                                            )}
                                                            <div>
                                                                <div className={`text-sm font-bold capitalize ${sub.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>{sub.status}</div>
                                                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1 flex items-center gap-2">
                                                                    <span>{new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                    <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                                                    <span>{sub.language}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-1">
                                                            <div className="text-[11px] text-neutral-300 font-mono tracking-wide">{sub.tc}s</div>
                                                            {sub.sc && sub.sc !== "0" && <div className="text-[10px] text-neutral-500 font-mono">{sub.sc} KB</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 mt-16">
                                                <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                                                    <Clock size={24} className="text-white/20 ml-1" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 cursor-pointer">No Submissions</div>
                                                    <div className="text-sm font-medium text-neutral-600">Start by clicking submit</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : submissionResult.status === "running" ? (
                                    <div className="flex flex-col h-full mt-4">
                                        <div className="flex flex-col items-center gap-6 mb-8 mt-6">
                                            {/* Core spinner / visualizer */}
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

                                        {/* Live Test Case Matrix Feed */}
                                        {liveTestcases.length > 0 && (
                                            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col relative">
                                                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 sticky top-0 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Live Execution Matrix</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                                                    {liveTestcases.map((tc) => (
                                                        <div key={tc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-neutral-500 font-mono text-xs w-6">{tc.id}.</span>
                                                                <span className="text-sm font-medium text-neutral-300">Testcase {tc.id}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {tc.status === 'running' ? (
                                                                    <>
                                                                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]">Running</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-[10px] font-mono text-neutral-500">{parseFloat(tc.time).toFixed(3)}s</span>
                                                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]">Passed</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Scroll Target Anchor */}
                                                    <div className="h-4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : submissionResult.status === true ? (
                                    <div className="p-8 bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl shadow-[0_0_50px_-10px_rgba(52,211,153,0.15)] mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                        <button onClick={() => { setSubmissionResult(null); setSelectedHistory(null); }} className="absolute top-4 right-4 z-20 hover:bg-white/10 p-2 rounded-xl text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                                            <ArrowLeft size={14} /> Back to History
                                        </button>
                                        
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
                                                    {submissionResult.details?.time || "0.00"} <span className="text-sm text-neutral-500 mb-1">sec</span>
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
                                        <button onClick={() => { setSubmissionResult(null); setSelectedHistory(null); }} className="absolute top-4 right-4 z-20 hover:bg-white/10 p-2 rounded-xl text-red-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                                            <ArrowLeft size={14} /> Back to History
                                        </button>
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

                {/* RIGHT PANEL - Editor Card */}
                <div style={ { '--right-width': `${100 - leftWidth}%` } } className="lg:w-[var(--right-width)] w-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* Editor Header */}
                    <div className="flex flex-shrink-0 justify-between items-center px-6 h-16 border-b border-white/5 bg-[#0a0a0a] relative z-50">

                        {/* Language Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setShowLangDropdown(!showLangDropdown)
                                }
                                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border border-white/10 bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                {language}
                                <ChevronDown size={14} />
                            </button>

                            {showLangDropdown && (
                                <div className="absolute top-full mt-2 w-40 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
                                    {languages.map(lang => (
                                        <div
                                            key={lang}
                                            onClick={() => {
                                                // Save current code for current language before switching
                                                sessionStorage.setItem(`solve_code_${qno}_${language}`, code);
                                                setShowLangDropdown(false);
                                                setLanguage(lang);

                                                // Restore saved code for the target language, or use placeholder
                                                const savedCode = sessionStorage.getItem(`solve_code_${qno}_${lang}`);
                                                if (savedCode) {
                                                    setCode(savedCode);
                                                } else if (lang === "python") {
                                                    setCode("# Start writing your code here");
                                                } else {
                                                    setCode("// Start writing your code here");
                                                }
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
                                className={`px-6 py-2 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed transform-none shadow-none' : ''}`}
                            >
                                <Send size={14} /> {isSubmitting ? "Running" : "Submit"}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden relative z-10 bg-[#0a0a0a]" style={{ height: isConsoleOpen ? `calc(100% - ${consoleHeight}px)` : '100%' }}>
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                padding: { top: 20 },
                                smoothScrolling: true,
                                scrollbar: {
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                }
                            }}
                        />
                    </div>

                    {/* Draggable Console Area */}
                    <div 
                        className="h-1 bg-white/5 hover:bg-white/20 cursor-row-resize z-50 transition-colors"
                        onMouseDown={startDrag}
                    />

                    {/* Console Header/Toggle */}
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-t border-white/10 cursor-pointer select-none"
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
                                {!showRunResult ? (
                                    <div className="flex flex-col h-full gap-4">
                                        <div className="flex gap-2">
                                            {sampleTestcases.map((_, i) => (
                                                <button key={i} onClick={() => setActiveTestcaseTab(i)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTestcaseTab === i ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-neutral-400 border border-white/5 hover:bg-white/5"}`}>Case {i + 1}</button>
                                            ))}
                                        </div>
                                        {sampleTestcases[activeTestcaseTab] && (
                                            <div className="flex-1 flex flex-col gap-2">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Input</div>
                                                <textarea 
                                                    value={sampleTestcases[activeTestcaseTab].input}
                                                    readOnly
                                                    className="w-full flex-1 min-h-[100px] bg-[#030303] border border-white/10 rounded-xl p-3 text-neutral-300 font-mono text-sm focus:outline-none focus:border-white/20 resize-none scrollbar-thin scrollbar-thumb-white/10 opacity-70 cursor-not-allowed"
                                                />
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
                                                                })() || <span className="text-neutral-600 italic">No output</span>}
                                                            </pre>
                                                        </div>
                                                        {runResults[activeTestcaseTab].expected_output && (
                                                            <div>
                                                                <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 tracking-widest">Expected Output</div>
                                                                <pre className="p-3 bg-[#030303] rounded-xl border border-white/5 text-neutral-300 font-mono shadow-inner overflow-x-auto">{runResults[activeTestcaseTab].expected_output}</pre>
                                                            </div>
                                                        )}
                                                        {runResults[activeTestcaseTab].result.compile_output && (
                                                            <div>
                                                                <div className="text-[10px] uppercase font-bold text-red-500/80 mb-1 tracking-widest">Compiler Output</div>
                                                                <pre className="p-3 bg-[#030303] rounded-xl border border-red-500/30 text-red-400 font-mono shadow-inner overflow-x-auto whitespace-pre-wrap">
                                                                    {(() => {
                                                                        try { return typeof window !== 'undefined' ? atob(runResults[activeTestcaseTab].result.compile_output) : runResults[activeTestcaseTab].result.compile_output; } 
                                                                        catch (e) { return runResults[activeTestcaseTab].result.compile_output; }
                                                                    })()}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col justify-center items-center h-full text-neutral-500 gap-4 mt-8">
                                                <div className="p-4 rounded-full bg-white/[0.02] border border-dashed border-white/10">
                                                    <Play size={24} className="text-white/20 ml-1" />
                                                </div>
                                                <span className="text-[11px] font-bold uppercase tracking-widest">Execute code to see results</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}