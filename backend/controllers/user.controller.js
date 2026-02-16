const user = require("../database/models/user")

const getprofile = async(req,res)=> {

    return res.status(200).send({
        status:true,
        message:"User profile sent successfully"
    })
}


module.exports = {
    getprofile
}