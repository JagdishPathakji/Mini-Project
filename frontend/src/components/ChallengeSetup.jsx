import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { Swords, Copy, Check, Link2, LogIn, Zap, ChevronRight, Users, Target, Timer, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../config";
import Navbar from "./Navbar";

const SOCKET_URL = API_BASE_URL;

export default function ChallengeSetup() {
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [mode, setMode] = useState(null); // "create" | "join"
    const [roomId, setRoomId] = useState("");
    const [joinRoomId, setJoinRoomId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [difficulty, setDifficulty] = useState(null);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    function getSocket() {
        if (!socketRef.current || !socketRef.current.connected) {
            const token = document.cookie.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1] || "";
            socketRef.current = io(SOCKET_URL, {
                auth: { token },
                transports: ["websocket", "polling"],
                reconnectionAttempts: 3,
            });
        }
        return socketRef.current;
    }

    function setupMatchListeners(socket) {
        socket.off("match-start");
        socket.off("room-error");

        socket.on("match-start", (payload) => {
            toast.success("Opponent joined! Match starting...");
            navigate("/challenge-room", { state: { ...payload, isCreator: mode === "create" } });
        });

        socket.on("room-error", ({ message }) => {
            toast.error(message);
            setIsLoading(false);
            setIsWaiting(false);
        });
    }

    const handleCreateRoom = () => {
        setMode("create");
        setIsLoading(true);
        const socket = getSocket();
        setupMatchListeners(socket);

        socket.off("room-created");
        socket.on("room-created", ({ roomId: rid, difficulty: diff }) => {
            setRoomId(rid);
            setDifficulty(diff);
            setIsLoading(false);
            setIsWaiting(true);
        });

        socket.emit("create-room");
    };

    const handleJoinRoom = () => {
        const id = joinRoomId.trim().toUpperCase();
        if (!id || id.length < 6) {
            toast.error("Please enter a valid Room ID");
            return;
        }
        setIsLoading(true);
        const socket = getSocket();
        setupMatchListeners(socket);
        socket.emit("join-room", { roomId: id });
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Room ID copied!");
        });
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/1v1-challenge?join=${roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Challenge link copied!");
        });
    };

    // Auto-join from URL param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get("join");
        if (joinId) {
            setJoinRoomId(joinId.toUpperCase());
            setMode("join");
        }
    }, []);

    // ─── WAITING OVERLAY ─────────────────────────────────────────────────
    if (isWaiting && roomId) {
        return (
            <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

                <Navbar />

                <main className="pt-32 pb-24 max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center justify-center text-center mb-16">
                        {/* Waiting Animation */}
                        <div className="relative w-24 h-24 flex items-center justify-center mb-8">
                            <div className="absolute inset-0 rounded-full border border-white/5" />
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 border-l-violet-500/50 animate-spin" style={{ animationDuration: "2s" }} />
                            <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)] animate-pulse">
                                <Users size={22} className="text-violet-400" />
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                            Waiting for Opponent
                        </h1>
                        <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-10">
                            Share the Room ID or link below. Match starts instantly when your opponent joins.
                        </p>

                        {/* Difficulty badge */}
                        {difficulty && (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-xl border text-sm font-bold ${
                                difficulty === "Easy" ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" :
                                difficulty === "Medium" ? "bg-amber-400/10 border-amber-400/30 text-amber-400" :
                                "bg-rose-400/10 border-rose-400/30 text-rose-400"
                            }`}>
                                <Target size={16} />
                                {difficulty} • {difficulty === "Easy" ? "15 min" : difficulty === "Medium" ? "30 min" : "60 min"}
                            </div>
                        )}
                    </div>

                    <div className="max-w-md mx-auto">
                        {/* Room ID Card */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-violet-400 shadow-inner">
                                    <Swords size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Room ID</h2>
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-white select-all">
                                        {roomId}
                                    </div>
                                    <button onClick={handleCopyRoomId}
                                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                        {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} className="text-neutral-400" />}
                                    </button>
                                </div>

                                <button onClick={handleCopyLink}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-violet-500/20 bg-violet-500/5 rounded-2xl text-violet-400 text-sm font-bold hover:bg-violet-500/10 transition-all">
                                    <Link2 size={16} />
                                    Copy Challenge Link
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col items-center">
                            <button onClick={() => {
                                if (socketRef.current) socketRef.current.disconnect();
                                setMode(null); setIsWaiting(false); setRoomId(""); setDifficulty(null);
                            }}
                                className="px-8 py-3 border border-white/10 bg-white/5 rounded-2xl text-neutral-400 text-sm font-bold hover:text-white hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ─── MAIN SETUP PAGE ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-rose-600/[0.02] blur-[150px] pointer-events-none" />

            <Navbar />

            <main className="pt-32 pb-24 max-w-7xl mx-auto px-6 relative z-10">
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                        Challenge Arena
                    </h1>
                    <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Race your opponent to solve the same random problem. First correct submission wins. Create a room or join one to begin.
                    </p>
                </div>

                {/* Setup Content — Two Cards Grid */}
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Create Room Section */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-violet-400 shadow-inner">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Create Room</h2>
                            </div>

                            <div className="flex flex-col gap-3 relative z-10 flex-1">
                                {[
                                    { step: "1", text: "A random difficulty question is selected" },
                                    { step: "2", text: "You get a Room ID to share" },
                                    { step: "3", text: "Match starts when opponent joins" },
                                ].map((item) => (
                                    <div key={item.step}
                                        className="relative px-5 py-4 rounded-2xl border bg-white/5 border-white/5 text-neutral-400 flex items-center gap-4">
                                        <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0">
                                            {item.step}
                                        </div>
                                        <span className="text-sm font-medium">{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                id="btn-create-room"
                                onClick={handleCreateRoom}
                                disabled={isLoading && mode === "create"}
                                className="mt-6 w-full px-6 py-4 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 group/btn overflow-hidden shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-1 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {isLoading && mode === "create" ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Swords size={18} className="group-hover/btn:scale-110 transition-transform" />
                                )}
                                <span>{isLoading && mode === "create" ? "Generating..." : "Generate Room"}</span>
                                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Join Room Section */}
                        <div className="relative flex flex-col p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 overflow-hidden group backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-blue-400 shadow-inner">
                                    <LogIn size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Join Room</h2>
                            </div>

                            <div className="flex flex-col gap-4 relative z-10 flex-1">
                                <div className="relative px-5 py-4 rounded-2xl border bg-white/5 border-white/5 text-neutral-400 text-sm font-medium">
                                    Enter the Room ID shared with you by the room creator. Both of you will receive the same random problem.
                                </div>

                                <div className="space-y-2 mt-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Room ID</label>
                                    <input
                                        id="input-room-id"
                                        type="text"
                                        value={joinRoomId}
                                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                                        placeholder="e.g. AB12CD34"
                                        maxLength={8}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono text-lg tracking-widest placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all text-center"
                                    />
                                </div>
                            </div>

                            <button
                                id="btn-join-submit"
                                onClick={() => { setMode("join"); handleJoinRoom(); }}
                                disabled={isLoading && mode === "join"}
                                className="mt-6 w-full px-6 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 group/btn overflow-hidden shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)] hover:-translate-y-1 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {isLoading && mode === "join" ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <LogIn size={18} className="group-hover/btn:scale-110 transition-transform" />
                                )}
                                <span>{isLoading && mode === "join" ? "Joining..." : "Join Match"}</span>
                                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>

                    </div>

                    {/* Bottom Info */}
                    <div className="mt-16 flex flex-col items-center pb-8">
                        <p className="text-xs text-neutral-500 tracking-wider font-semibold">
                            Random Difficulty &middot; Same Question &middot; First to Solve Wins
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
