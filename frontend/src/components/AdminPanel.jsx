import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Shield, Plus, Trash2, Users, BookOpen, X, ChevronLeft,
    ChevronRight, AlertTriangle, Loader2, Database, Tag,
    Code, FileText, Hash, TerminalSquare, Search, ArrowUpDown,
    Sparkles, Pencil, Eye, Mail, UserCircle, Calendar, Upload,
    TrendingUp, Crown, UserCog, CheckCircle2, AlertCircle
} from "lucide-react";
import { API_BASE_URL } from "../config";
import Navbar from "./Navbar";

// ─── Constants ────────────────────────────────────────────────────────────────
const API = API_BASE_URL;
const authHeaders = { "Content-Type": "application/json" };
const authOpts = { credentials: "include" };

const COMMON_HEADERS = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
};

const DIFF_META = {
    Easy:   { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
    Medium: { color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/30"   },
    Hard:   { color: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/30"    },
};

const emptyTC = () => ({ input: "", output: "" });

// Normalize to judge-ready stdin/stdout
const normalizeJudge = (str) =>
    str
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(line => line.trimEnd())
        .join("\n")
        .trim();

// ─── Generic Confirm Modal ─────────────────────────────────────────────────────
function ConfirmModal({ title, description, confirmLabel = "Delete", confirmClass = "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300", onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-neutral-950 border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_60px_rgba(239,68,68,0.1)]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{title}</h3>
                        <p className="text-neutral-400 text-sm mt-0.5">This action cannot be undone.</p>
                    </div>
                </div>
                <p className="text-neutral-300 mb-8 leading-relaxed">{description}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition-all font-medium">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl border font-bold transition-all ${confirmClass}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── User Profile Modal ────────────────────────────────────────────────────────
function UserProfileModal({ user, onClose, onDelete, onToggleRole }) {
    const initials = ((user.firstname?.[0] || "") + (user.lastname?.[0] || "")).toUpperCase() || user.username?.[0]?.toUpperCase() || "?";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <h3 className="text-white font-bold text-lg">User Profile</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                        <X size={14} />
                    </button>
                </div>

                {/* Avatar + Name */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 border-2 border-white/10 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                        {initials}
                    </div>
                    <h4 className="text-white text-xl font-bold">{user.firstname} {user.lastname}</h4>
                    <p className="text-neutral-500 text-sm mt-1">@{user.username}</p>
                    <span className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border ${
                        user.role === "admin"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                    }`}>
                        {user.role === "admin" ? "👑 Admin" : "User"}
                    </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                        <Mail size={15} className="text-neutral-500 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">Email</p>
                            <p className="text-white text-sm font-medium">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                        <UserCircle size={15} className="text-neutral-500 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">Username</p>
                            <p className="text-white text-sm font-medium">@{user.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                        <Calendar size={15} className="text-neutral-500 shrink-0" />
                        <div>
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">Joined</p>
                            <p className="text-white text-sm font-medium">
                                {user.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                                    : "—"
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition-all font-medium text-sm">Close</button>
                    {user._id !== localStorage.getItem("userId") && (
                        user.role === "admin"
                            ? <button onClick={() => onToggleRole(user)} className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/30 text-neutral-400 hover:bg-neutral-500/20 transition-all font-semibold text-sm"><UserCog size={14}/> Demote to User</button>
                            : <><button onClick={() => onToggleRole(user)} className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all font-semibold text-sm"><Crown size={14}/> Promote</button>
                               <button onClick={() => onDelete(user)} className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all font-semibold text-sm"><Trash2 size={14}/> Delete</button></>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Question Drawer (Add + Edit) ─────────────────────────────────────────────
function QuestionDrawer({ editQuestion = null, onClose, onSuccess }) {
    const isEdit = Boolean(editQuestion);

    const [form, setForm] = useState({
        qno: editQuestion?.qno ?? "",
        qheading: editQuestion?.qheading ?? "",
        qdifficulty: editQuestion?.qdifficulty ?? "Easy",
        qdescription: editQuestion?.qdescription ?? "",
        qtags: (editQuestion?.qtags ?? []).join(", "),
        qstartcode: editQuestion?.qstartcode ?? "",
    });

    const [testcases, setTestcases] = useState(
        editQuestion?.qinput_output?.length >= 3
            ? editQuestion.qinput_output
            : [emptyTC(), emptyTC(), emptyTC()]
    );

    const [loading, setLoading] = useState(false);
    const [fetchingTCs, setFetchingTCs] = useState(false);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // When editing, fetch full question data (including test cases) once
    useEffect(() => {
        if (!isEdit) return;
        const fetchFull = async () => {
            setFetchingTCs(true);
            try {
                const res = await fetch(`${API}/admin/question/${editQuestion.qno}`, { headers: COMMON_HEADERS, ...authOpts });
                const data = await res.json();
                if (data.status && data.doc.qinput_output?.length > 0) {
                    setTestcases(data.doc.qinput_output);
                }
            } catch { /* keep empty defaults */ }
            finally { setFetchingTCs(false); }
        };
        fetchFull();
    }, [isEdit, editQuestion?.qno]);

    const updateTC = (i, field, val) => setTestcases(tc => tc.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
    const addTC = () => setTestcases(tc => [...tc, emptyTC()]);
    const removeTC = (i) => {
        if (testcases.length <= 3) { toast.error("Minimum 3 test cases required."); return; }
        setTestcases(tc => tc.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.qno || !form.qheading || !form.qdescription || !form.qstartcode) {
            toast.error("Please fill all required fields."); return;
        }
        for (let i = 0; i < testcases.length; i++) {
            if (!testcases[i].input.trim() || !testcases[i].output.trim()) {
                toast.error(`Test case ${i + 1} has empty input or output.`); return;
            }
        }

        const normalizedTestcases = testcases.map(tc => ({
            input:  normalizeJudge(tc.input),
            output: normalizeJudge(tc.output),
        }));

        const payload = {
            ...form,
            qno: Number(form.qno),
            qtags: form.qtags.split(",").map(t => t.trim()).filter(Boolean),
            qinput_output: normalizedTestcases,
        };

        setLoading(true);
        try {
            const url    = isEdit ? `${API}/admin/updatequestion/${editQuestion.qno}` : `${API}/admin/addquestion`;
            const method = isEdit ? "PUT" : "POST";

            const res  = await fetch(url, { method, headers: COMMON_HEADERS, ...authOpts, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.status) {
                toast.success(data.message);
                onSuccess();
                onClose();
            } else {
                toast.error(data.message || `Failed to ${isEdit ? "update" : "add"} question.`);
            }
        } catch { toast.error("Network error. Please try again."); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full md:max-w-2xl bg-[#0a0a0a] border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-8 py-5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isEdit
                                ? "bg-amber-500/15 border-amber-500/30"
                                : "bg-blue-500/15 border-blue-500/30"
                        }`}>
                            {isEdit ? <Pencil size={16} className="text-amber-400" /> : <Plus size={18} className="text-blue-400" />}
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base sm:text-lg">{isEdit ? "Edit Question" : "Add New Question"}</h2>
                            <p className="text-neutral-500 text-[10px] sm:text-xs">Min. 3 test cases · Judge-ready format</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-8 py-6 space-y-6">

                    {/* QNo + Difficulty */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                                <Hash size={12} /> Question No.
                            </label>
                            <input
                                type="number" required min="1"
                                value={form.qno}
                                onChange={e => setField("qno", e.target.value)}
                                disabled={isEdit}
                                placeholder="e.g. 101"
                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {isEdit && <p className="text-xs text-neutral-600">Question number cannot be changed.</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                                <ArrowUpDown size={12} /> Difficulty
                            </label>
                            <select
                                value={form.qdifficulty}
                                onChange={e => setField("qdifficulty", e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option value="Easy"   className="bg-neutral-900">Easy</option>
                                <option value="Medium" className="bg-neutral-900">Medium</option>
                                <option value="Hard"   className="bg-neutral-900">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                            <FileText size={12} /> Title
                        </label>
                        <input
                            type="text" required
                            value={form.qheading}
                            onChange={e => setField("qheading", e.target.value)}
                            placeholder="e.g. Two Sum"
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                            <BookOpen size={12} /> Description
                        </label>
                        <textarea
                            required rows={5}
                            value={form.qdescription}
                            onChange={e => setField("qdescription", e.target.value)}
                            placeholder="Describe the problem statement clearly..."
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm resize-none"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                            <Tag size={12} /> Tags <span className="normal-case font-normal">(comma separated)</span>
                        </label>
                        <input
                            type="text"
                            value={form.qtags}
                            onChange={e => setField("qtags", e.target.value)}
                            placeholder="e.g. Array, HashMap, Two Pointer"
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                        />
                    </div>

                    {/* Starter Code */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                            <Code size={12} /> Starter Code
                        </label>
                        <textarea
                            required rows={5}
                            value={form.qstartcode}
                            onChange={e => setField("qstartcode", e.target.value)}
                            placeholder={"function solution(input) {\n  // write your code here\n}"}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm font-mono"
                        />
                    </div>

                    {/* Test Cases */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                                <TerminalSquare size={12} /> Test Cases
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold normal-case tracking-normal">
                                    {testcases.length} / Min 3
                                </span>
                            </label>
                            <button
                                type="button" onClick={addTC}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus size={12} /> Add Test Case
                            </button>
                        </div>

                        {fetchingTCs ? (
                            <div className="flex items-center gap-3 py-8 justify-center text-neutral-500">
                                <div className="w-5 h-5 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
                                <span className="text-sm">Loading test cases...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {testcases.map((tc, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                                Test Case {i + 1}
                                                {i < 3 && <span className="ml-2 text-[10px] text-amber-500/70 font-normal normal-case">(required)</span>}
                                            </span>
                                            <button
                                                type="button" onClick={() => removeTC(i)}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                    testcases.length <= 3
                                                        ? "text-neutral-700 cursor-not-allowed"
                                                        : "text-neutral-500 hover:text-red-400 hover:bg-red-400/10"
                                                }`}
                                                title={testcases.length <= 3 ? "Min 3 test cases required" : "Remove"}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                                                    stdin <span className="normal-case font-normal">(one value per line)</span>
                                                </label>
                                                <textarea
                                                    rows={3} value={tc.input}
                                                    onChange={e => updateTC(i, "input", e.target.value)}
                                                    placeholder={`4\n2 7 11 15\n9`}
                                                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all text-sm font-mono resize-y"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                                                    stdout <span className="normal-case font-normal">(expected)</span>
                                                </label>
                                                <textarea
                                                    rows={3} value={tc.output}
                                                    onChange={e => updateTC(i, "output", e.target.value)}
                                                    placeholder={`0 1`}
                                                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all text-sm font-mono resize-y"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Format hint */}
                        <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5">
                            <span className="text-amber-400 mt-0.5 shrink-0">⚡</span>
                            <div className="text-xs text-neutral-400 leading-relaxed">
                                <span className="text-amber-400 font-semibold">Judge-ready format: </span>
                                Enter stdin exactly as the judge will receive it — one token or line per row.
                                Trailing whitespace and blank lines are stripped automatically on save.
                                Output should match stdout exactly (e.g. <code className="text-neutral-300 bg-white/5 px-1 rounded">0 1</code> not <code className="text-neutral-300 bg-white/5 px-1 rounded">[0,1]</code>).
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur-xl pt-4 pb-2 -mx-4 sm:-mx-8 px-4 sm:px-8 border-t border-white/[0.07] mt-4">
                        <button
                            type="submit" disabled={loading || fetchingTCs}
                            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                isEdit
                                    ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-[0_0_30px_rgba(245,158,11,0.25)]"
                                    : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                            }`}
                        >
                            {loading ? (
                                <><Loader2 size={18} className="animate-spin" /> {isEdit ? "Saving Changes..." : "Saving Question..."}</>
                            ) : (
                                <>{isEdit ? <><Pencil size={18} /> Update Question</> : <><Sparkles size={18} /> Add Question</>}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
    const c = { blue:{bg:"bg-blue-500/10",border:"border-blue-500/20",text:"text-blue-400"}, purple:{bg:"bg-purple-500/10",border:"border-purple-500/20",text:"text-purple-400"}, emerald:{bg:"bg-emerald-500/10",border:"border-emerald-500/20",text:"text-emerald-400"}, amber:{bg:"bg-amber-500/10",border:"border-amber-500/20",text:"text-amber-400"} }[color];
    return (
        <div className={`bg-white/[0.02] border ${c.border} rounded-2xl p-6`}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} mb-4`}>{icon}</div>
            <p className="text-neutral-500 text-sm font-medium mb-1">{label}</p>
            <p className="text-white text-3xl font-extrabold tracking-tight">{value?.toLocaleString() ?? "—"}</p>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/admin/stats`, { headers: COMMON_HEADERS, ...authOpts });
                const data = await res.json();
                if (data.status) setStats(data.stats);
                else toast.error("Failed to load stats.");
            } catch { toast.error("Network error."); }
            finally { setLoading(false); }
        })();
    }, []);
    if (loading) return <div className="py-24 flex items-center justify-center"><div className="w-8 h-8 border-2 border-neutral-800 border-t-purple-500 rounded-full animate-spin"/></div>;
    if (!stats) return null;
    const { questions: q, users: u, recentUsers } = stats;
    const easyPct  = q.total > 0 ? (q.easy   / q.total * 100) : 0;
    const medPct   = q.total > 0 ? (q.medium / q.total * 100) : 0;
    const hardPct  = q.total > 0 ? (q.hard   / q.total * 100) : 0;
    const donut = q.total > 0
        ? `conic-gradient(#10b981 0% ${easyPct}%, #f59e0b ${easyPct}% ${easyPct+medPct}%, #f43f5e ${easyPct+medPct}% 100%)`
        : `conic-gradient(#262626 0% 100%)`;
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen size={20}/>}    label="Total Questions" value={q.total}        color="blue"/>
                <StatCard icon={<Users size={20}/>}       label="Total Users"     value={u.total}        color="purple"/>
                <StatCard icon={<TrendingUp size={20}/>}  label="New This Week"   value={u.newThisWeek}  color="emerald"/>
                <StatCard icon={<Shield size={20}/>}      label="Admins"          value={u.admins}       color="amber"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
                    <h3 className="text-white font-bold text-base mb-6">Difficulty Distribution</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                        <div className="relative w-32 h-32 shrink-0">
                            <div className="w-full h-full rounded-full" style={{ background: donut }}/>
                            <div className="absolute inset-4 rounded-full bg-[#030303] flex flex-col items-center justify-center">
                                <span className="text-white font-bold text-xl leading-none">{q.total}</span>
                                <span className="text-neutral-600 text-[9px] uppercase tracking-wider">total</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            {[{label:"Easy",count:q.easy,pct:easyPct,dot:"bg-emerald-400",txt:"text-emerald-400",bar:"bg-emerald-400"},{label:"Medium",count:q.medium,pct:medPct,dot:"bg-amber-400",txt:"text-amber-400",bar:"bg-amber-400"},{label:"Hard",count:q.hard,pct:hardPct,dot:"bg-rose-400",txt:"text-rose-400",bar:"bg-rose-400"}].map(d=>(
                                <div key={d.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${d.dot}`}/><span className="text-neutral-300">{d.label}</span></div>
                                        <div className="flex items-center gap-2"><span className={`font-bold ${d.txt}`}>{d.count}</span><span className="text-neutral-600 text-xs">{d.pct.toFixed(0)}%</span></div>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${d.bar} rounded-full`} style={{width:`${d.pct}%`}}/></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6">
                    <h3 className="text-white font-bold text-base mb-6">Recent Signups</h3>
                    <div className="space-y-4">
                        {recentUsers.length === 0 ? <p className="text-neutral-500 text-sm">No users yet.</p> :
                        recentUsers.map((usr, i) => (
                            <div key={usr._id||i} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">{((usr.firstname?.[0]||"")+( usr.lastname?.[0]||"")).toUpperCase()||"?"}</div>
                                <div className="flex-1 min-w-0"><p className="text-white text-sm font-medium truncate">{usr.firstname} {usr.lastname}</p><p className="text-neutral-500 text-xs">@{usr.username}</p></div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${usr.role==="admin"?"bg-purple-500/10 text-purple-400 border-purple-500/30":"bg-neutral-500/10 text-neutral-500 border-neutral-500/20"}`}>{usr.role}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({ onClose, onSuccess }) {
    const [jsonText, setJsonText] = useState("");
    const [parsed, setParsed]     = useState(null);
    const [parseErr, setParseErr] = useState("");
    const [loading, setLoading]   = useState(false);
    const [result, setResult]     = useState(null);
    const fileRef = useRef();
    const handleFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setJsonText(ev.target.result); r.readAsText(f); };
    const handleParse = () => {
        try {
            const raw = JSON.parse(jsonText);
            const list = Array.isArray(raw) ? raw : raw.questions;
            if (!Array.isArray(list)) throw new Error("Expected an array of questions (or { questions: [...] })");
            setParsed(list); setParseErr("");
        } catch (e) { setParseErr(e.message); setParsed(null); }
    };
    const handleImport = async () => {
        if (!parsed) return;
        setLoading(true);
        try {
            const res  = await fetch(`${API}/admin/bulkimport`, { method:"POST", headers: COMMON_HEADERS, ...authOpts, body: JSON.stringify({ questions: parsed }) });
            const data = await res.json();
            if (data.status) { setResult(data); toast.success(data.message); onSuccess(); }
            else toast.error(data.message || "Import failed.");
        } catch { toast.error("Network error."); }
        finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><Upload size={16} className="text-emerald-400"/></div><div><h2 className="text-white font-bold">Bulk Import</h2><p className="text-neutral-500 text-[10px] sm:text-xs">JSON array or upload .json</p></div></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all"><X size={14}/></button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4">
                    {!result ? (
                        <>
                            <div className="flex items-center gap-3">
                                <textarea rows={10} value={jsonText} onChange={e=>setJsonText(e.target.value)} placeholder={'[\n  {\n    "qno": 1, "qheading": "Two Sum",\n    "qdifficulty": "Easy",\n    "qdescription": "...",\n    "qstartcode": "...",\n    "qtags": ["Array"],\n    "qinput_output": [{"input":"4\\n2 7 11 15\\n9","output":"0 1"}, ...]\n  }\n]'} className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-xs font-mono resize-none"/>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={()=>fileRef.current.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-sm font-medium transition-all"><Upload size={14}/> Upload .json file</button>
                                <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden"/>
                                <button onClick={handleParse} disabled={!jsonText.trim()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-40">Parse JSON →</button>
                            </div>
                            {parseErr && <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs"><AlertCircle size={14} className="shrink-0 mt-0.5"/>{parseErr}</div>}
                            {parsed && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm"><CheckCircle2 size={16}/> Parsed {parsed.length} question{parsed.length!==1?"s":""}</div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">{parsed.slice(0,8).map((q,i)=>(<div key={i} className="flex items-center gap-2 text-xs"><span className="text-neutral-500 font-mono w-6">#{q.qno}</span><span className="text-white truncate">{q.qheading||"(no title)"}</span><span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${q.qdifficulty==="Easy"?"text-emerald-400":q.qdifficulty==="Medium"?"text-amber-400":"text-rose-400"}`}>{q.qdifficulty}</span></div>))}{parsed.length>8&&<p className="text-neutral-500 text-xs">+{parsed.length-8} more…</p>}</div>
                                    <button onClick={handleImport} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">{loading?<><Loader2 size={16} className="animate-spin"/>Importing...</>:<><Upload size={16}/>Import {parsed.length} Question{parsed.length!==1?"s":""}</>}</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-6 space-y-6">
                            <div className="flex items-center gap-3"><CheckCircle2 size={32} className="text-emerald-400"/><div><p className="text-white font-bold text-lg">Import Complete</p><p className="text-neutral-500 text-sm">{result.message}</p></div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"><p className="text-emerald-400 text-3xl font-extrabold">{result.inserted}</p><p className="text-neutral-400 text-sm mt-1">Inserted</p></div>
                                <div className="bg-neutral-500/10 border border-neutral-500/20 rounded-xl p-4 text-center"><p className="text-neutral-400 text-3xl font-extrabold">{result.skipped}</p><p className="text-neutral-500 text-sm mt-1">Skipped</p></div>
                            </div>
                            {result.errors?.length > 0 && <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4 max-h-40 overflow-y-auto space-y-1">{result.errors.map((e,i)=><p key={i} className="text-neutral-400 text-xs font-mono">{e}</p>)}</div>}
                            <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-all font-medium">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [drawer, setDrawer] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [showImport, setShowImport] = useState(false);

    const fetchQuestions = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API}/admin/questions?page=${p}&limit=15`, { headers: COMMON_HEADERS, ...authOpts });
            const data = await res.json();
            if (data.status) { setQuestions(data.doc); setTotalPages(data.pages || 1); setTotal(data.total || 0); }
            else toast.error("Failed to load questions.");
        } catch { toast.error("Network error."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchQuestions(page); }, [page, fetchQuestions]);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(confirmDelete.qno);
        try {
            const res  = await fetch(`${API}/admin/deletequestion/${confirmDelete.qno}`, { method: "DELETE", headers: COMMON_HEADERS, ...authOpts });
            const data = await res.json();
            if (data.status) { toast.success(data.message); fetchQuestions(page); }
            else toast.error(data.message || "Delete failed.");
        } catch { toast.error("Network error."); }
        finally { setDeleting(null); setConfirmDelete(null); }
    };

    const filtered = (questions || []).filter(q =>
        q.qheading.toLowerCase().includes(search.toLowerCase()) ||
        String(q.qno).includes(search)
    );

    return (
        <div>
            {showImport && <BulkImportModal onClose={() => setShowImport(false)} onSuccess={() => fetchQuestions(page)}/>}
            {drawer && <QuestionDrawer editQuestion={drawer==="add"?null:drawer} onClose={()=>setDrawer(null)} onSuccess={()=>fetchQuestions(page)}/>}
            {confirmDelete && <ConfirmModal title="Delete Question" description={<>Delete <span className="text-white font-semibold">#{confirmDelete.qno} — {confirmDelete.qheading}</span>? All test cases will be removed.</>} confirmLabel="Delete" onConfirm={handleDelete} onCancel={()=>setConfirmDelete(null)}/>}

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-white font-bold text-xl">Question Bank</h2>
                    <p className="text-neutral-500 text-sm mt-0.5">{total} question{total !== 1 ? "s" : ""} total</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text" placeholder="Search questions..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => setShowImport(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold text-sm transition-all shrink-0"><Upload size={16}/> Import</button>
                        <button onClick={() => setDrawer("add")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.25)]"><Plus size={16} /> Add</button>
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                        <div className="w-8 h-8 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-sm">Loading questions...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-neutral-500">
                        <Database size={40} className="mx-auto mb-4 opacity-40" />
                        <p className="text-white font-medium mb-1">No questions found</p>
                        <p className="text-sm">Try a different search or add your first question.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-white/[0.05]">
                            {filtered.map((q, idx) => {
                                const diff = DIFF_META[q.qdifficulty] || DIFF_META.Easy;
                                return (
                                    <div key={q._id || idx} className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-bold text-neutral-600 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">#{q.qno}</span>
                                                <h4 className="text-white font-bold text-sm leading-tight">{q.qheading}</h4>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${diff.bg} ${diff.color} ${diff.border}`}>
                                                {q.qdifficulty}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1.5">
                                            {(q.qtags || []).slice(0, 3).map(t => (
                                                <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.07] text-neutral-500 text-[10px]">{t}</span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                onClick={() => setDrawer(q)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-amber-400 bg-amber-400/5 border border-amber-400/20 active:scale-95 transition-all"
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(q)}
                                                disabled={deleting === q.qno}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-red-400 bg-red-400/5 border border-red-400/20 active:scale-95 transition-all disabled:opacity-40"
                                            >
                                                {deleting === q.qno ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.07] text-neutral-500 text-xs uppercase tracking-widest">
                                        <th className="text-left px-5 py-4 font-semibold text-center w-16">#</th>
                                        <th className="text-left px-5 py-4 font-semibold">Title</th>
                                        <th className="text-left px-4 py-4 font-semibold hidden md:table-cell">Difficulty</th>
                                        <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Tags</th>
                                        <th className="text-right px-5 py-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((q, idx) => {
                                        const diff = DIFF_META[q.qdifficulty] || DIFF_META.Easy;
                                        return (
                                            <tr key={q._id || idx} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.025] transition-colors group">
                                                <td className="px-5 py-4 text-neutral-500 font-mono font-bold text-center">{q.qno}</td>
                                                <td className="px-5 py-4 text-white font-medium group-hover:text-blue-300 transition-colors max-w-xs truncate">{q.qheading}</td>
                                                <td className="px-4 py-4 hidden md:table-cell">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${diff.bg} ${diff.color} ${diff.border}`}>
                                                        {q.qdifficulty}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 hidden lg:table-cell">
                                                    <div className="flex gap-1.5 flex-wrap max-w-xs">
                                                        {(q.qtags || []).slice(0, 3).map(t => (
                                                            <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.07] text-neutral-400 text-xs">{t}</span>
                                                        ))}
                                                        {(q.qtags || []).length > 3 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.07] text-neutral-500 text-xs">+{q.qtags.length - 3}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setDrawer(q)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-400/5 hover:bg-amber-400/15 border border-amber-400/20 hover:border-amber-400/30 transition-all"
                                                        >
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(q)}
                                                            disabled={deleting === q.qno}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 bg-red-400/5 hover:bg-red-400/15 border border-red-400/20 hover:border-red-400/30 transition-all disabled:opacity-40"
                                                        >
                                                            {deleting === q.qno ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-sm">
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-neutral-400 text-sm font-medium">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-sm">
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [viewUser, setViewUser] = useState(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
    const [confirmRoleUser, setConfirmRoleUser] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [roleSaving, setRoleSaving] = useState(null);

    const fetchUsers = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API}/admin/viewusers?page=${p}&limit=15`, { headers: COMMON_HEADERS, ...authOpts });
            const data = await res.json();
            if (data.status) { setUsers(data.users); setTotalPages(data.pages || 1); setTotal(data.total || 0); }
            else toast.error("Failed to load users.");
        } catch { toast.error("Network error."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(page); }, [page, fetchUsers]);

    const handleDeleteUser = async () => {
        if (!confirmDeleteUser) return;
        setDeleting(confirmDeleteUser._id);
        try {
            const res  = await fetch(`${API}/admin/deleteuser/${confirmDeleteUser._id}`, { method: "DELETE", headers: COMMON_HEADERS, ...authOpts });
            const data = await res.json();
            if (data.status) { toast.success(data.message); setViewUser(null); setConfirmDeleteUser(null); fetchUsers(page); }
            else toast.error(data.message || "Delete failed.");
        } catch { toast.error("Network error."); }
        finally { setDeleting(null); }
    };

    const handleRoleToggle = async () => {
        if (!confirmRoleUser) return;
        const newRole = confirmRoleUser.role === "admin" ? "user" : "admin";
        setRoleSaving(confirmRoleUser._id);
        try {
            const res  = await fetch(`${API}/admin/updateuserrole/${confirmRoleUser._id}`, { method: "PATCH", headers: COMMON_HEADERS, ...authOpts, body: JSON.stringify({ role: newRole }) });
            const data = await res.json();
            if (data.status) { toast.success(data.message); setConfirmRoleUser(null); setViewUser(null); fetchUsers(page); }
            else toast.error(data.message);
        } catch { toast.error("Network error."); }
        finally { setRoleSaving(null); }
    };

    const filtered = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        `${u.firstname} ${u.lastname}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {viewUser && (
                <UserProfileModal
                    user={viewUser}
                    onClose={() => setViewUser(null)}
                    onDelete={(u) => { setViewUser(null); setConfirmDeleteUser(u); }}
                    onToggleRole={(u) => { setViewUser(null); setConfirmRoleUser(u); }}
                />
            )}
            {confirmDeleteUser && (
                <ConfirmModal
                    title="Delete User"
                    description={<>Are you sure you want to permanently delete <span className="text-white font-semibold">@{confirmDeleteUser.username}</span>? This cannot be undone.</>}
                    confirmLabel={deleting ? "Deleting..." : "Delete User"}
                    onConfirm={handleDeleteUser}
                    onCancel={() => setConfirmDeleteUser(null)}
                />
            )}
            {confirmRoleUser && (
                <ConfirmModal
                    title={confirmRoleUser.role === "admin" ? "Demote Admin" : "Promote to Admin"}
                    description={<>Change <span className="text-white font-semibold">@{confirmRoleUser.username}</span>'s role to <span className="text-white font-semibold">{confirmRoleUser.role === "admin" ? "User" : "Admin"}</span>?</>}
                    confirmLabel={roleSaving ? "Saving..." : confirmRoleUser.role === "admin" ? "Demote" : "Promote"}
                    confirmClass={confirmRoleUser.role === "admin" ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30" : "bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-purple-500/30"}
                    onConfirm={handleRoleToggle}
                    onCancel={() => setConfirmRoleUser(null)}
                />
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-white font-bold text-xl">Users</h2>
                    <p className="text-neutral-500 text-sm mt-0.5">{total} registered user{total !== 1 ? "s" : ""}</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text" placeholder="Search users..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                        <div className="w-8 h-8 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-sm">Loading users...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-neutral-500">
                        <Users size={40} className="mx-auto mb-4 opacity-40" />
                        <p className="text-white font-medium mb-1">No users found</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-white/[0.05]">
                            {filtered.map((u, idx) => (
                                <div key={u._id || idx} className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {((u.firstname?.[0] || "") + (u.lastname?.[0] || "")).toUpperCase() || u.username?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm tracking-tight">{u.firstname} {u.lastname}</p>
                                            <p className="text-neutral-500 text-[11px]">@{u.username}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] space-y-2">
                                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                                            <Mail size={12} className="text-neutral-600" />
                                            <span className="truncate">{u.email}</span>
                                        </div>
                                        {u.createdAt && (
                                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium tracking-wide">
                                                <Calendar size={12} className="text-neutral-700" />
                                                <span>Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <button onClick={()=>setViewUser(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-blue-400 bg-blue-400/5 border border-blue-400/20 active:scale-95 transition-all outline-none"><Eye size={12}/> View</button>
                                        <button 
                                            onClick={()=>setConfirmRoleUser(u)} 
                                            disabled={roleSaving===u._id || u._id === localStorage.getItem("userId")} 
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold active:scale-95 transition-all outline-none disabled:opacity-30 ${u.role==="admin"?"text-neutral-400 bg-neutral-400/5 border border-neutral-400/20":"text-purple-400 bg-purple-400/5 border border-purple-400/20 hover:bg-purple-400/15"}`}
                                        >
                                            {roleSaving===u._id?<Loader2 size={12} className="animate-spin"/>:u.role==="admin"?"Demote":"Promote"}
                                        </button>
                                        {u.role !== "admin" && (
                                            <button onClick={()=>setConfirmDeleteUser(u)} disabled={deleting===u._id} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-red-400 bg-red-400/5 border border-red-400/20 active:scale-95 transition-all outline-none disabled:opacity-40">
                                                {deleting===u._id?<Loader2 size={12} className="animate-spin"/>:<Trash2 size={12}/>} Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.07] text-neutral-500 text-xs uppercase tracking-widest">
                                        <th className="text-left px-5 py-4 font-semibold">User</th>
                                        <th className="text-left px-5 py-4 font-semibold hidden md:table-cell">Email</th>
                                        <th className="text-left px-4 py-4 font-semibold text-center w-24">Role</th>
                                        <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Joined</th>
                                        <th className="text-right px-5 py-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u, idx) => (
                                        <tr key={u._id || idx} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.025] transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {((u.firstname?.[0] || "") + (u.lastname?.[0] || "")).toUpperCase() || u.username?.[0]?.toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{u.firstname} {u.lastname}</p>
                                                        <p className="text-neutral-500 text-xs">@{u.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-neutral-400 hidden md:table-cell">{u.email}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                    u.role === "admin"
                                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                                        : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-neutral-500 text-xs hidden lg:table-cell">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={()=>setViewUser(u)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-400/5 hover:bg-blue-400/15 border border-blue-400/20 transition-all"><Eye size={12}/> View</button>
                                                    <button 
                                                        onClick={()=>setConfirmRoleUser(u)} 
                                                        disabled={roleSaving===u._id || u._id === localStorage.getItem("userId")} 
                                                        title={u._id === localStorage.getItem("userId") ? "You cannot change your own role" : ""}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${u.role==="admin"?"text-neutral-400 bg-neutral-400/5 border border-neutral-400/20":"text-purple-400 bg-purple-400/5 border border-purple-400/20 hover:bg-purple-400/15"}`}
                                                    >
                                                        {roleSaving===u._id?<Loader2 size={12} className="animate-spin"/>:u.role==="admin"?"Demote":"Promote"}
                                                    </button>
                                                    {u.role !== "admin" && <button onClick={()=>setConfirmDeleteUser(u)} disabled={deleting===u._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 bg-red-400/5 hover:bg-red-400/15 border border-red-400/20 transition-all disabled:opacity-40">{deleting===u._id?<Loader2 size={12} className="animate-spin"/>:<Trash2 size={12}/>}Delete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-sm">
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-neutral-400 text-sm font-medium">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-sm">
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Admin Panel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState("questions");

    const tabs = [
        { id: "overview",  label: "Overview",  icon: <TrendingUp size={16}/> },
        { id: "questions", label: "Questions", icon: <BookOpen size={16}/> },
        { id: "users",     label: "Users",     icon: <Users size={16}/> },
    ];

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black relative overflow-hidden">
            <div className="absolute top-[-15%] left-[-5%] w-[35%] h-[35%] rounded-full bg-purple-600/8 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-600/8 blur-[130px] pointer-events-none" />

            <Navbar />

            <main className="pt-24 sm:pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Page Header */}
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                        <Shield size={22} className="text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                            Admin Panel
                        </h1>
                        <p className="text-neutral-500 text-sm mt-0.5">Manage questions and users for NexInterview</p>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1 mb-8 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                                activeTab === tab.id
                                    ? "bg-white text-black shadow-sm"
                                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === "overview"  && <OverviewTab />}
                    {activeTab === "questions" && <QuestionsTab />}
                    {activeTab === "users"     && <UsersTab />}
                </div>
            </main>
        </div>
    );
}
