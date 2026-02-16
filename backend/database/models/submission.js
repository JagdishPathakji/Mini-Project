const mongoose = require("mongoose")
const {Schema} = mongoose

const submissionSchema = new Schema({
    
    user: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    question: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "question"
    },
    submissionlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "submissionlist",
            default: []
        }
    ]
}, {timestamps: true})

const submission = mongoose.model("submission",submissionSchema)
module.exports = submission