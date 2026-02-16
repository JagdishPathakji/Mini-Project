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
        { name: "Problems", path: "/dashboard", icon: <BookOpen size={18} /> },
        { name: "DSA Interview", path: "/dsa-interview", icon: <Code2 size={18} /> },
        { name: "AI Interview", path: "/ai-interview", icon: <Bot size={18} /> },
        { name: "1v1 Challenge", path: "/1v1-challenge", icon: <Swords size={18} /> },
    ];

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-neutral-900 bg-black/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link to="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                            <span className="text-black font-bold text-xl">N</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white group-hover:text-neutral-300 transition-colors">NexInterview</span>
                    </Link>
                </div>

                {/* Center Links */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isActive(link.path)
                                    ? "bg-neutral-900 text-white"
                                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                                }`}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">

                    <button className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
                        <User size={20} />
                    </button>

                    <div className="h-6 w-[1px] bg-neutral-800 hidden sm:block"></div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
