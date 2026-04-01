const axios = require("axios");
const jwt = require("jsonwebtoken");
const question = require("./database/models/question");

const JUDGE0_URL = "http://127.0.0.1:2358";

function encode(str) {
    return Buffer.from(str || "").toString("base64");
}

const languageMap = {
    python: 71,
    cpp: 52,
    java: 62,
    javascript: 63,
    c: 50,
};

// Difficulty → seconds
const DURATIONS = { Easy: 15 * 60, Medium: 30 * 60, Hard: 60 * 60 };
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

// In-memory room store
// roomId → { roomId, question, difficulty, duration, timeLeft, players[], status, timerInterval, tieRequests }
const rooms = new Map();

// Grace period timers for disconnect (so page navigation doesn't kill the match)
// `userId → { timer, roomId }`
const disconnectTimers = new Map();

function generateRoomId(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function getUserFromSocket(socket) {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.cookie
                ?.split(";")
                .find((c) => c.trim().startsWith("token="))
                ?.split("=")[1];
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch {
        return null;
    }
}

function emitTimerTick(io, roomId, timeLeft) {
    io.to(roomId).emit("timer-tick", { timeLeft });
}

function endRoom(io, roomId, payload) {
    const room = rooms.get(roomId);
    if (!room || room.status === "ended") return;
    room.status = "ended";
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }
    io.to(roomId).emit("match-over", payload);
}

function startTimer(io, roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.timerInterval = setInterval(() => {
        const r = rooms.get(roomId);
        if (!r || r.status === "ended") {
            clearInterval(room.timerInterval);
            return;
        }
        r.timeLeft -= 1;
        emitTimerTick(io, roomId, r.timeLeft);
        if (r.timeLeft <= 0) {
            endRoom(io, roomId, {
                reason: "timeout",
                result: "tie",
                message: "Time's up! The match is a tie.",
                players: r.players.map((p) => ({ username: p.username, code: p.code, language: p.language })),
            });
        }
    }, 1000);
}

