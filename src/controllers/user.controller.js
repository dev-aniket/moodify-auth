import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import config from "../confg/config.js";
import bcrypt from 'bcryptjs'
import { publishToQueue } from "../broker/rabbit.js";

// Define your Frontend URL here. 
// Ideally put this in .env, but this fallback ensures it works on production.
const FRONTEND_URL = process.env.FRONTEND_URL || "https://moodify-frontend-three.vercel.app";

export async function register(req, res){
    const {email, password, fullname:{firstName, lastName}, role = "user"} = req.body;

    const ifUserAlreadyExists = await userModel.findOne({email});

    if(ifUserAlreadyExists){
        return res.status(400).json({
            message:"User already exists, please login"
        })
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        email, 
        password:hash,
        fullname:{
            firstName,
            lastName
        },
        role
    });

    const token = jwt.sign({
        id: user._id,
        role: user.role,
        fullname: user.fullname
    }, config.JWT_SECRET, {expiresIn:"3d"})

    await publishToQueue("user_created", {
            id:user._id,
            email:user.email,
            fullname:user.fullname,
            role:user.role
    })

    // Update cookie to work across Vercel and Render
    res.cookie("token", token, {
        httpOnly: true,
        secure: true, // Essential for HTTPS (Render/Vercel)
        sameSite: 'None' // Essential for Cross-Origin cookies
    });

    res.status(201).json({
        message:"User Registered Successfully",
        user:{
            id:user._id,
            email:user.email,
            fullname:user.fullname,
            role:user.role
        }
    })
};

export async function login(req, res){
    const {email, password} = req.body;

    const user = await userModel.findOne({email});
    if(!user){
        return res.status(400).json({
            message: "User not found, please register"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if(!isPasswordValid){
        return res.status(400).json({
            message:"Password is incorrect"
        })
    }

    const token = jwt.sign({
        id:user._id,
        role:user.role,
        fullname: user.fullname
    }, config.JWT_SECRET, {expiresIn:"3d"});

    // Update cookie to work across Vercel and Render
    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None' 
    });

    res.status(200).json({
        messsage: "User logged in successfully",
        user:{
            id: user._id,
            email: user.email,
            fullname: user.fullname,
            role: user.role
        }
    })
}

export async function googleAuthCallback(req, res){
    const user = req.user;
    
    const isAlreadyExists = await userModel.findOne({
        $or: [
            {email:user.emails[0].value},
            {googleId:user.id}
        ]
    })

    if(isAlreadyExists){
        const token = jwt.sign({
            id: isAlreadyExists._id,
            role: isAlreadyExists.role,
            fullname:isAlreadyExists.fullname
        }, config.JWT_SECRET, {expiresIn:"3d"})

        // 1. Fix Cookie for Production
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None' 
        });

         if(isAlreadyExists.role === 'artist'){
            // 2. Fix Redirect to use Vercel URL
            return res.redirect(`${FRONTEND_URL}/artist/dashboard`)
        }

        // 2. Fix Redirect to use Vercel URL
        return res.redirect(`${FRONTEND_URL}`)
    }

    const newUser = await userModel.create({
        googleId:user.id,
        email:user.emails[0].value,
        fullname:{
            firstName:user.name.givenName,
            lastName:user.name.familyName,
        }
    })

    const token = jwt.sign({
        id:newUser._id,
        role:newUser.role,
        fullname: newUser.fullname
    }, config.JWT_SECRET, {expiresIn:"3d"});


    // 1. Fix Cookie for Production
    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None' 
    });

    // 2. Fix Redirect to use Vercel URL
    res.redirect(`${FRONTEND_URL}`);
}