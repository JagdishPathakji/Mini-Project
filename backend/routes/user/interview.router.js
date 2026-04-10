const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const interviewRouter = express.Router();
const whisperController = require("../../controllers/whisper.controller");

// ── Multer config for audio upload ──────────────────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || ".webm";
        cb(null, `audio-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (Whisper limit)
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "audio/webm",
            "audio/wav",
            "audio/mp3",
            "audio/mpeg",
            "audio/mp4",
            "audio/m4a",
            "audio/ogg",
            "audio/flac",
            "video/webm", // MediaRecorder sometimes uses video/webm
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
        }
    },
});

// ── Routes ──────────────────────────────────────────────────────────

// POST /user/interview/transcribe — audio → Whisper → text
interviewRouter.post("/transcribe", upload.single("audio"), whisperController.transcribe);

// POST /user/interview/start — generate first question
interviewRouter.post("/start", whisperController.startInterview);

// POST /user/interview/evaluate — evaluate answer + generate next question
interviewRouter.post("/evaluate", whisperController.evaluate);

module.exports = interviewRouter;
