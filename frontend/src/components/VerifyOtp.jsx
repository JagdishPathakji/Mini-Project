import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, KeyRound, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../config";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const email = localStorage.getItem("email") || "";
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error("Enter a valid OTP");
      return;
    }
    if (!email) {
      toast.error("No email found. Please signup again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verifyemail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          otp,
          email
        }),
        credentials: "include"
      })

      const data = await response.json();

      if (data.status === true) {
        // localStorage.removeItem("email"); // User might need it for login
        toast.success("Email verified successfully! Please login.");
        setTimeout(() => {
          navigate("/login");
        }, 1000);
      }
      else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black relative overflow-hidden">
      
      {/* Ambient Animated Background Gradients */}
      <div className="absolute top-[-20%] left-[30%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/signup" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </Link>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="mb-10 text-center relative z-10">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <KeyRound size={32} className="text-amber-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Verify Email</h2>
            <p className="text-neutral-400 mt-2 text-sm leading-relaxed">
              Enter the verification code sent to <br />
              <span className="text-white font-semibold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-1">
              <div className="relative group/input">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-2xl pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/50 via-emerald-500/50 to-blue-500/50 rounded-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 blur-[2px]" />
                <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-inner overflow-hidden">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-transparent px-4 py-5 text-center text-3xl font-mono tracking-[0.5em] text-white placeholder-neutral-700 focus:outline-none transition-all"
                    placeholder="000000"
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full font-bold text-sm rounded-xl py-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 
                           bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Verify Identity</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-500 font-medium relative z-10">
            Didn't receive code?{" "}
            <button className="text-white hover:text-amber-400 hover:underline underline-offset-4 transition-colors" onClick={() => toast.success("Code resent!")}>Resend</button>
          </div>
        </div>
      </div>
    </div>
  );
}
