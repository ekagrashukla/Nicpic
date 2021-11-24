const express = require("express");
const path = require("path");
require("./db/conn");
const Student = require('./models/register')
const hbs = require('hbs');
const formidable = require('formidable');
var fs = require('fs');
const request = require('request');
const { background } = require('jimp');
const Jimp = require('jimp');
const bcrypt = require('bcryptjs');
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken")
var config = require('../config.json');

const key = config.SECRET_KEY
const msz = config.SECRET_MESSAGE


const app = express();

const port = process.env.PORT || 3000;

const static_path = (path.join(__dirname, "../public"));
const template_path = (path.join(__dirname, "../templates/views"));
const partials_path = path.join(__dirname,"../templates/partials")

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:false}));

app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views", template_path);
hbs.registerPartials(partials_path);



const dir = 'output';
const input_image='public/test.jpg';
const bgs = ['./backgrounds/bg000.jpg','./backgrounds/bg001.jpg','./backgrounds/bg002.jpeg','./backgrounds/bg003.jpg',
    './backgrounds/bg004.jpg','./backgrounds/bg005.jpg','./backgrounds/bg006.jpg','./backgrounds/bg007.png',
    './backgrounds/bg008.jpeg']

let counter = 0

 
async function add_background_image(bg) {
    const image1 = await Jimp.read(bg);
    const image2 = await Jimp.read('public/output/No_bg/nobg.png');
        
    image1.cover(512,512)
    image2.cover(512,512)
    image1.blit(image2, 0, 0)
    .write('public/output/temp/' + counter + '.png');
    console.log('Image Background Added Successfully');
    counter+=1   
}

app.get("/",(req,res)=>{
    res.render("index")
});

app.get("/register", (req,res) => {
    res.render("register")
});

app.post('/fileupload', (req,res)=> {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var oldpath = files.filetoupload.filepath;
      var newpath = static_path +"/"+ "test.jpg"
      fs.rename(oldpath, newpath, async function (err) {
        if (err) throw err;

        request.post({
        url: 'https://api.remove.bg/v1.0/removebg',
        formData: {
        image_file: fs.createReadStream(input_image),
        size: 'auto',
        },
        headers: {
            "X-Api-Key" : key
        },
        encoding: null
    }, async function(error, response, body) {
        if(error) return console.error('Request failed:', error);
        if(response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
        fs.writeFileSync("public/output/No_bg/nobg.png", body)
        bgs.forEach(element => {
            add_background_image(element)
        }); 
        await new Promise(resolve => setTimeout(() => {res.render("displayImage")}, 3000));
         
    }); 
    });
    });
    
});

app.get("/image",(req,res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
    res.write('<input type="file" name="filetoupload"><br>');
    res.write('<input type="submit">');
    res.write('</form>');
    return res.end();
});

// Creating a new user

app.post("/register",async (req,res) => {
    try {
        console.log(req.body.username);
        const registerStudent = new Student({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            address: req.body.addr
        })

        const token = await registerStudent.generateAuthToken();
        console.log("Token-->"+token)

        res.cookie("jwt",token, {
            expires: new Date(Date.now()+3000),
            httpOnly:true
        })

        const reg = await registerStudent.save();
        res.status(201).send("Registration Successful!!! We'll contact you soon");
    } catch (e) {
        res.status(400).send(e);
    }
});

app.get("/login", (req,res) => {
    res.render("login")
});

app.post("/login", async (req,res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await Student.findOne({email:email});
        const isMatch = await bcrypt.compare(password, user.password)
        console.log(isMatch)
        if(isMatch){
            const token = await user.generateAuthToken();
            console.log("login auth token "+token);

            res.cookie("jwt",token, {
                expires: new Date(Date.now()+900000),//15 minutes
                httpOnly:true
            });
            res.status(201).render("index")
            console.log("login successful")
        }
        else{
            res.send("Wrong Credentials")
            console.log(user.password)
        }

    } catch (error) {
        console.log(error)
        res.status(400).send("Invalid email")
    }
});

app.get("/secret", auth ,async (req,res)=>{
    console.log("Cookie here => "+req.cookies.jwt)
    const vu = jwt.verify(req.cookies.jwt, msz)
    const data = await Student.findOne({_id:vu._id})
    // console.log(data)
    res.render("secret",{cook: req.cookies.jwt, uname:data.username, email:data.email, addr:data.address})
})

app.get("/logout", auth, async(req,res) => {
    try {
        console.log(req.user)
        req.user.tokens = req.user.tokens.filter((currElement) => {
            return currElement.token != req.token
        })
        res.clearCookie("jwt");
        console.log("logout successfully")
        await req.user.save()
        res.render("index")
    } catch (error) {
        res.status(500).send(error) 
    }
})

app.listen(port, () => {
    console.log("Express Running")
})