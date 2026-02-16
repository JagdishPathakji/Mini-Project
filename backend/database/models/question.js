const mongoose = require("mongoose")
const {Schema} = mongoose

const inputoutputSchema = new Schema({
    input: {
        type: String,
    },
    output: {
        type: String
    }
}, {_id: false})

const questionSchema = new Schema({

    qno : {
        type: Number,
        required: true,
        unique: true
    },
    qheading : {
        type: String,
        required: true,
        trim: true
    },
    qdifficulty: {
        type: String,
        required: true,
        trim: true
    },
    qdescription : {
        type: String,
        required: true,
        trim: true
    },
    qtags : {
        type: [String],
        default: []
    },
    qinput_output: [inputoutputSchema],
    qstartcode: {
        type: String,
        required: true,
        trim: true
    }
}, {timestamps: true})

const question = mongoose.model("question", questionSchema)
module.exports = question