import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import config from "../confg/config.js";
import bcrypt from 'bcryptjs'
import { publishToQueue } from "../broker/rabbit.js";

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

    res.cookie("token", token);

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

    res.cookie("token", token);

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

        res.cookie("token", token);

         if(isAlreadyExists.role === 'artist'){
        return res.redirect('http://localhost:5173/artist/dashboard')
    }


        return res.redirect("http://localhost:5173")
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


    res.cookie("token", token);

   
    res.redirect("http://localhost:5173");
}