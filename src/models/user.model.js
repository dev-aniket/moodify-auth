import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true
    },
    fullname:{
        firstName:{type: String, required:true},
        lastName:{type: String, required:true}
    },
    googleId:{type:String},
    password:{
        type:String,
        required: function(){ return !this.googleId}
    },   
    role:{
        type:String,
        enum:["user", "artist"],
        default:"user"
    }
}, {timestamps:true});

const userModel = mongoose.model("user", userSchema);

export default userModel;