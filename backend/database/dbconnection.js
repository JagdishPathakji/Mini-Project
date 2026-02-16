const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config();
const url = process.env.DB_CONNECT;

console.log(url)
const db_connect = async()=> {
    try {   
       await mongoose.connect(url);
    }
    catch(err) {
        console.log(`Problem in database connection : ${err.message}`);
    }
}

module.exports = db_connect;