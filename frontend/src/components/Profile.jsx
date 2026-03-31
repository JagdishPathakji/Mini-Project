import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { 
    User, Mail, MapPin, Calendar, 
    Trophy, Flame, Target, Zap, 
    Activity, Code2, Play, CheckCircle2 
} from "lucide-react";

export default function Profile() {
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        setUserEmail(localStorage.getItem("email") || "hacker@nexinterview.com");
    }, []);

    // Dummy data since no backend endpoint exists
    const stats = [
        { label: "Problems Solved", value: "248", icon: <CheckCircle2 size={16} className="text-emerald-400" /> },
        { label: "Current Streak", value: "14 Days", icon: <Flame size={16} className="text-amber-400" /> },
        { label: "Global Rank", value: "#4,209", icon: <Trophy size={16} className="text-yellow-400" /> },
        { label: "AI Interviews", value: "12", icon: <Zap size={16} className="text-purple-400" /> }
    ];

    const recentSubmissions = [
        { id: 1, title: "Two Sum", difficulty: "Easy", status: "Accepted", language: "Python", time: "2 hours ago" },
        { id: 2, title: "Container With Most Water", difficulty: "Medium", status: "Accepted", language: "C++", time: "5 hours ago" },
        { id: 3, title: "Merge K Sorted Lists", difficulty: "Hard", status: "Time Limit Exceeded", language: "Java", time: "Yesterday" },
        { id: 4, title: "Valid Parentheses", difficulty: "Easy", status: "Accepted", language: "JavaScript", time: "2 days ago" },
    ];

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black pb-20 relative overflow-hidden">
            <Navbar />

            {/* Ambient Animated Background Gradients */}
            <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 pt-32 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN: User Identity */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-32 h-32 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-6 relative group-hover:border-white/40 transition-all shadow-inner">
                                    <div className="absolute inset-0 rounded-full border-t border-white/20 animate-[spin_4s_linear_infinite]" />
                                    <User size={48} className="text-neutral-400 group-hover:text-white transition-colors" />
                                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[#0a0a0a]" />
                                </div>
                                
                                <h1 className="text-2xl font-extrabold tracking-tight mb-2">NexCoder Pro</h1>
                                <p className="text-sm font-medium text-neutral-400 mb-6 flex items-center gap-2">
                                    <Mail size={14} /> {userEmail}
                                </p>

                                <div className="w-full flex gap-3">
                                    <button className="flex-1 py-3 px-4 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                                        Edit Profile
                                    </button>
                                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                        <Activity size={18} className="text-neutral-300" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Details Card */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm pb-4 border-b border-white/5">
                                    <span className="text-neutral-500 flex items-center gap-2"><MapPin size={14} /> Location</span>
                                    <span className="font-bold text-neutral-300">Remote</span>
                                </div>
                                <div className="flex items-center justify-between text-sm pb-4 border-b border-white/5">
                                    <span className="text-neutral-500 flex items-center gap-2"><Calendar size={14} /> Joined</span>
                                    <span className="font-bold text-neutral-300">September 2023</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-neutral-500 flex items-center gap-2"><Target size={14} /> Focus</span>
                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] uppercase font-bold text-white tracking-widest">
                                        Data Structures
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Stats & Activity */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-white/20 transition-all">
                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                        {stat.icon}
                                    </div>
                                    <h3 className="text-2xl font-extrabold mb-1 tracking-tight">{stat.value}</h3>
                                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Activity Graph Placeholder */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-neutral-400 mb-6 flex items-center gap-2">
                                <Activity size={14} className="text-blue-400" /> Progression Matrix
                            </h2>
                            <div className="h-40 w-full flex items-end gap-2 text-neutral-800">
                                {/* Dummy bars looking like a Github contribution or activity graph */}
                                {[...Array(40)].map((_, i) => {
                                    const height = Math.random() * 100;
                                    const isActive = Math.random() > 0.7;
                                    return (
                                        <div 
                                            key={i} 
                                            className={`flex-1 rounded-t-sm transition-all duration-1000 ${isActive ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-white/5 hover:bg-white/10'}`} 
                                            style={{ height: `${Math.max(10, height)}%` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Submissions */}
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl relative overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                                    <Code2 size={14} className="text-emerald-400" /> Recent Submissions
                                </h2>
                                <button className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">
                                    View All
                                </button>
                            </div>
                            <div className="divide-y divide-white/5">
                                {recentSubmissions.map((sub) => (
                                    <div key={sub.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-sm group-hover:text-blue-400 transition-colors">{sub.title}</h3>
                                                <span className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-widest font-bold ${
                                                    sub.difficulty === 'Easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                    sub.difficulty === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                    'bg-red-500/10 border-red-500/20 text-red-500'
                                                }`}>
                                                    {sub.difficulty}
                                                </span>
                                            </div>
                                            <span className="text-xs text-neutral-500 font-medium">{sub.time}</span>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                                                sub.status === 'Accepted' ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                                {sub.status === 'Accepted' ? <CheckCircle2 size={12} /> : <Flame size={12} />}
                                                {sub.status}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded text-neutral-400 font-mono">
                                                {sub.language}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
