import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Code2, Bot, Swords, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            const response = await fetch("http://localhost:3000/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            });

            const data = await response.json();

            if (data.status) {
                toast.success("User logged out successfully");
                localStorage.removeItem("token");
                localStorage.removeItem("email");
                setTimeout(() => navigate("/login"), 1000);
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { name: "Problems", path: "/dashboard", icon: <BookOpen size={16} /> },
        { name: "DSA Interview", path: "/dsa-interview", icon: <Code2 size={16} /> },
        { name: "AI Interview", path: "/ai-interview", icon: <Bot size={16} /> },
        { name: "1v1 Challenge", path: "/1v1-challenge", icon: <Swords size={16} /> },
    ];

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/[0.05] bg-[#030303]/60 backdrop-blur-xl transition-all">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link to="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-md flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                            <span className="text-white font-bold text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">N</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">NexInterview</span>
                    </Link>
                </div>

                {/* Center Links */}
                <div className="hidden md:flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl shadow-inner backdrop-blur-md">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 ${isActive(link.path)
                                    ? "bg-white/10 text-white shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]"
                                    : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                                }`}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">

                    <Link to="/profile" className="p-2 rounded-xl border border-transparent text-neutral-400 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all">
                        <User size={18} />
                    </Link>

                    <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-transparent text-sm font-bold text-neutral-400 hover:text-rose-400 hover:bg-rose-400/10 hover:border-rose-400/20 transition-all"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
