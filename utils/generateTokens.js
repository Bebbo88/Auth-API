const jwt = require('jsonwebtoken');

const generateTokens = (payload) => {

    const token = jwt.sign({firstName:payload.firstName, lastName:payload.lastName, email:payload.email, id:payload.id,role:payload.role}, process.env.JWT_SECRET_KEY)
    return token
}       
module.exports = generateTokens