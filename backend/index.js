const express = require("express")
const dotenv = require("dotenv")
dotenv.config()
const cors = require("cors")
const cookieparser = require("cookie-parser")

// file exports
const dbconnection = require("./database/dbconnection")
const redisconnection = require("./database/redisconnection")
const mainRouter = require("./routes/main.router")

const app = express()
const port = process.env.PORT || 4000
app.use(cookieparser())
app.use(express.json())

const allowedOrigins = [];
if (process.env.ALLOW_LOCAL === "true") {
    allowedOrigins.push(
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    );
}

console.log("CORS allowed origins:", allowedOrigins);
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use("/", mainRouter)

const initialize = async ()=> {

    await dbconnection()
    console.log("MongoDB connection successfull")

    if (!redisconnection.isOpen) {
        await redisconnection.connect();
        console.log("Redis connected successfully");
    }

    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

initialize()