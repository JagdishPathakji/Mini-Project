const validator = require("validator")
const user = require("../database/models/user")
const bcrypt = require("bcrypt")
const redisClient = require("../database/redisconnection")
const jwt = require("jsonwebtoken")
const sendEmail = require("../services/sendEmail")

const userlogin = async (req, res) => {

    try {

        const userData = req.body;
        const requiredFields = ["email", "password", "role"];

        const allFieldsPresent = requiredFields.every((field) => userData[field])
        if (!allFieldsPresent)
            return res.status(400).send({ status: false, message: "Please fill all the required fields" })

        // Email validation
        if (!validator.isEmail(userData.email))
            return res.status(422).send({ status: false, message: "Email format is invalid" })

        const databaseResult = await user.findOne({ email: userData.email })

        if (!databaseResult)
            return res.status(404).send({ status: false, message: "User not found" })

        const isMatch = await bcrypt.compare(userData.password, databaseResult.password)
        if (!isMatch)
            return res.status(401).send({ status: false, message: "Invalid Credentials" })

        const token = jwt.sign({ email: userData.email, role: userData.role }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" })
        console.log("token is : ", token)
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000
        })

        res.status(200).send({
            status: true,
            message: "User Login Successful"
        })
    }
    catch (error) {
        res.status(500).send({
            status: false,
            messgae: "Internal Server Error"
        })
    }
}

const usersignup = async (req, res) => {

    const userData = req.body;
    const requiredFields = ["username", "email", "password", "firstname", "lastname"];

    if (!requiredFields.every((f) => userData[f])) {
        return res.status(400).send({ status: false, message: "Please fill all required fields" });
    }

    // Validate email & password
    if (!validator.isEmail(userData.email))
        return res.status(422).send({ status: false, message: "Email format is invalid" });

    const email = req.body.email;
    if (!validator.isStrongPassword(userData.password, {
        minLength: 8,
        maxLength: 20,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }))
        return res.status(422).send({ status: false, message: "Password is weak" });

    // Check email or username duplicate
    const existing = await user.findOne({
        $or: [{ email: userData.email }, { username: userData.username }],
    });

    if (existing) {
        return res.status(409).send({
            status: false,
            message: "This username or email already exists. Please select a different credentials or login if it is yours.",
        });
    }

    // Hash password
    const saltRounds = 10;
    userData.password = await bcrypt.hash(userData.password, saltRounds);

    const count = await redisClient.get(`${email}`)
    if (count == null) {
        await redisClient.set(`${email}`, 1, { EX: 300 })
    }
    else {
        const ttl = await redisClient.ttl(email); // seconds
        if (count > 2) {
            return res.send({
                status: "redis",
                message: `Too many OTP Request from this ${email}. Kindly try after ${ttl / 60} minutes`
            })
        }
        else {
            await redisClient.set(`${email}`, count + 1, { EX: ttl })
        }
    }

    // Send OTP email
    const emailSent = await sendEmail(userData);
    if (!emailSent) {
        return res.status(422).send({
            status: false,
            message: `Failed to send OTP to ${userData.email}`,
        });
    }

    return res.status(200).send({
        status: true,
        message: "OTP sent to your email for verification",
    });

}

const verifyemail = async (req, res) => {

    try {

        let userData = req.body
        const requiredFields = ["email", "otp"]

        // check if all the required fields are present or not
        const allFieldsPresent = requiredFields.every((field) => userData[field])
        if (!allFieldsPresent)
            return res.status(400).send({ status: "field", message: "Please fill all the required fields" })


        if (!validator.isEmail(userData.email))
            return res.status(422).send({ status: "format", message: "Email format is invalid" })

        let storedOtp
        try {
            storedOtp = await redisClient.get(`otp:${userData.email}`);
        }
        catch (error) {
            return res.status(500).send({
                status: "redis",
                message: "Error accessing OTP store. Please try again later",
            });
        }

        if (!storedOtp) return res.status(404).send({ status: "otp", message: "OTP not found or expired" });
        if (storedOtp !== userData.otp) return res.status(400).send({ status: "otp", message: "OTP is invalid" });


        const userDataRaw = await redisClient.get(`user:${userData.email}`);
        if (!userDataRaw) return res.status(404).send({ status: "user", message: "User data not found. Please signup again" });

        const data = JSON.parse(userDataRaw)
        userData = { ...userData, ...data }
        await user.create(userData);


        await redisClient.del(`otp:${userData.email}`);
        await redisClient.del(`user:${userData.email}`);

        return res.status(201).send({
            status: true,
            message: "User created successfully!"
        });
    }
    catch (error) {
        console.error("VerifyEmail error:", error);
        return res.status(500).send({ status: false, message: "Internal Server Error during email verification" })
    }

}

const logout = async (req, res) => {

    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "none"
        })
        return res.status(200).send({ status: true, message: "User logged out successfully" })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: "Internal Server Error during logout" })
    }
}

module.exports = {
    usersignup,
    userlogin,
    verifyemail,
    logout
}