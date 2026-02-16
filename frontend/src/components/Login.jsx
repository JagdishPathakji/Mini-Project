import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={18} /> Back to Home
          </Link>

          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 sm:p-10 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-neutral-400 mt-2">Sign in to continue to NexInterview.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  placeholder="you@domain.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-300">Password</label>
                  <button type="button" onClick={() => setShow(!show)} className="text-xs text-neutral-400 hover:text-white transition-colors">
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Role</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  >
                    <option value="student">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full bg-white text-black font-bold text-lg rounded-lg py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-neutral-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-white hover:underline underline-offset-4 font-medium">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    );
}
