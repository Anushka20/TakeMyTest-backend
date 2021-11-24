const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");

// for environment variables
require("dotenv").config();
// create express app
const app = express();
// set middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var corsOptions = {
  origin: process.env.FRONTEND,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// connect to database
mongoose.connect(process.env.DB_CONNECTION_STRING, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("Successfully connected to mongoDB");
});
// require models
const TestModel = require("./model/Test");
const ClassroomModel = require("./model/Classroom");
const UserModel = require("./model/User");

// urls
app.get("/", (req, res) => {
  res.send(`Server is running on port : ${process.env.SERVER_PORT}`);
});
app.post("/register", (req, res) => {
  var userData = req.body.userData;
  if (userData) {
    var email = userData.email;
    var password = userData.password;
    UserModel.findOne({ email: email }, (err, user) => {
      if (err) {
        res.json({
          staus: 500,
          message: err,
        });
      } else if (user) {
        // user already registered
        res.json({
          status: 200,
          message: "User already registered, please login",
        });
      } else {
        var newUser = new UserModel({
          email: email,
          password: password,
          name: userData.name,
          isStudent: userData.profession == "student",
          isTeacher: userData.profession == "teacher",
          enrolledClassroomIdName: new Array(),
          createdClassroomIdName: new Array(),
        });
        newUser.save((err) => {
          if (err) {
            res.json({
              status: 500,
              message: err,
            });
          } else {
            const token = jwt.sign({ newUser }, process.env.SECRET_KEY);
            res.json({
              status: 200,
              token: token,
              message: "User registered successfully",
            });
          }
        });
      }
    });
  } else {
    res.json({
      status: 500,
      message: "Enter user data to register",
    });
  }
});
app.post("/login", (req, res) => {
  var userData = req.body.userData;
  if (userData) {
    var email = userData.email;
    var password = userData.password;
    UserModel.findOne({ email: email }, (err, user) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else if (user) {
        // check password
        if (user.password === password) {
          const token = jwt.sign({ user }, process.env.SECRET_KEY);
          res.json({
            status: 200,
            token: token,
            message: "User logged in successfully",
          });
        } else {
          res.json({
            status: 500,
            message: "Password is incorrect",
          });
        }
      } else {
        res.json({
          status: 500,
          message: "User not registered, please register",
        });
      }
    });
  } else {
    res.json({
      status: 500,
      message: "Enter user data to login",
    });
  }
});

app.listen(process.env.SERVER_PORT, () => {
  console.log(`Server is running on port : ${process.env.SERVER_PORT}`);
});
