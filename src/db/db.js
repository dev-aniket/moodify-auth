import mongoose from "mongoose";;
import _config from "../confg/config.js";


async function connectDB(){
    try{
        await mongoose.connect(_config.MONGODB_URI);
        console.log("Connected to DB");
    }
    catch(err){
        console.log("Error", err);
    }
}

export default connectDB;