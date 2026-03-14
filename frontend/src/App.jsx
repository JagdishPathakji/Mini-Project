import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import VerifyOtp from "./components/VerifyOtp";
import Dashboard from "./components/Dashboard";
import Solve from "./components/Solve";
import InterviewSetup from "./components/start-interview"
import InterviewRoom from "./components/InterviewRoom";
import DSAInterviewSetup from "./components/DSAInterviewSetup";
import DSAInterviewRoom from "./components/DSAInterviewRoom";

function RequireNoAuth({ children }) {
    const token = localStorage.getItem("token");
    return token ? <Navigate to="/dashboard" replace /> : children;
}

function RequireAuth({ children }) {
    const token = localStorage.getItem("token");
    return token ? children : <Navigate to="/" replace />;
}

export default function App() {
    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Routes>
                <Route
                    path="/"
                    element={
                        localStorage.getItem("token") ? <Navigate to="/dashboard" replace /> : <LandingPage />
                    }
                />

                <Route
                    path="/login"
                    element={
                        <RequireNoAuth>
                            <Login />
                        </RequireNoAuth>
                    }
                />

                <Route
                    path="/signup"
                    element={
                        <RequireNoAuth>
                            <Signup />
                        </RequireNoAuth>
                    }
                />

                <Route
                    path="/verify-otp"
                    element={
                        <RequireNoAuth>
                            <VerifyOtp />
                        </RequireNoAuth>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <Dashboard />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/question/:qno"
                    element={
                        <RequireAuth>
                            <Solve />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/ai-interview"
                    element={
                        <RequireAuth>
                            <InterviewSetup />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/interview-room"
                    element={
                        <RequireAuth>
                            <InterviewRoom />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/dsa-interview"
                    element={
                        <RequireAuth>
                            <DSAInterviewSetup />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/dsa-interview-room"
                    element={
                        <RequireAuth>
                            <DSAInterviewRoom />
                        </RequireAuth>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
