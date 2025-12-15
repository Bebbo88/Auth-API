const appErrors = require("../utils/appErrors");
const { FAIL } = require("../utils/httpStatusText");

const allowedTo=(...roles)=>{
   return (req, res, next)=>{
      if(!roles.includes(req.currentUser.role)){
    const err = appErrors.create("you are not allowed to perform this action", 401, FAIL);
    return next(err); 
 } 
 next();
   }  
}

module.exports = allowedTo