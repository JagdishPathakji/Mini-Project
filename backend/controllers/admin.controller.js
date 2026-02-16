const admin = require("../database/models/user")

const addquestion = async(req,res)=> {
    
    return res.status(200).send({
        status:true,
        message:"Question added successfull"
    })
}

const viewusers = async(req,res)=> {

    return res.status(200).send({
        status:true,
        message:"Users data sent successfully"
    })
}

module.exports = {
    viewusers,
    addquestion
}