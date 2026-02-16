import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      const response = await fetch("http://localhost:3000/auth/usersignup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black">
      <div className="w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 sm:p-10 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="text-neutral-400 mt-2">Join thousands of developers mastering DSA.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">First name</label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  placeholder="John"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Last name</label>
                <input
                  type="text"
                  required
                  value={lastname}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-300">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                placeholder="username"
              />
            </div>

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
              <p className="text-xs text-neutral-500 mt-1">Must be at least 6 characters</p>
            </div>

            <button
              disabled={loading}
              className="w-full bg-white text-black font-bold text-lg rounded-lg py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-400">
            Already have an account?{" "}
            <Link to="/login" className="text-white hover:underline underline-offset-4 font-medium">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
