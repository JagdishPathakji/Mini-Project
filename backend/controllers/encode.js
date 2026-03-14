function encode(str) {
    return Buffer.from(str).toString("base64");
}

module.exports = encode;