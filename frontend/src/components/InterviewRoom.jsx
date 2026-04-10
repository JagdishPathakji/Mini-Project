import { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Navbar from "./Navbar";
import { COMMON_HEADERS, API_BASE_URL } from "../config";

const InterviewRoom = () => {
  const [chat, setChat] = useState([]); // Stores the conversation
  const [isInterviewActive, setIsInterviewActive] = useState(false); // Tracks if the interview is ongoing
  const [aiSpeaking, setAiSpeaking] = useState(false); // Tracks if AI is speaking
  const [jobDescription, setJobDescription] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const { transcript, resetTranscript } = useSpeechRecognition();
  const userInputRef = useRef("");

  useEffect(() => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      alert("Your browser does not support speech recognition. Please use a supported browser.");
      return;
    }
  }, []);

  const aiSpeak = (message) => {
    setAiSpeaking(true);
    setChat((prevChat) => [...prevChat, { sender: "AI", message }]);

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.onend = () => {
      setAiSpeaking(false);
      SpeechRecognition.startListening();
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleUserResponse = async () => {
    if (transcript.trim() !== "") {
      setChat((prevChat) => [...prevChat, { sender: "User", message: transcript }]);
      userInputRef.current = transcript;
      resetTranscript();
      SpeechRecognition.stopListening();

      // Send user response to backend and get AI response
      try {
        const response = await fetch(`${API_BASE_URL}/user/ai/interview`, {
          method: "POST",
          headers: {
            ...COMMON_HEADERS,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userInputRef.current }),
        });

        if (response.ok) {
          const data = await response.json();
          aiSpeak(data.reply);
        } else {
          aiSpeak("Sorry, I couldn't process your response. Please try again.");
        }
      } catch (error) {
        console.error("Error communicating with AI backend:", error);
        aiSpeak("An error occurred. Please try again later.");
      }
    }
  };

  const startInterview = () => {
    if (!jobDescription || !difficultyLevel) {
      alert("Please provide both job description and difficulty level to start the interview.");
      return;
    }

    setIsInterviewActive(true);
    aiSpeak(`Starting the interview for the job: ${jobDescription} at ${difficultyLevel} difficulty level.`);
  };

  const handleExitConfirmation = () => {
    const confirmExit = window.confirm("Are you sure you want to exit the interview?");
    if (confirmExit) {
      setIsInterviewActive(false);
      aiSpeak("Thank you for participating in the interview. Goodbye!");
    }
  };

  return (
    <div className="interview-room">
      <Navbar />
      {!isInterviewActive ? (
        <div className="setup-container">
          <h2>AI Interview Setup</h2>
          <div className="form-group">
            <label>Job Description:</label>
            <input
              type="text"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Enter the job description"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Difficulty Level:</label>
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(e.target.value)}
              className="form-control"
            >
              <option value="">Select Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <button onClick={startInterview} className="btn btn-success">
            Start Interview
          </button>
        </div>
      ) : (
        <>
          <div className="chat-container">
            {chat.map((entry, index) => (
              <div
                key={index}
                className={`chat-message ${entry.sender === "AI" ? "ai-message" : "user-message"}`}
              >
                <strong>{entry.sender}:</strong> {entry.message}
              </div>
            ))}
          </div>
          <div className="controls">
            <button
              onClick={handleUserResponse}
              disabled={aiSpeaking}
              className="btn btn-primary"
            >
              Submit Response
            </button>
            <button onClick={handleExitConfirmation} className="btn btn-danger">
              Exit Interview
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewRoom;