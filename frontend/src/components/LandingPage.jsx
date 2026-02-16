import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Menu, X, CheckCircle, Code, Cpu, Zap } from "lucide-react";

export default function LandingPage() {

  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-neutral-900 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xl">N</span>
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">NexInterview</Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Login</Link>
            <Link to="/signup" className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors">Sign up</Link>
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
          <div className="md:hidden border-t border-neutral-900 bg-black absolute w-full px-6 py-6 flex flex-col gap-4">
            <Link to="/login" className="text-neutral-300 hover:text-white text-lg font-medium">Login</Link>
            <Link to="/signup" className="py-3 bg-white text-black text-center font-semibold rounded-lg">Sign up</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Master DSA with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500">Intelligent Practice.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed">
          The ultimate platform for developers to ace technical interviews.
          Real-time AI feedback, curated problem sets, and competitive 1v1 battles.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link to="/signup" className="px-8 py-4 bg-white text-black text-base font-bold rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-2">
            Get Started <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="px-8 py-4 border border-neutral-800 text-white text-base font-medium rounded-full hover:bg-neutral-900 transition-all flex items-center justify-center">
            Login
          </Link>
        </div>

        {/* Abstract UI representation */}
        <div className="mt-20 w-full max-w-5xl rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 sm:p-2 backdrop-blur-sm shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          <img
            src="../public/dashboard-view.png"
            alt="App Dashboard"
            className="w-full h-auto rounded-lg border border-neutral-900 opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale"
          />
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-24 px-6 sm:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Code size={24} />}
            title="Curated Problems"
            desc="Hand-picked DSA problems sorted by pattern and difficulty to maximize your learning efficiency."
          />
          <FeatureCard
            icon={<Cpu size={24} />}
            title="AI Assistant"
            desc="Get intelligent hints and complexity analysis without giving away the full solution."
          />
          <FeatureCard
            icon={<Zap size={24} />}
            title="1v1 Battles"
            desc="Challenge peers to real-time coding duels to test your speed and accuracy under pressure."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-neutral-900 bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to upgrade your skills?</h2>
          <p className="text-neutral-400 mb-10 text-lg">Join thousands of developers preparing for their dream jobs with NexInterview.</p>
          <Link to="/signup" className="inline-block px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
            Start Coding Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-black py-12 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 bg-neutral-800 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <p className="text-neutral-500 text-sm">© {new Date().getFullYear()} NexInterview. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition-colors group">
      <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center text-white mb-6 group-hover:bg-white group-hover:text-black transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-neutral-400 leading-relaxed">{desc}</p>
    </div>
  )
}
