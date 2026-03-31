import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Mail, Lock, ShieldCheck, ChevronRight } from "lucide-react";

export default function Login() {
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);

    const navigate = useNavigate();

    async function handleSubmit(e) {
      e.preventDefault();
      setLoading(true);

      try {
        const response = await fetch("http://localhost:3000/auth/userlogin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password,
            role
          }),
          credentials: "include"
        })

        const data = await response.json();

        if (data.status === true) {
          localStorage.setItem("token", data.token);
          // Also set role/user info if needed, or rely on token decoding
          toast.success("Logged in successfully!");
          setTimeout(() => {
            navigate("/dashboard");
          }, 1000);
        }
        else {
          toast.error(data.message || "Invalid credentials");
        }
      } catch (error) {
        console.error("Login error:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    return (
      <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black relative overflow-hidden">
        
        {/* Ambient Animated Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors group text-sm font-medium">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="mb-10 text-center relative z-10">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldCheck size={32} className="text-blue-400" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Welcome Back</h2>
              <p className="text-neutral-400 mt-2 text-sm">Sign in to continue to NexInterview.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-1">Email</label>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                  <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                    <Mail size={18} className="text-neutral-500 mr-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none transition-all text-sm"
                      placeholder="you@domain.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Password</label>
                  <button type="button" onClick={() => setShow(!show)} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                  <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                    <Lock size={18} className="text-neutral-500 mr-3" />
                    <input
                      type={show ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-1">Role</label>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                  <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-transparent text-white appearance-none focus:outline-none transition-all text-sm cursor-pointer"
                    >
                      <option value="student" className="bg-[#0a0a0a]">User</option>
                      <option value="admin" className="bg-[#0a0a0a]">Admin</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full font-bold text-sm rounded-xl py-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8 
                           bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-neutral-500 font-medium relative z-10">
              Don't have an account?{" "}
              <Link to="/signup" className="text-white hover:text-blue-400 hover:underline underline-offset-4 transition-colors">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    );
}
