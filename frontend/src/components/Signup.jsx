import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Mail, Lock, User, ShieldCheck, ChevronRight } from "lucide-react";
import { API_BASE_URL, COMMON_HEADERS } from "../config";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/usersignup`, {
        method: "POST",
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          email,
          password,
          firstname,
          lastname,
          username
        }),
        credentials: "include"
      })

      const data = await response.json();

      if (data.status === true) {
        localStorage.setItem("email", email);
        toast.success("Account created successfully! Please verify your email.");
        setTimeout(() => {
          navigate("/verify-otp");
        }, 1000);
      }
      else {
        toast.error(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black relative overflow-hidden">
      
      {/* Ambient Animated Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 pt-10 pb-10">
        <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Link>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="mb-10 text-center relative z-10">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Create Account</h2>
            <p className="text-neutral-400 mt-2 text-sm">Join thousands of developers mastering DSA.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-1">First name</label>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                  <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                    <input
                      type="text"
                      required
                      value={firstname}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none transition-all text-sm"
                      placeholder="John"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-1">Last name</label>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                  <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                    <input
                      type="text"
                      required
                      value={lastname}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none transition-all text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-1">Username</label>
              <div className="relative group/input">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-emerald-500/50 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 shadow-inner">
                  <User size={18} className="text-neutral-500 mr-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none transition-all text-sm"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

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
              <p className="text-xs text-neutral-500 mt-1 pl-1">Must be at least 6 characters</p>
            </div>

            <button
              disabled={loading}
              className="w-full font-bold text-sm rounded-xl py-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8 
                          bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Create Account</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-500 font-medium relative z-10">
            Already have an account?{" "}
            <Link to="/login" className="text-white hover:text-blue-400 hover:underline underline-offset-4 transition-colors">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
