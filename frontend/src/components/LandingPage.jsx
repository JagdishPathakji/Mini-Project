import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Menu, X, CheckCircle, Code, Cpu, Zap, Sparkles } from "lucide-react";

export default function LandingPage() {

  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black font-sans relative overflow-x-hidden">
      
      {/* Ambient Animated Background Gradients */}
      <div className="absolute top-[0%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.05] bg-[#030303]/60 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">N</span>
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">NexInterview</Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Login</Link>
            <Link to="/signup" className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">Sign up</Link>
          </div>

          <button
            onClick={() => setOpen((s) => !s)}
            className="md:hidden p-2 text-neutral-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden border-t border-white/[0.05] bg-[#030303]/95 backdrop-blur-xl absolute w-full px-6 py-6 flex flex-col gap-4 shadow-2xl">
            <Link to="/login" className="text-neutral-300 hover:text-white text-lg font-medium px-2">Login</Link>
            <Link to="/signup" className="py-4 bg-white text-black text-center font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">Sign up</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-20 px-6 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[1.1] max-w-5xl">
          Master DSA with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 relative">
            Intelligent Practice.
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed">
          The ultimate platform for developers to ace technical interviews.
          Real-time AI feedback, curated problem sets, and competitive 1v1 battles.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <Link to="/signup" className="px-8 py-4 bg-white text-black text-base font-bold rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:-translate-y-1">
            Start Coding Now <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="px-8 py-4 bg-white/[0.03] border border-white/[0.08] text-white text-base font-bold rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center justify-center backdrop-blur-md">
            Login to Account
          </Link>
        </div>

        {/* Abstract UI representation */}
        <div className="mt-24 w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2 sm:p-3 backdrop-blur-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/10 transition-all duration-700">
           {/* Inner glow mask */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
          
          <img
            src="../public/dashboard-view.png"
            alt="App Dashboard Preview"
            className="w-full h-auto rounded-xl border border-white/[0.05] opacity-80 group-hover:opacity-100 transition-opacity duration-700 brightness-90 group-hover:brightness-110"
          />
          
          {/* Fading bottom edge */}
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent"></div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-24 px-6 sm:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Core Capabilities</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Code size={24} />}
            title="Curated Problems"
            desc="Hand-picked DSA problems sorted by pattern and difficulty to maximize your learning efficiency."
            color="emerald"
          />
          <FeatureCard
            icon={<Cpu size={24} />}
            title="AI Assistant"
            desc="Get intelligent hints and complexity analysis without giving away the full solution."
            color="blue"
          />
          <FeatureCard
            icon={<Zap size={24} />}
            title="1v1 Battles"
            desc="Challenge peers to real-time coding duels to test your speed and accuracy under pressure."
            color="amber"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-32 mt-12 border-t border-white/5 border-b">
         {/* CTA Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-6xl font-extrabold mb-8 bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">Ready to rewrite your future?</h2>
          <p className="text-neutral-400 mb-12 text-lg md:text-xl max-w-2xl mx-auto">Join thousands of developers passing top-tier technical interviews with NexInterview.</p>
          <Link to="/signup" className="inline-block px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#030303] py-12 px-6 text-center relative z-10">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <p className="text-neutral-500 text-sm font-medium">© {new Date().getFullYear()} NexInterview. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }) {
  const colorMap = {
    emerald: "text-emerald-400 group-hover:bg-emerald-400 group-hover:text-black",
    blue: "text-blue-400 group-hover:bg-blue-400 group-hover:text-white",
    amber: "text-amber-400 group-hover:bg-amber-400 group-hover:text-black"
  };

  return (
    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className={`w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 transition-colors duration-500 shadow-inner relative z-10 ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white relative z-10">{title}</h3>
      <p className="text-neutral-400 leading-relaxed text-sm relative z-10">{desc}</p>
    </div>
  )
}
