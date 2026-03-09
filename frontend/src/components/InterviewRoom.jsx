import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Navbar from "./Navbar";

const BACKEND_URL = "http://localhost:3000/user/ai/interview";

export default function InterviewRoom() {
    const location = useLocation();
    const { role, difficulty, jobDescription } = location.state || {};

    const { transcript, resetTranscript } = useSpeechRecognition();
    const silenceTimer = useRef(null);

    const [phase, setPhase] = useState("ai-speaking");
    const [started, setStarted] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: "system",
            content: `
You are a professional interviewer for a ${role} position.
Difficulty: ${difficulty}
Job Description: ${jobDescription}
Its verbal interview so dont ask to write something.
Never provide code as output as it is verbal interview.
Never provide markdown.

Rules:
- Ask ONE question at a time
- Keep responses short
- Speak naturally
- Start with greeting and first question
            `,
        },
    ]);

    const speak = (text) => {
        if (!text || !text.trim()) return;

        speechSynthesis.cancel();
        setMessages(prev => [...prev, { role: "assistant", content: text }]);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        utterance.onstart = () => setPhase("ai-speaking");
        utterance.onend = () => {
            setPhase("listening");
            SpeechRecognition.startListening({ continuous: true });
        };

        speechSynthesis.speak(utterance);
    };

    const callAI = async (context) => {
        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: context }),
            });

            const data = await res.json();
            speak(data.message);
        } catch (err) {
            console.error(err);
            speak("Sorry, something went wrong.");
        }
    };

    useEffect(() => {
        if (!role || !difficulty) return;
        if (started) return;
        setStarted(true);
        callAI(messages);
    }, []);

    useEffect(() => {
        if (phase !== "listening") return;
        if (!transcript.trim()) return;

        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        silenceTimer.current = setTimeout(() => {
            SpeechRecognition.stopListening();

            const userMsg = {
                role: "user",
                content: transcript,
            };

            setMessages(prev => {
                const updated = [...prev, userMsg];
                callAI(updated);
                return updated;
            });

            resetTranscript();
        }, 4000);
    }, [transcript, phase]);

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            <Navbar />

            <main className="pt-24 pb-12 max-w-4xl mx-auto px-6">

                <div className="mb-10">
                    <h1 className="text-3xl font-bold mb-2">Interview Room</h1>
                    <p className="text-neutral-400">
                        Live AI-powered mock interview session.
                    </p>
                </div>

                <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-8 space-y-6">

                    {/* Role Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Role</p>
                            <p className="text-white font-medium">{role}</p>
                        </div>
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Difficulty</p>
                            <p className="text-white font-medium">{difficulty}</p>
                        </div>
                        <div>
                            <p className="text-neutral-500 uppercase tracking-wider mb-1">Status</p>
                            <p className={phase === "ai-speaking" ? "text-yellow-400" : "text-green-400"}>
                                {phase === "ai-speaking" ? "AI Speaking" : "Listening"}
                            </p>
                        </div>
                    </div>

                    {/* Transcript Box */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 min-h-[120px] text-neutral-300">
                        {transcript || "Waiting for your response..."}
                    </div>

                </div>
            </main>
        </div>
    );
}