import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Navbar from "./Navbar";

const BACKEND_URL = "http://localhost:3000/user/ai/interview";
const MAX_VIOLATIONS = 3;

export default function InterviewRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, difficulty, jobDescription } = location.state || {};

    const { transcript, resetTranscript } = useSpeechRecognition();
    const silenceTimer = useRef(null);
    const containerRef = useRef(null);

    const [phase, setPhase] = useState("ai-speaking");
    const [started, setStarted] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Anti-plagiarism state
    const [violations, setViolations] = useState(0);
    const [violationLog, setViolationLog] = useState([]);
    const [warningModal, setWarningModal] = useState(null); // { reason, count }
    const [terminated, setTerminated] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: "system",
            content: `
You are a professional interviewer for a ${role} position.
Difficulty: ${difficulty}
Job Description: ${jobDescription}
Its verbal interview so dont ask to write something.
Never provide code as output as it is verbal interview.
Never provide markdown.

Rules:
- Ask ONE question at a time
- Keep responses short
- Speak naturally
- Start with greeting and first question
            `,
        },
    ]);

    // ─── Fullscreen ────────────────────────────────────────────────────────────

    const enterFullscreen = useCallback(() => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }, []);

    useEffect(() => {
        const onFsChange = () => {
            const inFs = !!document.fullscreenElement;
            setIsFullscreen(inFs);
            if (!inFs && !terminated) {
                setShowFullscreenPrompt(true);
                recordViolation("Exited fullscreen mode");
            }
        };
        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
        };
    }, [terminated]);

    // ─── Violation engine ──────────────────────────────────────────────────────

    const recordViolation = useCallback((reason) => {
        const timestamp = new Date().toLocaleTimeString();
        setViolations(prev => {
            const next = prev + 1;
            setViolationLog(log => [...log, { reason, timestamp, count: next }]);
            if (next >= MAX_VIOLATIONS) {
                setTerminated(true);
                setWarningModal({ reason, count: next, final: true });
                speechSynthesis.cancel();
                SpeechRecognition.stopListening();
                exitFullscreen();
            } else {
                setWarningModal({ reason, count: next, final: false });
            }
            return next;
        });
    }, [exitFullscreen]);

    // ─── Tab / window visibility ───────────────────────────────────────────────

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !terminated) {
                recordViolation("Switched to another tab or minimized window");
            }
        };
        const handleBlur = () => {
            if (!terminated) {
                recordViolation("Left the interview window");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [terminated, recordViolation]);

    // ─── Copy / Paste / Right-click prevention ─────────────────────────────────

    useEffect(() => {
        const prevent = (e) => {
            e.preventDefault();
            recordViolation(`Attempted ${e.type} action`);
        };
        const preventContextMenu = (e) => e.preventDefault();

        document.addEventListener("copy", prevent);
        document.addEventListener("paste", prevent);
        document.addEventListener("cut", prevent);
        document.addEventListener("contextmenu", preventContextMenu);

        return () => {
            document.removeEventListener("copy", prevent);
            document.removeEventListener("paste", prevent);
            document.removeEventListener("cut", prevent);
            document.removeEventListener("contextmenu", preventContextMenu);
        };
    }, [recordViolation]);

    // ─── Keyboard shortcuts prevention ────────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Block: Alt+Tab, Ctrl+Tab, Win key, F11 exit, PrintScreen
            const blocked = (
                (e.altKey && e.key === "Tab") ||
                (e.ctrlKey && e.key === "Tab") ||
                (e.metaKey) ||
                (e.key === "PrintScreen") ||
                (e.ctrlKey && e.shiftKey && e.key === "I") || // DevTools
                (e.ctrlKey && e.shiftKey && e.key === "J") ||
                (e.key === "F12") ||
                (e.ctrlKey && e.key === "u")                  // View source
            );
            if (blocked) {
                e.preventDefault();
                recordViolation(`Blocked keyboard shortcut: ${e.ctrlKey ? "Ctrl+" : ""}${e.altKey ? "Alt+" : ""}${e.key}`);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [recordViolation]);

    // ─── Speech / AI ───────────────────────────────────────────────────────────

    const speak = (text) => {
        if (!text || !text.trim()) return;
        speechSynthesis.cancel();
        setMessages(prev => [...prev, { role: "assistant", content: text }]);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.onstart = () => setPhase("ai-speaking");
        utterance.onend = () => {
            setPhase("listening");
            SpeechRecognition.startListening({ continuous: true });
        };
        speechSynthesis.speak(utterance);
    };

    const callAI = async (context) => {
        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: context }),
            });
            const data = await res.json();
            speak(data.message);
        } catch (err) {
            console.error(err);
            speak("Sorry, something went wrong.");
        }
    };

    useEffect(() => {
        if (!role || !difficulty) return;
        if (started) return;
        setStarted(true);
        enterFullscreen();
        callAI(messages);
    }, []);

    useEffect(() => {
        if (phase !== "listening") return;
        if (!transcript.trim()) return;
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
            SpeechRecognition.stopListening();
            const userMsg = { role: "user", content: transcript };
            setMessages(prev => {
                const updated = [...prev, userMsg];
                callAI(updated);
                return updated;
            });
            resetTranscript();
        }, 4000);
    }, [transcript, phase]);

    // ─── Exit ──────────────────────────────────────────────────────────────────

    const handleExitConfirm = () => {
        speechSynthesis.cancel();
        SpeechRecognition.stopListening();
        exitFullscreen();
        navigate("/ai-interview");
    };

    // ─── Violation badge color ─────────────────────────────────────────────────

    const violationColor = violations === 0
        ? "text-green-400"
        : violations === 1
            ? "text-yellow-400"
            : violations === 2
                ? "text-orange-400"
                : "text-red-400";

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black"
            onCopy={e => e.preventDefault()}
            onPaste={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
        >
            <Navbar />

            <main className="pt-24 pb-12 max-w-4xl mx-auto px-6">

                {/* Header */}
                <div className="mb-10 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Interview Room</h1>
                        <p className="text-neutral-400">Live AI-powered mock interview session.</p>
                    </div>
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                        </svg>
                        Exit Interview
                    </button>
                </div>

                {/* Session Card */}
                <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-8 space-y-6">

                    {/* Info Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Role</p>
                            <p className="text-white font-medium">{role}</p>
                        </div>
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Difficulty</p>
                            <p className="text-white font-medium">{difficulty}</p>
                        </div>
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Status</p>
                            <p className={phase === "ai-speaking" ? "text-yellow-400" : "text-green-400"}>
                                {phase === "ai-speaking" ? "AI Speaking" : "Listening"}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Violations</p>
                            <p className={`font-medium ${violationColor}`}>{violations} / {MAX_VIOLATIONS}</p>
                        </div>
                    </div>

                    {/* Transcript Box */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 min-h-[120px] text-neutral-300 select-none">
                        {transcript || "Waiting for your response..."}
                    </div>

                    {/* Proctoring Status Bar */}
                    <div className="flex flex-wrap gap-3 text-xs">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isFullscreen ? "border-green-800 bg-green-900/20 text-green-400" : "border-red-800 bg-red-900/20 text-red-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isFullscreen ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
                            {isFullscreen ? "Fullscreen Active" : "Fullscreen Exited"}
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-800 bg-blue-900/20 text-blue-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            Tab-Switch Monitored
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-800 bg-purple-900/20 text-purple-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            Copy/Paste Blocked
                        </span>
                    </div>

                    {/* Violation Log */}
                    {violationLog.length > 0 && (
                        <div className="border border-red-900/40 bg-red-950/20 rounded-lg p-4">
                            <p className="text-xs text-red-400 uppercase tracking-wider font-semibold mb-3">⚠ Proctoring Log</p>
                            <ul className="space-y-1.5">
                                {violationLog.map((v, i) => (
                                    <li key={i} className="text-xs flex justify-between text-red-300">
                                        <span>#{v.count} — {v.reason}</span>
                                        <span className="text-red-500 ml-4">{v.timestamp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Exit Confirmation Modal ── */}
            {showExitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">Exit Interview?</h2>
                        </div>
                        <p className="text-neutral-400 text-sm mb-6">
                            Are you sure you want to exit? Your current interview session will end and you will be redirected to the dashboard.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowExitModal(false)}
                                className="px-5 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExitConfirm}
                                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors duration-200"
                            >
                                Yes, Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Violation Warning Modal ── */}
            {warningModal && !terminated && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-orange-700/60 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">
                                Violation #{warningModal.count} Detected
                            </h2>
                        </div>
                        <p className="text-neutral-300 text-sm mb-2 font-medium">{warningModal.reason}</p>
                        <p className="text-orange-400 text-sm mb-6">
                            Warning {warningModal.count} of {MAX_VIOLATIONS}. Your interview will be <strong>automatically terminated</strong> after {MAX_VIOLATIONS} violations.
                        </p>
                        <button
                            onClick={() => {
                                setWarningModal(null);
                                enterFullscreen();
                            }}
                            className="w-full px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors duration-200"
                        >
                            I Understand — Return to Interview
                        </button>
                    </div>
                </div>
            )}

            {/* ── Fullscreen Re-entry Prompt ── */}
            {showFullscreenPrompt && !warningModal && !terminated && (
                <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-yellow-600/50 rounded-xl p-4 shadow-xl max-w-xs">
                    <p className="text-yellow-400 text-sm font-medium mb-2">⚠ Fullscreen Required</p>
                    <p className="text-neutral-400 text-xs mb-3">You must stay in fullscreen during the interview.</p>
                    <button
                        onClick={() => { enterFullscreen(); setShowFullscreenPrompt(false); }}
                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-semibold transition-colors"
                    >
                        Re-enter Fullscreen
                    </button>
                </div>
            )}

            {/* ── Terminated Modal ── */}
            {terminated && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-red-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Interview Terminated</h2>
                        <p className="text-neutral-400 text-sm mb-2">
                            You exceeded the maximum number of allowed violations ({MAX_VIOLATIONS}).
                        </p>
                        <p className="text-red-400 text-sm mb-6 font-medium">Last violation: {warningModal?.reason}</p>
                        <button
                            onClick={() => navigate("/ai-interview")}
                            className="w-full px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors duration-200"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}