const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const validator = require("validator");

var config = require('../../config.json');

const msz = config.SECRET_MESSAGE

const studentSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique: true,
        trim: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Email is invalid")
            }
        }
    },
    password:{
        type: String,
        minlength:3,
        required: true,
        trim:true
    },
    address:{
        type: String,
        required: true,
        trim:true
    },
    tokens:[{
        token:{
            type: String,
            required: true
        }
    }]
})

// generating tokens
studentSchema.methods.generateAuthToken = async function(){
    try {
        const token = jwt.sign({_id:this._id.toString()},msz)
        this.tokens = this.tokens.concat({token:token})
        await this.save();
        return token
    } catch (error) {
        res.send(error);
        console.log(error)
    }
}

// Hashing Password 

studentSchema.pre("save", async function(next){
    if (!this.isModified('password')) return next();
    const passwordHash = await bcrypt.hash(this.password,10);
    console.log(passwordHash);
    this.password = await bcrypt.hash(this.password,10);
    next();
}) 

// creating new collection

const Student = new mongoose.model("Student", studentSchema);

module.exports = Student;