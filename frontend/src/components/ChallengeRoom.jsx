import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import confetti from "canvas-confetti";
import {
    Play, Send, ChevronDown, CheckCircle2, XCircle, Code2,
    TerminalSquare, Timer, Swords, Flag, Handshake, AlertCircle,
    Trophy, Skull, Clock, ArrowLeft, Copy, User
} from "lucide-react";
import Navbar from "./Navbar";

const SOCKET_URL = "http://localhost:3000";

export default function ChallengeRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, question: initQ, difficulty, duration, timeLeft: initTime, players, isCreator } = location.state || {};

    const socketRef = useRef(null);
    const [question, setQuestion] = useState(initQ || null);
    const [timeLeft, setTimeLeft] = useState(initTime || duration || 900);
    const [activeTab, setActiveTab] = useState("Description");
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("# Start writing your code here");
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50);
    const [consoleHeight, setConsoleHeight] = useState(250);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [progressPercent, setProgressPercent] = useState(0);
    const [submitStage, setSubmitStage] = useState("");
    const [liveTestcases, setLiveTestcases] = useState([]);

    // Run console
    const [sampleTestcases, setSampleTestcases] = useState(initQ?.sampleTestcases || []);
    const [activeTestcaseTab, setActiveTestcaseTab] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [runResults, setRunResults] = useState(null);
    const [showRunResult, setShowRunResult] = useState(false);

    // Match states
    const [matchOver, setMatchOver] = useState(null);
    const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
    const [tieRequested, setTieRequested] = useState(false);
    const [opponentTieRequest, setOpponentTieRequest] = useState(false);

    const languages = ["python", "javascript", "java", "cpp", "c"];

    const myUsername = players?.find((_, i) => isCreator ? i === 0 : i === 1)?.username || "You";
    const opponentUsername = players?.find((_, i) => isCreator ? i === 1 : i === 0)?.username || "Opponent";

    // Redirect if no state
    useEffect(() => {
        if (!roomId || !initQ) { navigate("/1v1-challenge"); }
    }, [roomId, initQ, navigate]);

    // Socket setup
    useEffect(() => {
        if (!roomId) return;
        const token = document.cookie.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1] || "";
        const s = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
        socketRef.current = s;

        // Rejoin the room so server knows our new socketId
        s.on("connect", () => {
            s.emit("rejoin-room", { roomId });
        });

        s.on("rejoin-success", ({ timeLeft: t }) => {
            setTimeLeft(t);
            console.log("[ChallengeRoom] Rejoined room, synced timer:", t);
        });

        s.on("room-error", ({ message }) => {
            toast.error(message);
        });

        s.on("timer-tick", ({ timeLeft: t }) => setTimeLeft(t));

        s.on("submission-update", (data) => {
            if (data.stage === "start") {
                setIsSubmitting(true);
                setActiveTab("Submissions");
                setSubmissionResult({ status: "running" });
                setProgressPercent(0);
                setSubmitStage("Connecting to Matrix...");
                setLiveTestcases([]);
            } else if (data.stage === "running") {
                setSubmitStage(`Executing Test Case ${data.testcase} of ${data.total}`);
                setProgressPercent((data.testcase / data.total) * 90);
                setLiveTestcases(prev => {
                    if (prev.find(t => t.id === data.testcase)) return prev;
                    return [...prev, { id: data.testcase, status: "running" }];
                });
            } else if (data.stage === "passed") {
                setLiveTestcases(prev => prev.map(t =>
                    t.id === data.testcase ? { ...t, status: "passed", time: data.time } : t
                ));
            } else if (data.stage === "completed") {
                setProgressPercent(100);
                setSubmitStage("Finalizing...");
                setTimeout(() => {
                    setSubmissionResult(data);
                    setIsSubmitting(false);
                    if (data.status) toast.success("All testcases passed!");
                    else toast.error(data.message || "Submission failed");
                }, 300);
            }
        });

        s.on("match-over", (payload) => {
            setMatchOver(payload);
            if (payload.reason === "solved" && payload.winner?.username === myUsername) {
                const end = Date.now() + 3000;
                const frame = () => {
                    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#f472b6'] });
                    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#f472b6'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                };
                frame();
                confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors: ['#34d399','#60a5fa','#a78bfa','#facc15','#fb923c'] });
            }
        });

        s.on("tie-requested", ({ from }) => {
            setOpponentTieRequest(true);
            toast(`${from} wants to declare a tie`, { icon: "🤝" });
        });

        s.on("tie-request-sent", () => {
            setTieRequested(true);
            toast.success("Tie request sent to opponent");
        });

        // Periodic code sync so server has latest code for post-match reveal
        const codeSync = setInterval(() => {
            if (socketRef.current?.connected) {
                socketRef.current.emit("code-update", { roomId, code: codeRef.current, language: langRef.current });
            }
        }, 5000);

        return () => { clearInterval(codeSync); s.disconnect(); };
    }, []); // eslint-disable-line

    // Refs for code sync interval
    const codeRef = useRef(code);
    const langRef = useRef(language);
    useEffect(() => { codeRef.current = code; }, [code]);
    useEffect(() => { langRef.current = language; }, [language]);

    const formatTime = (s) => {
        const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
        return `${h > 0 ? h + ":" : ""}${m < 10 ? "0" + m : m}:${sec < 10 ? "0" + sec : sec}`;
    };

    // Handlers
    const handleRun = async () => {
        if (!code.trim()) { toast.error("Code cannot be empty"); return; }
        setIsRunning(true); setShowRunResult(true); setIsConsoleOpen(true); setRunResults(null);
        try {
            const res = await fetch("http://localhost:3000/question/runcode", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qno: question.qno, code, language, testcases: sampleTestcases })
            });
            const data = await res.json();
            if (res.ok && data.status) setRunResults(data.results);
            else toast.error(data.message || "Run failed");
        } catch { toast.error("Error running code"); }
        finally { setIsRunning(false); }
    };

    const handleSubmit = () => {
        if (!code.trim()) { toast.error("Code cannot be empty"); return; }
        if (!socketRef.current?.connected) { toast.error("Connection lost"); return; }
        socketRef.current.emit("submit-code", { roomId, code, language });
    };

    const handleGiveUp = () => {
        socketRef.current?.emit("give-up", { roomId });
        setShowGiveUpConfirm(false);
    };

    const handleRequestTie = () => {
        socketRef.current?.emit("request-tie", { roomId });
    };

    // Drag handlers
    const startHorizontalDrag = (e) => {
        e.preventDefault();
        const startX = e.clientX; const startW = leftWidth;
        const cw = window.innerWidth - 48;
        const move = (e) => { const nw = startW + ((e.clientX - startX) / cw) * 100; if (nw > 20 && nw < 80) setLeftWidth(nw); };
        const stop = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", stop); };
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", stop);
    };

    const startConsoleDrag = (e) => {
        e.preventDefault();
        const startY = e.clientY; const startH = consoleHeight;
        const move = (e) => { const nh = startH - (e.clientY - startY); if (nh > 100 && nh < window.innerHeight - 200) setConsoleHeight(nh); };
        const stop = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", stop); };
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", stop);
    };

    const diffColor = difficulty === "Easy" ? "emerald" : difficulty === "Medium" ? "amber" : "red";

    if (!question) return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;

    // ─── MATCH OVER MODAL ────────────────────────────────────────────────
    if (matchOver) {
        const isWinner = matchOver.winner?.username === myUsername;
        const isTie = matchOver.result === "tie" || matchOver.reason === "tie-agreed";
        const accent = isTie ? "amber" : isWinner ? "emerald" : "red";
        const title = isTie ? "It's a Tie!" : isWinner ? "You Won!" : "You Lost";
        const Icon = isTie ? Handshake : isWinner ? Trophy : Skull;

        const myCode = isTie
            ? matchOver.players?.find(p => p.username === myUsername)?.code
            : isWinner ? matchOver.winner?.code : matchOver.loser?.code;
        const oppCode = isTie
            ? matchOver.players?.find(p => p.username !== myUsername)?.code
            : isWinner ? matchOver.loser?.code : matchOver.winner?.code;
        const myLang = isTie
            ? matchOver.players?.find(p => p.username === myUsername)?.language
            : isWinner ? matchOver.winner?.language : matchOver.loser?.language;
        const oppLang = isTie
            ? matchOver.players?.find(p => p.username !== myUsername)?.language
            : isWinner ? matchOver.loser?.language : matchOver.winner?.language;

        return (
            <div className="min-h-screen bg-[#030303] text-white flex flex-col overflow-hidden selection:bg-white selection:text-black">
                <Navbar />
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full bg-violet-600/8 blur-[130px] pointer-events-none" />
                <div className="flex-1 flex flex-col items-center pt-24 pb-12 px-4 sm:px-6 overflow-y-auto relative z-10">
                    <div className={`w-20 h-20 rounded-full bg-${accent}-500/10 border border-${accent}-500/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,0,0,0.3)]`}
                        style={{ boxShadow: `0 0 50px ${accent === "emerald" ? "rgba(52,211,153,0.3)" : accent === "amber" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                        <Icon size={36} className={`text-${accent}-400`} style={{ color: accent === "emerald" ? "#34d399" : accent === "amber" ? "#fbbf24" : "#f87171" }} />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 tracking-tight"
                        style={{ color: accent === "emerald" ? "#34d399" : accent === "amber" ? "#fbbf24" : "#f87171" }}>{title}</h1>
                    <p className="text-neutral-400 text-sm mb-8 font-medium">{matchOver.message}</p>

                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Your code */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                                <User size={14} className="text-blue-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Your Code</span>
                                <span className="text-[10px] text-neutral-500 font-mono ml-auto">{myLang || language}</span>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                <pre className="text-sm font-mono text-neutral-300 whitespace-pre-wrap">{myCode || code || "No code submitted"}</pre>
                            </div>
                        </div>
                        {/* Opponent code */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                                <Swords size={14} className="text-violet-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">{opponentUsername}'s Code</span>
                                <span className="text-[10px] text-neutral-500 font-mono ml-auto">{oppLang || "—"}</span>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                <pre className="text-sm font-mono text-neutral-300 whitespace-pre-wrap">{oppCode || "No code submitted"}</pre>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => navigate("/1v1-challenge")}
                        className="mt-8 px-8 py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-neutral-200 transition-all shadow-[0_0_25px_-5px_rgba(255,255,255,0.3)]">
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    // ─── MAIN ARENA LAYOUT (mirrors Solve.jsx) ─────────────────────────
    return (
        <div className="h-screen bg-[#030303] text-white flex flex-col overflow-hidden relative selection:bg-white selection:text-black">
            <Navbar />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] right-[-10%] w-[30%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row flex-1 pt-20 pb-6 px-6 gap-2 overflow-hidden relative z-10">
                {/* LEFT PANEL */}
                <div style={{ "--left-width": `${leftWidth}%` }} className="lg:w-[var(--left-width)] w-full bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {/* Tabs + Timer + Opponent */}
                    <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#0a0a0a] relative z-10 flex-wrap gap-2">
                        <div className="flex gap-2 flex-wrap">
                            {["Description", "Submissions"].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === tab ? "bg-white/10 text-white shadow-inner" : "text-neutral-500 hover:text-white hover:bg-white/5"}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Opponent Badge */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                                <Swords size={12} className="text-violet-400" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">vs {opponentUsername}</span>
                            </div>
                            {/* Difficulty */}
                            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider bg-${diffColor}-500/10 border-${diffColor}-500/20 text-${diffColor}-400`}
                                style={{ color: diffColor === "emerald" ? "#34d399" : diffColor === "amber" ? "#fbbf24" : "#f87171", borderColor: diffColor === "emerald" ? "rgba(52,211,153,.2)" : diffColor === "amber" ? "rgba(245,158,11,.2)" : "rgba(239,68,68,.2)", background: diffColor === "emerald" ? "rgba(52,211,153,.1)" : diffColor === "amber" ? "rgba(245,158,11,.1)" : "rgba(239,68,68,.1)" }}>
                                {difficulty}
                            </div>
                            {/* Timer */}
                            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-sm font-bold shadow-inner transition-colors ${timeLeft < 120 ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" : "bg-white/5 border-white/10 text-neutral-300"}`}>
                                <Timer size={14} className={timeLeft < 120 ? "text-red-500" : "text-neutral-400"} />
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                        {activeTab === "Description" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
                                    {question.qno}. {question.qheading}
                                </h1>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                                    {question.qtags?.map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-neutral-300">{tag}</span>
                                    ))}
                                </div>
                                <div className="text-neutral-400 leading-relaxed text-sm
                                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-white
                                    [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-white
                                    [&_pre]:p-5 [&_pre]:bg-[#030303] [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-6 [&_pre]:border [&_pre]:border-white/5 [&_pre]:text-sm [&_pre]:font-mono [&_pre]:text-neutral-300
                                    [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-white [&_code]:font-mono [&_code]:text-[13px]
                                    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:rounded-none
                                    [&_p]:mb-4 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-4"
                                    dangerouslySetInnerHTML={{ __html: question.qdescription }} />

                                {/* Action buttons */}
                                <div className="flex gap-3 pt-4 border-t border-white/5">
                                    <button onClick={() => setShowGiveUpConfirm(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 border border-red-500/20 bg-red-500/5 rounded-xl text-red-400 text-[11px] font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all">
                                        <Flag size={14} /> Give Up
                                    </button>
                                    <button onClick={handleRequestTie} disabled={tieRequested}
                                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${tieRequested ? "border-amber-500/30 bg-amber-500/10 text-amber-400/60 cursor-not-allowed" : opponentTieRequest ? "border-amber-500/30 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 animate-pulse" : "border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"}`}>
                                        <Handshake size={14} /> {tieRequested ? "Tie Requested" : opponentTieRequest ? "Accept Tie" : "Declare Tie"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "Submissions" && (
                            <div className="p-8 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                                {!submissionResult ? (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 mt-20">
                                        <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                                            <Send size={24} className="text-white/20 ml-1" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Live Testing</div>
                                            <div className="text-sm font-medium text-neutral-600">Click Submit to test against all cases</div>
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
                                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300 relative shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                                                        style={{ width: `${progressPercent}%` }}>
                                                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.5s_infinite]" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {liveTestcases.length > 0 && (
                                            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                                                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Live Execution Matrix</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                                                    {liveTestcases.map(tc => (
                                                        <div key={tc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-neutral-500 font-mono text-xs w-6">{tc.id}.</span>
                                                                <span className="text-sm font-medium text-neutral-300">Testcase {tc.id}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {tc.status === "running" ? (
                                                                    <><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Running</span></>
                                                                ) : (
                                                                    <><span className="text-[10px] font-mono text-neutral-500">{parseFloat(tc.time).toFixed(3)}s</span><CheckCircle2 size={14} className="text-emerald-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Passed</span></>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : submissionResult.status === true ? (
                                    <div className="p-8 bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl shadow-[0_0_50px_-10px_rgba(52,211,153,0.15)] relative overflow-hidden">
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
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Runtime</div>
                                                <div className="text-3xl font-extrabold text-white flex items-end gap-1">{submissionResult.details?.time || "0.00"} <span className="text-sm text-neutral-500 mb-1">sec</span></div>
                                            </div>
                                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Memory</div>
                                                <div className="text-3xl font-extrabold text-white flex items-end gap-1">{submissionResult.details?.memory || "0"} <span className="text-sm text-neutral-500 mb-1">KB</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-6">
                                        <button onClick={() => setSubmissionResult(null)} className="absolute top-4 right-4 hover:bg-white/10 p-2 rounded-xl text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                                            <ArrowLeft size={14} /> Try Again
                                        </button>
                                        <div className="text-red-400 font-bold text-xl flex items-center gap-2"><XCircle size={24} /> Failed</div>
                                        <div className="text-red-400/80 text-sm font-medium">{submissionResult.message}</div>
                                        {submissionResult.failed_testcase && (
                                            <div className="space-y-4">
                                                <div><div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Input</div><pre className="p-4 bg-[#030303] border border-red-500/20 rounded-xl text-sm overflow-x-auto text-neutral-300 font-mono">{submissionResult.failed_testcase.input}</pre></div>
                                                <div><div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold">Expected Output</div><pre className="p-4 bg-[#030303] border border-red-500/20 rounded-xl text-sm overflow-x-auto text-neutral-300 font-mono">{submissionResult.failed_testcase.expected_output}</pre></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Horizontal Drag Handle */}
                <div className="hidden lg:block w-2 bg-transparent hover:bg-white/10 cursor-col-resize transition-colors rounded-full z-50 shrink-0" onMouseDown={startHorizontalDrag} />

                {/* RIGHT PANEL — Editor */}
                <div style={{ "--right-width": `${100 - leftWidth}%` }} className="lg:w-[var(--right-width)] w-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl h-full overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0" />

                    {/* Editor Header */}
                    <div className="flex flex-shrink-0 justify-between items-center px-6 h-16 border-b border-white/5 bg-[#0a0a0a] relative z-50">
                        <div className="relative">
                            <button onClick={() => setShowLangDropdown(!showLangDropdown)}
                                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border border-white/10 bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                                {language} <ChevronDown size={14} />
                            </button>
                            {showLangDropdown && (
                                <div className="absolute top-full mt-2 w-40 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
                                    {languages.map(lang => (
                                        <div key={lang} onClick={() => { setShowLangDropdown(false); setLanguage(lang); if (!code || code === "# Start writing your code here" || code === "// Start writing your code here") setCode(lang === "python" ? "# Start writing your code here" : "// Start writing your code here"); }}
                                            className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
                                            {lang}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleRun} disabled={isRunning || isSubmitting}
                                className={`px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-neutral-300 ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}>
                                <Play size={14} className="text-emerald-400" /> {isRunning ? "Running" : "Run"}
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className={`px-6 py-2 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] hover:-translate-y-0.5"}`}>
                                <Send size={14} /> {isSubmitting ? "Running" : "Submit"}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden relative z-10 bg-[#0a0a0a]" style={{ height: isConsoleOpen ? `calc(100% - ${consoleHeight}px)` : "100%" }}>
                        <Editor height="100%" language={language} theme="vs-dark" value={code} onChange={(v) => setCode(v)}
                            options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 20 }, smoothScrolling: true, scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } }} />
                    </div>

                    <div className="h-1 bg-white/5 hover:bg-white/20 cursor-row-resize z-50 transition-colors" onMouseDown={startConsoleDrag} />
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-t border-white/10 cursor-pointer select-none" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
                        <div className="flex items-center gap-2 text-neutral-400 font-bold text-[11px] uppercase tracking-widest hover:text-white transition-colors">
                            <TerminalSquare size={14} /> Console {isConsoleOpen ? "▼" : "▲"}
                        </div>
                    </div>

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
                                                <textarea value={sampleTestcases[activeTestcaseTab].input} readOnly className="w-full flex-1 min-h-[100px] bg-[#030303] border border-white/10 rounded-xl p-3 text-neutral-300 font-mono text-sm focus:outline-none resize-none opacity-70 cursor-not-allowed" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full gap-4">
                                        {isRunning ? (
                                            <div className="flex items-center justify-center flex-1 text-neutral-500 gap-2"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm font-medium text-blue-400">Executing...</span></div>
                                        ) : runResults ? (
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="flex gap-2">
                                                    {runResults.map((res, i) => (
                                                        <button key={i} onClick={() => setActiveTestcaseTab(i)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTestcaseTab === i ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-neutral-400 border border-white/5"}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${res.result.status.id === 3 ? "bg-emerald-500" : "bg-red-500"}`} />Case {i + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                {runResults[activeTestcaseTab] && (
                                                    <div className="space-y-4">
                                                        <div className="text-lg font-bold flex items-center gap-2">
                                                            {runResults[activeTestcaseTab].result.status.id === 3 ? <span className="text-emerald-400">Accepted</span> : <span className="text-red-400">{runResults[activeTestcaseTab].result.status.description}</span>}
                                                        </div>
                                                        <div><div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 tracking-widest">Input</div><pre className="p-3 bg-[#030303] rounded-xl border border-white/5 text-neutral-300 font-mono overflow-x-auto">{runResults[activeTestcaseTab].input}</pre></div>
                                                        <div><div className="text-[10px] uppercase font-bold text-neutral-500 mb-1 tracking-widest">Your Output</div><pre className="p-3 bg-[#030303] rounded-xl border border-white/5 text-neutral-300 font-mono overflow-x-auto">{(() => { try { return atob(runResults[activeTestcaseTab].result.stdout || ""); } catch { return runResults[activeTestcaseTab].result.stdout; } })() || <span className="text-neutral-600 italic">No output</span>}</pre></div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : <div className="flex items-center justify-center flex-1 text-neutral-600 text-sm">Run your code to see results</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Give Up Confirmation */}
            {showGiveUpConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGiveUpConfirm(false)} />
                    <div className="relative bg-neutral-950/80 border border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                                <AlertCircle size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white">Give Up?</h3>
                            <p className="text-neutral-400 text-sm mb-8 leading-relaxed max-w-xs">Your opponent will win immediately.</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={() => setShowGiveUpConfirm(false)} className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-neutral-300 hover:bg-white/10 transition-all">Cancel</button>
                                <button onClick={handleGiveUp} className="px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
