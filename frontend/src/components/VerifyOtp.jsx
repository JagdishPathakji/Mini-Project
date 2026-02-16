import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react";

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
      const response = await fetch("http://localhost:3000/auth/verifyemail", {
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black">
      <div className="w-full max-w-md">
        <Link to="/signup" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /> Back
        </Link>

        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 sm:p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Verify email</h2>
            <p className="text-neutral-400 mt-2">Enter the verification code sent to <br /><span className="text-white font-medium">{email}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                placeholder="000000"
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-white text-black font-bold text-lg rounded-lg py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify Email"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-400">
            Didn't receive code?{" "}
            <button className="text-white hover:underline underline-offset-4 font-medium" onClick={() => toast.success("Code resent!")}>Resend</button>
          </div>
        </div>
      </div>
    </div>
  );
}
