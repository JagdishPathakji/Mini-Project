import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import VerifyOtp from "./components/VerifyOtp";
import Dashboard from "./components/Dashboard";
import Solve from "./components/Solve";
import InterviewSetup from "./components/start-interview";
import InterviewRoom from "./components/InterviewRoom";
import DSAInterviewSetup from "./components/DSAInterviewSetup";
import DSAInterviewRoom from "./components/DSAInterviewRoom";
import Profile from "./components/Profile";
import ChallengeSetup from "./components/ChallengeSetup";
import ChallengeRoom from "./components/ChallengeRoom";

function RequireNoAuth({ children }) {
    const token = localStorage.getItem("token");
    return token ? <Navigate to="/dashboard" replace /> : children;
}

function RequireAuth({ children }) {
    const token = localStorage.getItem("token");
    return token ? children : <Navigate to="/" replace />;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: localStorage.getItem("token") ? <Navigate to="/dashboard" replace /> : <LandingPage />,
    },
    {
        path: "/login",
        element: (
            <RequireNoAuth>
                <Login />
            </RequireNoAuth>
        ),
    },
    {
        path: "/signup",
        element: (
            <RequireNoAuth>
                <Signup />
            </RequireNoAuth>
        ),
    },
    {
        path: "/verify-otp",
        element: (
            <RequireNoAuth>
                <VerifyOtp />
            </RequireNoAuth>
        ),
    },
    {
        path: "/dashboard",
        element: (
            <RequireAuth>
                <Dashboard />
            </RequireAuth>
        ),
    },
    {
        path: "/question/:qno",
        element: (
            <RequireAuth>
                <Solve />
            </RequireAuth>
        ),
    },
    {
        path: "/ai-interview",
        element: (
            <RequireAuth>
                <InterviewSetup />
            </RequireAuth>
        ),
    },
    {
        path: "/interview-room",
        element: (
            <RequireAuth>
                <InterviewRoom />
            </RequireAuth>
        ),
    },
    {
        path: "/dsa-interview",
        element: (
            <RequireAuth>
                <DSAInterviewSetup />
            </RequireAuth>
        ),
    },
    {
        path: "/dsa-interview-room",
        element: (
            <RequireAuth>
                <DSAInterviewRoom />
            </RequireAuth>
        ),
    },
    {
        path: "/profile",
        element: (
            <RequireAuth>
                <Profile />
            </RequireAuth>
        ),
    },
    {
        path: "/1v1-challenge",
        element: (
            <RequireAuth>
                <ChallengeSetup />
            </RequireAuth>
        ),
    },
    {
        path: "/challenge-room",
        element: (
            <RequireAuth>
                <ChallengeRoom />
            </RequireAuth>
        ),
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);

export default function App() {
    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <RouterProvider router={router} />
        </>
    );
}
