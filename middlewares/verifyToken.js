const appErrors = require("../utils/appErrors");
const { ERROR } = require("../utils/httpStatusText");
const jwt = require("jsonwebtoken");

const VerifyToken = (req, res, next) => {
    const authHeader= req.headers['Authorization']||req.headers['authorization'];
    if(!authHeader){
        const err = appErrors.create("please login first", 401, ERROR);
    return next(err); 
    }
    const token = authHeader.split(' ')[1];
    try{
       const currentUser = jwt.verify(token, process.env.JWT_SECRET_KEY)
       req.currentUser = currentUser;
        next();
    }catch(err){
        const error = appErrors.create("Unauthorized", 401, ERROR);
    return next(error); 
    }
}
module.exports = VerifyToken