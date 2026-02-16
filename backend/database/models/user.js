const mongoose = require("mongoose")
const {Schema} = mongoose

const userSchema = new Schema({
    
    username: {
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase: true
    },
    email: {
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase: true
    },
    password: {
        type:String,
        required:true,
    },
    firstname: {
        type:String,
        required:true,
        trim:true
    },
    lastname: {
        type:String,
        required:true,
        trim:true
    },
    role: {
        type:String,
        required:true,
        enum: ["user","admin"],
        default: "user"
    }
}, {timestamps: true})

const user = mongoose.model("user",userSchema)
module.exports = user