async function runJudge(question, code, language) {
    const languageId = languageMap[language];
    if (!languageId) throw new Error("Unsupported language");

    const testcases = question.qinput_output;
    if (!testcases || testcases.length === 0) throw new Error("No test cases");

    const encodedCode = encode(code);
    const CONCURRENCY = 12;

    for (let i = 0; i < testcases.length; i += CONCURRENCY) {
        const chunk = testcases.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            chunk.map(async (tc, idx) => {
                const globalIdx = i + idx;
                const resp = await axios.post(
                    `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
                    {
                        language_id: languageId,
                        source_code: encodedCode,
                        stdin: encode(tc.input || ""),
                        expected_output: encode(tc.output || ""),
                    }
                );
                return { globalIdx, result: resp.data, testcase: tc };
            })
        );

        for (const { globalIdx, result, testcase } of results) {
            if (result.status && result.status.id !== 3) {
                return {
                    accepted: false,
                    failedAt: globalIdx + 1,
                    statusDesc: result.status.description,
                    details: result,
                    failedTestcase: testcase,
                };
            }
        }
    }

    return { accepted: true };
}

module.exports = function initChallengeSocket(io) {
    io.on("connection", (socket) => {
        const user = getUserFromSocket(socket);
        const username = user?.username || user?.name || user?.email?.split("@")[0] || `Player_${socket.id.slice(0, 5)}`;
        const userId = user?.id || user?._id || socket.id;

        console.log(`[Challenge] Connected: ${username} (${socket.id})`);

        // Cancel any pending disconnect timer for this user
        if (disconnectTimers.has(String(userId))) {
            const dt = disconnectTimers.get(String(userId));
            clearTimeout(dt.timer);
            disconnectTimers.delete(String(userId));
            console.log(`[Challenge] Cancelled disconnect timer for ${username}`);
        }

        // ─── REJOIN ROOM (after page navigation) ────────────────────────────
        socket.on("rejoin-room", ({ roomId: rid }) => {
            const room = rooms.get(rid);
            if (!room) { socket.emit("room-error", { message: "Room no longer exists." }); return; }
            if (room.status === "ended") { socket.emit("room-error", { message: "This match has already ended." }); return; }

            const player = room.players.find(p => String(p.userId) === String(userId));
            if (!player) { socket.emit("room-error", { message: "You are not a participant in this room." }); return; }

            // Update socketId and rejoin the Socket.IO room
            player.socketId = socket.id;
            socket.join(rid);
            socket.emit("rejoin-success", { roomId: rid, timeLeft: room.timeLeft });
            console.log(`[Challenge] ${username} rejoined room ${rid} with new socket ${socket.id}`);
        });

        // ─── CREATE ROOM ───────────────────────────────────────────────────────
        socket.on("create-room", async () => {
            try {
                const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
                const duration = DURATIONS[difficulty];

                const docs = await question.aggregate([
                    { $match: { qdifficulty: difficulty } },
                    { $sample: { size: 1 } },
                ]);

                if (!docs || docs.length === 0) {
                    socket.emit("room-error", { message: "No questions available. Try again." });
                    return;
                }

                const q = docs[0];
                let roomId;
                do { roomId = generateRoomId(); } while (rooms.has(roomId));

                rooms.set(roomId, {
                    roomId,
                    question: q,
                    difficulty,
                    duration,
                    timeLeft: duration,
                    players: [{ socketId: socket.id, userId, username, code: "", language: "python", solved: false }],
                    status: "waiting",
                    timerInterval: null,
                    tieRequests: new Set(),
                });

                socket.join(roomId);
                socket.emit("room-created", {
                    roomId,
                    difficulty,
                    duration,
                    username,
                });
                console.log(`[Challenge] Room created: ${roomId} | ${difficulty} | ${username}`);
            } catch (err) {
                console.error("[Challenge] create-room error:", err);
                socket.emit("room-error", { message: "Failed to create room. Please retry." });
            }
        });

        // ─── JOIN ROOM ─────────────────────────────────────────────────────────
        socket.on("join-room", ({ roomId }) => {
            const room = rooms.get(roomId?.toUpperCase?.() || roomId);
            if (!room) {
                socket.emit("room-error", { message: "Room not found. Check the Room ID." });
                return;
            }
            if (room.status !== "waiting") {
                socket.emit("room-error", { message: "This match has already started or ended." });
                return;
            }
            if (room.players.length >= 2) {
                socket.emit("room-error", { message: "Room is full." });
                return;
            }
            // Prevent same user joining their own room
            if (room.players[0].socketId === socket.id || room.players[0].userId === userId) {
                socket.emit("room-error", { message: "You cannot join your own room." });
                return;
            }

            room.players.push({ socketId: socket.id, userId, username, code: "", language: "python", solved: false });
            room.status = "active";
            socket.join(roomId);

            // Strip large input/output for transmission but keep description
            const qForClient = {
                _id: room.question._id,
                qno: room.question.qno,
                qheading: room.question.qheading,
                qdifficulty: room.question.qdifficulty,
                qdescription: room.question.qdescription,
                qtags: room.question.qtags,
                sampleTestcases: (room.question.qinput_output || []).slice(0, 3),
            };

            const matchPayload = {
                roomId,
                question: qForClient,
                difficulty: room.difficulty,
                duration: room.duration,
                timeLeft: room.timeLeft,
                players: room.players.map((p) => ({ username: p.username, userId: p.userId })),
            };

            // Emit to BOTH players simultaneously
            io.to(roomId).emit("match-start", matchPayload);
            startTimer(io, roomId);
            console.log(`[Challenge] Match started in ${roomId}: ${room.players.map((p) => p.username).join(" vs ")}`);
        });

        // ─── SUBMIT CODE ───────────────────────────────────────────────────────
        socket.on("submit-code", async ({ roomId, code, language }) => {
            const room = rooms.get(roomId);
            if (!room || room.status !== "active") {
                socket.emit("submission-result", { status: false, message: "Match is not active." });
                return;
            }

            const playerIdx = room.players.findIndex((p) => p.socketId === socket.id || String(p.userId) === String(userId));
            if (playerIdx === -1) {
                socket.emit("submission-update", { stage: "completed", status: false, message: "You are not in this room." });
                return;
            }

            // Update stored code
            room.players[playerIdx].code = code;
            room.players[playerIdx].language = language;

            // Stream live testcase updates only to submitting player
            socket.emit("submission-update", { stage: "start" });

            try {
                const qDoc = room.question;
                const testcases = qDoc.qinput_output || [];
                const languageId = languageMap[language];

                if (!languageId) {
                    socket.emit("submission-update", { stage: "completed", status: false, message: "Unsupported language" });
                    return;
                }

                const encodedCode = encode(code);
                const CONCURRENCY = 12;
                let accepted = true;
                let failPayload = null;
                let maxTime = 0;
                let maxMemory = 0;

                outerLoop:
                for (let i = 0; i < testcases.length; i += CONCURRENCY) {
                    const chunk = testcases.slice(i, i + CONCURRENCY);
                    const chunkPromises = chunk.map(async (tc, idx) => {
                        const globalIdx = i + idx;
                        socket.emit("submission-update", {
                            stage: "running",
                            testcase: globalIdx + 1,
                            total: testcases.length,
                        });
                        const resp = await axios.post(
                            `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
                            {
                                language_id: languageId,
                                source_code: encodedCode,
                                stdin: encode(tc.input || ""),
                                expected_output: encode(tc.output || ""),
                            }
                        );
                        return { globalIdx, result: resp.data, testcase: tc };
                    });

                    let chunkResults;
                    try {
                        chunkResults = await Promise.all(chunkPromises);
                    } catch (err) {
                        accepted = false;
                        socket.emit("submission-update", {
                            stage: "completed",
                            status: false,
                            message: `Execution error: ${err.message}`,
                        });
                        return;
                    }

                    for (const { globalIdx, result, testcase } of chunkResults) {
                        if (result.status && result.status.id !== 3) {
                            accepted = false;
                            failPayload = { globalIdx, result, testcase };
                            break outerLoop;
                        }
                        socket.emit("submission-update", {
                            stage: "passed",
                            testcase: globalIdx + 1,
                            time: result.time,
                        });
                        if (result.time) maxTime = Math.max(maxTime, parseFloat(result.time));
                        if (result.memory) maxMemory = Math.max(maxMemory, parseFloat(result.memory));
                    }
                }

                if (!accepted && failPayload) {
                    socket.emit("submission-update", {
                        stage: "completed",
                        status: false,
                        message: `Testcase ${failPayload.globalIdx + 1} failed: ${failPayload.result.status.description}`,
                        details: failPayload.result,
                        failed_testcase: { input: failPayload.testcase.input, expected_output: failPayload.testcase.output },
                    });
                    return;
                }

                if (accepted) {
                    // Winner!
                    room.players[playerIdx].solved = true;
                    socket.emit("submission-update", {
                        stage: "completed",
                        status: true,
                        message: "All test cases passed!",
                        details: { time: maxTime.toFixed(3), memory: maxMemory },
                    });

                    const winner = room.players[playerIdx];
                    const loser = room.players[1 - playerIdx];

                    endRoom(io, roomId, {
                        reason: "solved",
                        winner: { username: winner.username, userId: winner.userId, code: winner.code, language: winner.language },
                        loser: { username: loser.username, userId: loser.userId, code: loser.code, language: loser.language },
                        message: `${winner.username} solved it first!`,
                        details: { time: maxTime.toFixed(3), memory: maxMemory },
                    });
                }
            } catch (err) {
                console.error("[Challenge] submit-code error:", err);
                socket.emit("submission-update", {
                    stage: "completed",
                    status: false,
                    message: `Internal error: ${err.message}`,
                });
            }
        });

        // ─── GIVE UP ────────────────────────────────────────────────────────────
        socket.on("give-up", ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room || room.status !== "active") return;

            const loserIdx = room.players.findIndex((p) => p.socketId === socket.id || String(p.userId) === String(userId));
            if (loserIdx === -1) return;
            const winnerIdx = 1 - loserIdx;

            const loser = room.players[loserIdx];
            const winner = room.players[winnerIdx];

            endRoom(io, roomId, {
                reason: "forfeit",
                winner: { username: winner.username, userId: winner.userId, code: winner.code, language: winner.language },
                loser: { username: loser.username, userId: loser.userId, code: loser.code, language: loser.language },
                message: `${loser.username} gave up. ${winner.username} wins!`,
            });
        });

        // ─── REQUEST TIE ────────────────────────────────────────────────────────
        socket.on("request-tie", ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room || room.status !== "active") return;

            const player = room.players.find((p) => p.socketId === socket.id || String(p.userId) === String(userId));
            if (!player) return;

            room.tieRequests.add(String(player.userId));

            if (room.tieRequests.size >= 2) {
                endRoom(io, roomId, {
                    reason: "tie-agreed",
                    result: "tie",
                    message: "Both players agreed to a tie.",
                    players: room.players.map((p) => ({ username: p.username, code: p.code, language: p.language })),
                });
            } else {
                // Notify opponent that this player wants a tie
                const opponentSocket = room.players.find((p) => p.socketId !== socket.id)?.socketId;
                if (opponentSocket) {
                    io.to(opponentSocket).emit("tie-requested", { from: player.username });
                }
                socket.emit("tie-request-sent", {});
            }
        });

        // ─── CODE SYNC (store latest code for end-of-match reveal) ─────────────
        socket.on("code-update", ({ roomId, code, language }) => {
            const room = rooms.get(roomId);
            if (!room) return;
            const player = room.players.find((p) => p.socketId === socket.id || String(p.userId) === String(userId));
            if (player) {
                player.code = code;
                player.language = language;
            }
        });

        // ─── DISCONNECT (with grace period) ──────────────────────────────────
        socket.on("disconnect", () => {
            console.log(`[Challenge] Disconnected: ${username} (${socket.id})`);
            // Find any active room with this player
            for (const [roomId, room] of rooms.entries()) {
                const idx = room.players.findIndex((p) => p.socketId === socket.id || String(p.userId) === String(userId));
                if (idx === -1) continue;

                if (room.status === "waiting") {
                    // Grace period for waiting rooms too (creator navigating)
                    const timer = setTimeout(() => {
                        disconnectTimers.delete(String(userId));
                        const r = rooms.get(roomId);
                        if (r && r.status === "waiting") rooms.delete(roomId);
                    }, 8000);
                    disconnectTimers.set(String(userId), { timer, roomId });
                } else if (room.status === "active") {
                    // Give 5 seconds for reconnection (page navigation)
                    const timer = setTimeout(() => {
                        disconnectTimers.delete(String(userId));
                        const r = rooms.get(roomId);
                        if (!r || r.status === "ended") return;
                        // Check if the player reconnected (socketId would have changed)
                        const p = r.players[idx];
                        if (p && p.socketId === socket.id) {
                            // Still the old socket = truly disconnected
                            const winner = r.players[1 - idx];
                            const loser = r.players[idx];
                            endRoom(io, roomId, {
                                reason: "disconnect",
                                winner: { username: winner.username, userId: winner.userId, code: winner.code, language: winner.language },
                                loser: { username: loser.username, userId: loser.userId, code: loser.code, language: loser.language },
                                message: `${loser.username} disconnected. ${winner.username} wins!`,
                            });
                        }
                    }, 5000);
                    disconnectTimers.set(String(userId), { timer, roomId });
                }
                break;
            }
        });
    });
};
