import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { API_BASE_URL, COMMON_HEADERS } from "../config";
import Navbar from "./Navbar";

const BACKEND_URL = `${API_BASE_URL}/user/ai/interview`;

export default function InterviewRoom() {
    const location = useLocation();
    const { role, difficulty, jobDescription } = location.state || {};

    const {
        transcript,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    const silenceTimer = useRef(null);

    const [phase, setPhase] = useState("idle"); // idle | ai-speaking | listening
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

    // ✅ Debug logs
    useEffect(() => {
        console.log("Transcript:", transcript);
    }, [transcript]);

    useEffect(() => {
        console.log("Supported:", browserSupportsSpeechRecognition);
        console.log("Mic Available:", isMicrophoneAvailable);
    }, []);

    const speak = (text) => {
        if (!text || !text.trim()) {
            startListening();
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        setMessages(prev => [...prev, { role: "assistant", content: text }]);

        utterance.onstart = () => setPhase("ai-speaking");

        utterance.onend = () => {
            startListening();
        };

        speechSynthesis.speak(utterance);
    };

    const startListening = () => {
        setPhase("listening");

        setTimeout(() => {
            SpeechRecognition.startListening(); // ❌ removed continuous (buggy)
        }, 300);
    };

    const callAI = async (context) => {
        try {
            console.log("Calling AI...");

            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: COMMON_HEADERS,
                body: JSON.stringify({ messages: context }),
            });

            const data = await res.json();
            console.log("AI:", data);

            speak(data.message);

        } catch (err) {
            console.error("API ERROR:", err);
            speak("Sorry, something went wrong.");
        }
    };

    // ✅ Start Interview (MANDATORY USER INTERACTION)
    const startInterview = async () => {
        if (started) return;

        setStarted(true);

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Mic permission granted");
        } catch (err) {
            console.error("Mic permission denied", err);
            return;
        }

        callAI(messages);
    };

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
        }, 3000);
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

                <div className="mb-4">
                    <p>Status: {phase}</p>
                </div>

                <div className="bg-neutral-900 p-4 rounded">
                    {transcript || "Waiting for your response..."}
                </div>

            </main>
        </div>
    );
}