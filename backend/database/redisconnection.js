const redis = require("redis")
require("dotenv").config()

const redisClient = redis.createClient({
    url: process.env.REDIS_CONNECT
})

redisClient.on("connect", ()=> {
    console.log("Redis client connected")
})

redisClient.on("error", (err)=> {
    console.log(`Problem in redis connection : ${err.message}`)
})  

module.exports = redisClient