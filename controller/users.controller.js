const asyncWrapper = require("../middlewares/asyncWrapper");
const User = require("../models/user.model");
const appErrors = require("../utils/appErrors");
const { SUCCESS, FAIL } = require("../utils/httpStatusText");
const bcrypt = require('bcrypt');
const generateTokens = require("../utils/generateTokens");




const getAllUsers=asyncWrapper(async (req, res) => {
  const limit = req.query.limit || 10;
  const page = req.query.page || 1;
  const skip = (page - 1) * limit;
  const users = await User.find({}, { __v: false, "password": false, "token": false }).limit(limit).skip(skip);
  res.json({ status: SUCCESS, data: { users } });
});

const register = asyncWrapper(async (req, res, next) => {
    console.log(req.file);
    
    const oldUser = await User.findOne({email: req.body.email})
    if(oldUser){
        const err = appErrors.create("user already exists", 400, FAIL);
    return next(err);
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = await User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hashedPassword,
        role:req.body.role,
        avatar:req.file.filename
    })
    const token = generateTokens({firstName:newUser.firstName, lastName:newUser.lastName, email:newUser.email, id:newUser._id,role:newUser.role})
    newUser.token = token
    await newUser.save()
    res.status(201).json({ status: SUCCESS, data: { user:newUser } });
})
const login = asyncWrapper(async (req, res, next)=>{
    const user = await User.findOne({email:req.body.email})
    const token = generateTokens({ email:user.email, id:user._id,role:user.role})
    // user.token = token
    if(!user){
       const err = appErrors.create("email or password is incorrect", 400, FAIL);
    return next(err); 
    }
    if(!req.body.email || !req.body.password){
        const err = appErrors.create("email and password are required", 400, FAIL);
    return next(err); 
    }
    const isMatched = await bcrypt.compare(req.body.password, user.password)
    if(!isMatched){
        const err = appErrors.create("invalid email or password", 400, FAIL);
    return next(err); 
    }
    res.status(200).json({ status: SUCCESS, data:{
        accessToken:token
    } });

})

module.exports={
    getAllUsers,
    register,
    login
}

