# NexInterview - Full-Stack Competitive Programming & AI Interview Platform

NexInterview is a comprehensive, state-of-the-art coding platform designed for developers to hone their skills through competitive programming, 1v1 challenges, and AI-powered mock interviews. Built with a modern tech stack (React 19, Tailwind CSS 4, Node.js, MongoDB, and Redis), it offers a seamless and interactive experience for users to learn, practice, and compete.

## 🚀 Key Features

### 💻 Problem Solving (Solve Engine)
- **Advanced Code Editor**: Integrated **Monaco Editor** (the engine behind VS Code) with syntax highlighting, auto-completion, and multi-language support.
- **Real-Time Execution**: Execute code against multiple test cases with live performance telemetry (runtime and memory usage).
- **Problem Library**: A vast collection of curated DSA problems categorized by difficulty (Easy, Medium, Hard) and tags.

### ⚔️ 1v1 Coding Challenges
- **Multiplayer Arena**: Real-time coding battles against other users.
- **Live Sync**: See your opponent's progress and submission status in real-time using **Socket.io**.
- **Competitive Scoring**: Win conditions based on speed and accuracy.

### 🤖 AI Mock Interview Room
- **Smart Interviews**: Conduct mock technical interviews with an AI powered by **Ollama (Local LLM)**.
- **Speech-to-Text**: Voice-enabled interaction for a realistic interview experience.
- **Audio Visualization**: Dynamic real-time audio wave visualization for immersive interaction.
- **DSA-Specific Tracks**: Focused interview paths for Data Structures and Algorithms.

### 📊 User Dashboard & Profile
- **Activity Stats**: Track your progress with detailed analytics on problems solved and submissions.
- **Session Persistence**: Never lose your progress with session-based code state management.
- **Progress Tracking**: Visual representations of difficulty-wise problem completion.

### 🛡️ Admin Suite
- **Full Control**: Comprehensive admin panel to manage questions, delete/edit problems, and monitor platform activity.
- **Role-Based Access**: Secure admin-only routes with server-side validation.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Editor**: [@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react)
- **Icons**: Lucide React & React Icons
- **Feedback**: React Hot Toast & Canvas Confetti

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Real-Time**: [Socket.io](https://socket.io/)
- **Caching/Performance**: [Redis](https://redis.io/)
- **AI Engine**: [Ollama](https://ollama.com/)
- **Email/OTP**: [Brevo](https://www.brevo.com/)

---

## ⚙️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/JagdishPathakji/Mini-Project.git
cd Mini-Project
```

### 2. Backend Setup
```bash
cd backend
npm install
```
- Create a `.env` file in the `backend` folder:
- Add your variables (MongoDB URI, Redis settings, Brevo API key, etc.)
- Run the server:
```bash
node index.js
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### 4. AI Setup (Optional)
- Install [Ollama](https://ollama.com/) on your local machine.
- Pull the required model (e.g., `llama3` or `deepseek`):
```bash
ollama pull llama3
```

---

## 📁 Project Structure

```text
├── backend/               # Express server, MongoDB models, Sockets
│   ├── routes/            # API endpoints
│   ├── models/            # Mongoose schemas
│   └── index.js           # Main entry point
├── frontend/              # Vite + React application
│   ├── src/components/    # Core UI components (Solve, Challenge, Interview)
│   ├── src/App.jsx        # Routing and global state
│   └── main.jsx           # Entry point
└── ...                    # Configuration files
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the ISC License.