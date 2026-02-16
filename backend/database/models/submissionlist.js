const mongoose = require("mongoose")
const {Schema} = mongoose

const submissionlistSchema = new Schema({
    
    code: {
        type: String,
        required: true,
        trim: true,
    },
    language: {
        type: String,
        required:true,
        enum: ["c","cpp","java","python","javascript"]
    },
    status: {
        type:String,
        required: true,
        enum:["accepted","wrong answer","tle","runtime error"]
    },
    tc: {
        type:String,
        required: false,
        trim: true
    },
    sc: {
        type: String,
        required: false,
        trim: true
    }
}, {timestamps: true})

const submissionlist = mongoose.model("submissionlist",submissionlistSchema)
module.exports = submissionlist