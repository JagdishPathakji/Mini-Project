import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    User,
    Mail,
    CalendarDays,
    Target,
    CheckCircle2,
    Activity,
    Swords,
    Dices,
    Award,
    Code2,
    Flame,
    Bot,
    BookOpen,
    Zap,
    Trophy,
    Sparkles
} from "lucide-react";
import { API_BASE_URL } from "../config";
import Navbar from "./Navbar";

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/user/getprofile`, {
                    credentials: "include",
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });
                const data = await response.json();
                
                if (response.ok && data.status) {
                    setProfile(data.profile);
                } else {
                    toast.error(data.message || "Failed to load profile");
                }
            } catch (err) {
                console.error("Profile error:", err);
                toast.error("Network error fetching profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center flex-col text-neutral-400">
                <User size={64} className="mb-4 opacity-50 text-neutral-600" />
                <p className="text-sm tracking-widest uppercase font-bold text-neutral-500 mb-6">Profile not found</p>
                <button 
                    onClick={() => navigate("/login")}
                    className="px-6 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 hover:border-blue-500/30 font-bold tracking-wider uppercase text-xs transition-all shadow-inner"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    const { user, stats, recentActivity } = profile;
    const joinedDate = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const initials = (user.firstname?.[0] || "") + (user.lastname?.[0] || "");
    const fullname = `${user.firstname || ""} ${user.lastname || ""}`.trim();

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans overflow-x-clip relative selection:bg-white selection:text-black">
            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

            <Navbar />

            <main className="pt-28 pb-16 max-w-6xl mx-auto px-6 relative z-10">
                
                {/* HERO SECTION */}
                <div className="relative rounded-3xl bg-white/[0.02] border border-white/5 p-8 md:p-12 mb-8 overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all hover:bg-white/[0.03]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                    
                    {/* Avatar */}
                    <div className="relative group shrink-0">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500 animate-[pulse_4s_ease-in-out_infinite]" />
                        <div className="w-32 h-32 rounded-full border-2 border-white/10 bg-[#0a0a0a] flex items-center justify-center shadow-inner relative z-10 overflow-hidden group-hover:border-white/30 transition-all duration-300">
                            <span className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500">
                                {initials.toUpperCase() || "U"}
                            </span>
                        </div>
                    </div>

                    {/* Identity Details */}
                    <div className="text-center md:text-left flex-1 relative z-10">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{fullname || user.username}</h1>
                        <p className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-6">@{user.username}</p>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                <Mail size={14} className="text-neutral-500" />
                                {user.email}
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                <CalendarDays size={14} className="text-neutral-500" />
                                Joined {joinedDate}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS ISLAND */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl flex flex-col group hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Target size={48} className="text-neutral-300" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">Attempted Problems</span>
                        <span className="text-4xl font-black text-white">{stats.totalAttempted}</span>
                    </div>

                    <div className="bg-emerald-500/5 outer-glow border border-emerald-500/10 p-6 rounded-3xl flex flex-col group hover:border-emerald-500/30 transition-all relative overflow-hidden shadow-[0_0_20px_rgba(52,211,153,0.05)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity scale-110">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/70 mb-2">Unique Solved</span>
                        <span className="text-4xl font-black text-emerald-400 shadow-emerald-500 drop-shadow-md">{stats.totalSolved}</span>
                    </div>

                    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl flex flex-col group hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Activity size={48} className="text-neutral-300" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">Total Submissions</span>
                        <span className="text-4xl font-black text-white">{stats.totalSubmissions}</span>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl flex flex-col group hover:border-blue-500/30 transition-all relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity translate-x-2 -translate-y-2">
                            <Award size={64} className="text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500/70 mb-2">Global Accuracy</span>
                        <span className="text-4xl font-black text-blue-400 drop-shadow-md">{stats.acceptanceRate}%</span>
                    </div>
                </div>

                {/* BOTTOM GRID: Activity Feed & Fun Zone */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 flex-col-reverse md:flex-row">
                    
                    {/* Activity Feed */}
                    <div className="md:col-span-3 flex flex-col">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <Code2 className="text-neutral-400" size={20} />
                            <h2 className="text-lg font-bold tracking-widest uppercase text-white">Submission Timeline</h2>
                        </div>
                        
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
                            
                            {recentActivity && recentActivity.length > 0 ? (
                                <div className="space-y-4 relative z-10">
                                    {recentActivity.map((sub, idx) => {
                                        const isAccepted = sub.status?.toLowerCase() === "accepted";
                                        const statusColor = isAccepted ? "text-emerald-400" : "text-red-400";
                                        const statusBg = isAccepted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
                                        
                                        let dateLabel = new Date(sub.createdAt).toLocaleString("en-US", { month: "short", day: "numeric" });

                                        return (
                                            <div 
                                                key={idx} 
                                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all group cursor-pointer shadow-inner hover:-translate-y-0.5" 
                                                onClick={() => navigate(`/question/${sub.question?.qno}`)}
                                            >
                                                <div className="flex flex-col gap-2 mb-3 sm:mb-0">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.2em] border shadow-inner flex items-center gap-1 ${statusBg} ${statusColor}`}>
                                                            {isAccepted ? <CheckCircle2 size={10} /> : <Flame size={10} />}
                                                            {sub.status}
                                                        </span>
                                                        <span className="text-white font-bold group-hover:text-blue-400 transition-colors text-sm md:text-base">
                                                            {sub.question?.qno ? `${sub.question.qno}. ${sub.question.qheading || "Problem"}` : 'Deleted Question'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest">{dateLabel}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/5 shadow-inner">
                                                        {sub.language}
                                                    </span>
                                                    {(sub.tc || sub.sc) && isAccepted && (
                                                        <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-3 mt-1">
                                                            <span className="flex items-center gap-1 text-neutral-400">⏱️ {sub.tc}s</span>
                                                            <span className="flex items-center gap-1 text-neutral-400">💾 {sub.sc}KB</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-24 flex flex-col items-center justify-center text-neutral-500 h-full relative z-10">
                                    <div className="w-20 h-20 rounded-full border border-dashed border-neutral-700 flex items-center justify-center mb-6 bg-white/[0.02]">
                                        <Code2 size={28} className="text-neutral-600" />
                                    </div>
                                    <p className="text-xs font-bold tracking-widest uppercase mb-2">No Submissions Yet</p>
                                    <p className="text-sm font-medium text-neutral-600">Time to write your first line of code!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fun Zone */}
                    <div className="md:col-span-2 flex flex-col">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <Sparkles className="text-neutral-400" size={20} />
                            <h2 className="text-lg font-bold tracking-widest uppercase text-white">The Arena</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Mock Interview */}
                            <div 
                                onClick={() => navigate('/dsa-interview')}
                                className="bg-[#0a0a0a] border border-red-500/20 p-6 rounded-3xl cursor-pointer group hover:bg-neutral-900 transition-all relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.05)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(239,68,68,0.1)]"
                            >
                                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-[0.12] transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                                    <Swords size={100} className="text-red-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                        <Swords size={18} className="text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-red-400 transition-colors tracking-tight">DSA Interview</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Timed coding under pressure. Only for the brave.</p>
                                </div>
                            </div>

                            {/* AI Voice Interview */}
                            <div 
                                onClick={() => navigate('/ai-interview')}
                                className="bg-[#0a0a0a] border border-cyan-500/20 p-6 rounded-3xl cursor-pointer group hover:bg-neutral-900 transition-all relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)]"
                            >
                                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-[0.12] transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                                    <Bot size={100} className="text-cyan-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                                        <Bot size={18} className="text-cyan-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-cyan-400 transition-colors tracking-tight">AI Voice Interview</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Talk to our AI interviewer in a realistic voice conversation.</p>
                                </div>
                            </div>

                            {/* Solve Random */}
                            <div 
                                onClick={async () => {
                                    try {
                                        const toastId = toast.loading("Locating random challenge...");
                                        const randRes = await fetch(`${API_BASE_URL}/question/fetchrandom?difficulty=Easy`);
                                        const randData = await randRes.json();
                                        if(randData.status && randData.doc.length > 0) {
                                            toast.dismiss(toastId);
                                            navigate(`/question/${randData.doc[0].qno}`);
                                        } else {
                                            toast.error("No questions found", {id: toastId});
                                        }
                                    } catch(e) {
                                        toast.error("Failed to fetch random question");
                                    }
                                }}
                                className="bg-[#0a0a0a] border border-purple-500/20 p-6 rounded-3xl cursor-pointer group hover:bg-neutral-900 transition-all relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.05)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(168,85,247,0.1)]"
                            >
                                <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-[0.12] transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                                    <Dices size={100} className="text-purple-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                        <Dices size={18} className="text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-purple-400 transition-colors tracking-tight">Solve Random</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Let fate decide your next algorithmic challenge.</p>
                                </div>
                            </div>

                            {/* Hard Mode Gauntlet */}
                            <div 
                                onClick={async () => {
                                    try {
                                        const toastId = toast.loading("Summoning a hard challenge...");
                                        const randRes = await fetch(`${API_BASE_URL}/question/fetchrandom?difficulty=Hard`);
                                        const randData = await randRes.json();
                                        if(randData.status && randData.doc.length > 0) {
                                            toast.dismiss(toastId);
                                            navigate(`/question/${randData.doc[0].qno}`);
                                        } else {
                                            toast.error("No hard questions found", {id: toastId});
                                        }
                                    } catch(e) {
                                        toast.error("Failed to fetch question");
                                    }
                                }}
                                className="bg-[#0a0a0a] border border-amber-500/20 p-6 rounded-3xl cursor-pointer group hover:bg-neutral-900 transition-all relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)]"
                            >
                                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-[0.12] transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                                    <Flame size={100} className="text-amber-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                        <Flame size={18} className="text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-amber-400 transition-colors tracking-tight">Hard Mode</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Think you're good? Prove it with a random Hard problem.</p>
                                </div>
                            </div>

                            {/* Problem Vault */}
                            <div 
                                onClick={() => navigate('/dashboard')}
                                className="bg-[#0a0a0a] border border-emerald-500/20 p-6 rounded-3xl cursor-pointer group hover:bg-neutral-900 transition-all relative overflow-hidden shadow-[0_0_30px_rgba(52,211,153,0.05)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(52,211,153,0.1)]"
                            >
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-[0.12] transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                                    <BookOpen size={100} className="text-emerald-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                                        <BookOpen size={18} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 group-hover:text-emerald-400 transition-colors tracking-tight">Problem Vault</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Browse the full curated library of DSA challenges.</p>
                                </div>
                            </div>

                            {/* Leaderboard / Coming Soon */}
                            <div 
                                className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl group relative overflow-hidden opacity-60 cursor-default"
                            >
                                <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
                                    <Trophy size={100} className="text-yellow-500" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                                        <Trophy size={18} className="text-yellow-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2 tracking-tight">Leaderboard</h3>
                                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">Compete globally. <span className="text-yellow-400/70 font-bold">Coming Soon.</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
