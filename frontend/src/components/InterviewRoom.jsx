import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE_URL, COMMON_HEADERS } from "../config";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;

export default function InterviewRoom() {
    const location = useLocation();
    const { role, difficulty, jobDescription } = location.state || {};

    const recognitionRef = useRef(null);
    const silenceTimer = useRef(null);

    const [transcript, setTranscript] = useState("");
    const [phase, setPhase] = useState("idle");
    const [started, setStarted] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: "system",
            content: `
You are a professional interviewer for a ${role} position.
Difficulty: ${difficulty}
Job Description: ${jobDescription}
Verbal interview only. No code. Ask one question at a time.
            `,
        },
    ]);

    // ✅ INIT SPEECH
    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Speech Recognition not supported");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("🎤 Listening...");
            setPhase("listening");
        };

        recognition.onresult = (event) => {
            let text = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                text += event.results[i][0].transcript;
            }

            setTranscript(text);
        };

        recognition.onerror = (e) => {
            console.log("Speech error:", e.error);

            if (e.error === "no-speech" || e.error === "aborted") {
                restartListening();
            }
        };

        recognition.onend = () => {
            console.log("Mic ended");
        };

        recognitionRef.current = recognition;
    }, []);

    const restartListening = () => {
        if (!recognitionRef.current) return;

        try {
            recognitionRef.current.stop();
        } catch { }

        setTimeout(() => {
            try {
                recognitionRef.current.start();
            } catch { }
        }, 500);
    };

    const startListening = () => {
        setTranscript("");
        restartListening();
    };

    // ✅ SPEAK
    const speak = (text) => {
        if (!text) return;

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        setMessages(prev => [...prev, { role: "assistant", content: text }]);

        utterance.onstart = () => setPhase("ai-speaking");

        utterance.onend = () => {
            setTimeout(() => {
                startListening();
            }, 800);
        };

        speechSynthesis.speak(utterance);
    };

    // ✅ API CALL
    const callAI = async (context) => {
        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: context }),
            });

            const data = await res.json();
            speak(data.message);

        } catch (err) {
            console.error(err);
            speak("Something went wrong");
        }
    };

    // ✅ START BUTTON (MANDATORY)
    const startInterview = async () => {
        if (started) return;

        setStarted(true);

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            alert("Mic permission denied");
            return;
        }

        callAI(messages);
    };

    // ✅ SILENCE DETECTION
    useEffect(() => {
        if (phase !== "listening") return;
        if (!transcript.trim()) return;

        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        silenceTimer.current = setTimeout(() => {
            try {
                recognitionRef.current.stop();
            } catch { }

            const userMsg = {
                role: "user",
                content: transcript,
            };

            setMessages(prev => {
                const updated = [...prev, userMsg];
                callAI(updated);
                return updated;
            });

            setTranscript("");
        }, 4000); // increased time
    }, [transcript, phase]);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            <main className="pt-24 max-w-4xl mx-auto px-6">

                <h1 className="text-3xl font-bold mb-4">Interview Room</h1>

                {!started && (
                    <button
                        onClick={startInterview}
                        className="bg-white text-black px-6 py-3 rounded-lg mb-6"
                    >
                        Start Interview
                    </button>
                )}

                <p className="mb-4">
                    {phase === "listening"
                        ? "🎤 Speak now..."
                        : phase === "ai-speaking"
                            ? "🤖 AI speaking..."
                            : "Idle"}
                </p>

                <div className="bg-neutral-900 p-4 rounded min-h-[100px]">
                    {transcript || "Waiting for your response..."}
                </div>

            </main>
        </div>
    );
}