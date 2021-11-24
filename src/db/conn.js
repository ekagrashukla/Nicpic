const mongoose = require('mongoose');
const express = require('express');
var config = require('../../config.json');

const uri = config.SECRET_URI

mongoose.connect(uri)
.then(()=>console.log("Connection to StudentAPI Database Successful.."))
.catch((err)=>console.log(err));