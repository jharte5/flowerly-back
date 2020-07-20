const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressJwt = require('express-jwt');
const User = require('../model/User')
const config = require('./jwtConfig');
// expressJwt({ secret:  'fashionJWT_SECRET', algorithms: ['HS256'] });

async function comparePassword(incomingPassword, userPassword) {
    try{
        await bcrypt.compare(userPassword, incomingPassword)
        .then(res=>{
            if (res===false) {
                throw Error('check email or password')
            } else {
                return res
            }
        })
    }catch (e) {
        return e;
    }
}

function createJwtToken(user) {
    
    let jwtToken = jwt.sign( payload = {email:user.email, _id: user._id, username: user.username},
        process.env.JWT_USER_SECRET_KEY, {
        expiresIn: "7d",
    })
    let jwtRefreshToken = jwt.sign({_id: user._id}, process.env.JWT_USER_REFRESH_SECRET_KEY, {expiresIn: '7d'})
    return {
        jwtToken,
        jwtRefreshToken
    };
    
}
let checkAuthMiddleware = expressJwt({
    secret: process.env.JWT_USER_SECRET_KEY || config["JWT_USER_SECRET_KEY"],
    userProperty: "auth",
    algorithms: ['HS256']
});
const findUserIfUserExist = async (req, res, next) => {
    const { _id } = req.auth;
    try {
        const foundUser = await User.findOne({_id: _id}).select('-__v -password');
        req.profile = foundUser;
        next();
    } catch (e) {
        return res.status(404).json({
            error: "User does not exist",
        });
    }
};
const hasAuthorization = (req, res, next) => {
    console.log('profile',req. profile)
    const authorized = req.profile && req.auth && req.profile._id == req.auth._id;
    if (!authorized) {
        return res.status("403").json({
            error: "User is not authorized",
        });
    } else {
        next();
    }
};
const customJWTVerify = (req, res, next) => {
    let token = req.headers.cookie.split("=");
    jwt.verify(
        token[1],
        process.env.JWT_USER_SECRET_KEY || config["JWT_USER_SECRET_KEY"],
        function (err, decoded) {
            if (err) {
                res.status(401).json({ message: "unauthorize" });
            }else{
                req.auth = decoded;
                next();
            }
        }
    );
};
let checkRefreshTokenMiddleware = expressJwt({
    secret: process.env.JWT_USER_REFRESH_SECRET_KEY || config['JWT_USER_REFRESH_SECRET_KEY'],
    userProperty: 'auth',
    algorithms: ['HS256']
});
module.exports = {
    comparePassword,
    createJwtToken,
    checkAuthMiddleware,
    findUserIfUserExist,
    hasAuthorization,
    checkRefreshTokenMiddleware
};