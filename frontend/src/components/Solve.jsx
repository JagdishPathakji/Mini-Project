import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Play, Send, ChevronDown } from "lucide-react";
import Navbar from "./Navbar";
import AIAssistant from "./AIAssistant";

export default function Solve() {
    const { qno } = useParams();

    const [question, setQuestion] = useState(null);
    const [activeTab, setActiveTab] = useState("Description");
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("");
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    const languages = ["python", "javascript", "java", "cpp", "c"];

    async function fetchQuestion() {
        try {
            const response = await fetch(
                `http://localhost:3000/question/fetchquestion?qno=${qno}`
            );
            const data = await response.json();

            if (data.status) {
                setQuestion(data.doc);
                setCode(data.doc.qstartcode || "");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch question");
        }
    }

    useEffect(() => {
        if (qno) fetchQuestion();
    }, [qno]);

    if (!question) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
            <Navbar />

            <div className="flex flex-col lg:flex-row flex-1 pt-16 overflow-hidden">

                {/* LEFT PANEL */}
                <div className="lg:w-1/2 w-full border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col h-full overflow-hidden">

                    {/* Tabs */}
                    <div className="flex flex-shrink-0 border-b border-neutral-800 bg-neutral-950">
                        {["Description", "AI Assistant", "Submissions"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 text-sm font-medium transition-all ${activeTab === tab
                                    ? "border-b-2 border-white text-white"
                                    : "text-neutral-500 hover:text-white"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {activeTab === "Description" && (
                            <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                <h1 className="text-2xl font-bold">
                                    {question.qno}. {question.qheading}
                                </h1>

                                <div className="flex gap-3 text-xs text-neutral-400 uppercase tracking-wide">
                                    <span className="border border-neutral-700 px-3 py-1 rounded-full">
                                        {question.qdifficulty}
                                    </span>
                                    {question.qtags?.map(tag => (
                                        <span
                                            key={tag}
                                            className="border border-neutral-800 px-3 py-1 rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="text-neutral-300 whitespace-pre-wrap leading-relaxed text-sm">
                                    {question.qdescription}
                                </div>
                            </div>
                        )}

                        {
                            activeTab === "AI Assistant" && (<AIAssistant question={question} code={code} language={language} />)
                        }

                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="lg:w-1/2 w-full flex flex-col bg-black h-full overflow-hidden">

                    {/* Editor Header */}
                    <div className="flex flex-shrink-0 justify-between items-center px-5 h-14 border-b border-neutral-800 bg-neutral-950">

                        {/* Language Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setShowLangDropdown(!showLangDropdown)
                                }
                                className="flex items-center gap-2 text-sm font-semibold border border-neutral-700 px-4 py-1.5 rounded-md hover:border-white transition"
                            >
                                {language.toUpperCase()}
                                <ChevronDown size={14} />
                            </button>

                            {showLangDropdown && (
                                <div className="absolute mt-2 w-40 bg-black border border-neutral-800 rounded-md shadow-xl z-50">
                                    {languages.map(lang => (
                                        <div
                                            key={lang}
                                            onClick={() => {
                                                setLanguage(lang);
                                                setShowLangDropdown(false);

                                                if (lang === "python") {
                                                    setCode(
                                                        question.qstartcode ||
                                                        ""
                                                    );
                                                } else {
                                                    setCode(
                                                        "// starter code coming soon please keep patience"
                                                    );
                                                }
                                            }}
                                            className="px-4 py-2 text-sm hover:bg-neutral-900 cursor-pointer"
                                        >
                                            {lang.toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Run & Submit Buttons */}
                        <div className="flex items-center gap-3">
                            <button className="px-5 py-1.5 border border-neutral-700 rounded-md text-sm hover:border-white transition flex items-center gap-2">
                                <Play size={15} /> Run
                            </button>

                            <button className="px-5 py-1.5 bg-white text-black rounded-md text-sm font-semibold hover:opacity-90 transition flex items-center gap-2">
                                <Send size={15} /> Submit
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}