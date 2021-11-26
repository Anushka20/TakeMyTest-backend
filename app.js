const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
// for environment variables
require("dotenv").config();
// connect to database
// useFindAndModify : false ----------> to avoid warning in findOneAndUpdate()
mongoose.connect(process.env.DB_CONNECTION_STRING, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("Successfully connected to mongoDB");
});

// require models
const User = require("./model/User");
const Classroom = require("./model/Classroom");
const TestModel = require("./model/Test");
const ClassroomModel = require("./model/Classroom");
const UserModel = require("./model/User");

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

// middlewares
// function to ensure that token is present
function ensureToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    // token is present
    const bearer = bearerHeader.split(" ");
    const beaderToken = bearer[1];
    req.token = beaderToken;
    next();
  } else {
    // token is absent
    res.sendStatus(401);
  }
}

// function to verify token
function verifyToken(req, res, next) {
  jwt.verify(req.token, process.env.SECRET_KEY, (err, decodedToken) => {
    if (err) {
      // token not verified
      res.sendStatus(401);
    } else {
      // token verified
      // get user email
      if (decodedToken.newUser) {
        req.userEmail = decodedToken.newUser.email;
        req.userIsStudent = decodedToken.newUser.isStudent;
        req.userIsTeacher = decodedToken.newUser.isTeacher;
      } else {
        req.userEmail = decodedToken.user.email;
        req.userIsStudent = decodedToken.user.isStudent;
        req.userIsTeacher = decodedToken.user.isTeacher;
      }
      UserModel.findOne({ email: req.userEmail }, (err, user) => {
        if (err) {
          res.sendStatus(401);
        } else if (user) {
          next();
        } else {
          res.sendStatus(401);
        }
      });
    }
  });
}

// function to authorize student
function authorizeStudent(req, res, next) {
  if (req.userIsStudent) {
    next();
  } else res.sendStatus(403);
}
// function to authorize teacher
function authorizeTeacher(req, res, next) {
  if (req.userIsTeacher) {
    next();
  } else res.sendStatus(403);
}

// utility function
function generateUniqueCode(n) {
  var add = 1,
    max = 12 - add;
  if (n > max) {
    return generate(max) + generate(n - max);
  }

  max = Math.pow(10, n + add);
  var min = max / 10;
  var number = Math.floor(Math.random() * (max - min + 1)) + min;

  return ("" + number).substring(add);
}

function getRandomTheme() {
  var themes = ["green", "blue", "red", "orange"];
  var i = (Math.random() * themes.length) | 0;
  return themes[i];
}

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
          status: 500,
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

// fetch user data
app.get("/fetchUserData", ensureToken, verifyToken, (req, res) => {
  var email = req.userEmail;
  User.findOne({ email: email }, (err, user) => {
    if (err) {
      res.json({
        status: 500,
        message: err,
      });
    } else if (user) {
      res.json({
        status: 200,
        userData: {
          name: user.name,
          email: user.email,
          isStudent: user.isStudent,
          isTeacher: user.isTeacher,
          enrolledClassroomIdName: user.enrolledClassroomIdName,
          createdClassroomIdName: user.createdClassroomIdName,
        },
      });
    }
  });
});

// create classroom
app.post(
  "/createClassroom",
  ensureToken,
  verifyToken,
  authorizeTeacher,
  (req, res) => {
    var classroomData = req.body.classroomData;
    classroomData.createdBy = req.userEmail;
    classroomData.studentEnrolled = new Array() < String > {};
    classroomData.testId = new Array() < String > {};
    classroomData.id = generateUniqueCode(6);
    var newClassroom = new ClassroomModel(classroomData);
    newClassroom.save((err) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else {
        // add classroom to teacher's classroom list
        UserModel.findOne({ email: req.userEmail }, (err, user) => {
          if (err) {
            res.json({
              status: 500,
              message: err,
            });
          } else if (user) {
            user.createdClassroomIdName.push({
              id: newClassroom.id,
              name: newClassroom.name,
              theme: getRandomTheme(),
            });
            user.save((err) => {
              if (err) {
                res.json({
                  status: 500,
                  message: err,
                });
              } else {
                res.json({
                  status: 200,
                  message: "Successfully created classroom",
                });
              }
            });
          }
        });
      }
    });
  }
);

// join classroom
app.post(
  "/joinClassroom",
  ensureToken,
  verifyToken,
  authorizeStudent,
  (req, res) => {
    var classroomData = req.body.classroomData;
    ClassroomModel.findOne({ id: classroomData.id }, (err, classroom) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else if (classroom) {
        classroom.studentEnrolled.push(req.userEmail);
        classroom.save((err) => {
          if (err) {
            res.json({
              status: 500,
              message: err,
            });
          } else {
            // add classroom to student's enrolledClassroomIdName
            UserModel.findOne({ email: req.userEmail }, (err, user) => {
              if (err) {
                res.json({
                  status: 500,
                  message: err,
                });
              } else if (user) {
                user.enrolledClassroomIdName.push({
                  id: classroom.id,
                  name: classroom.name,
                  theme: getRandomTheme(),
                });
                user.save((err) => {
                  if (err) {
                    res.json({
                      status: 500,
                      message: err,
                    });
                  } else {
                    res.json({
                      status: 200,
                      message: "Class joined successfully",
                    });
                  }
                });
              }
            });
          }
        });
      } else {
        res.json({
          status: 500,
          message: "Classroom not found",
        });
      }
    });
  }
);

// create test
app.post(
  "/createTest",
  ensureToken,
  verifyToken,
  authorizeTeacher,
  (req, res) => {
    var test = req.body.test;
    var questions = new Map();
    for (var i = 0; i < test.questions.length; i++) {
      questions.set(i.toString(), test.questions[i]);
    }
    var testObj = {
      questions: questions,
      duration: test.duration,
      startTime: test.startTime,
      name: test.name,
      id: generateUniqueCode(6),
      results: {},
    };
    var newTest = new TestModel(testObj);
    newTest.save((err) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else {
        ClassroomModel.findOne({ id: req.body.classroom }, (err, classroom) => {
          if (err) {
            res.json({
              status: 500,
              message: err,
            });
          } else {
            classroom.testId.push(newTest.id);
            classroom.save((err) => {
              if (err) {
                res.json({
                  status: 500,
                  message: err,
                });
              } else {
                res.json({
                  status: 200,
                  message: "Test added successfully",
                });
              }
            });
          }
        });
      }
    });
  }
);
// get all test
app.get("/fetchAllTestInClassroom", ensureToken, verifyToken, (req, res) => {
  ClassroomModel.findOne({ id: req.query.classroomId }, (err, classroom) => {
    if (err) {
      res.json({
        status: 500,
        message: err,
      });
    } else if (classroom) {
      // get all tests
      var classroomTests = classroom.testId;
      var testData = [];
      TestModel.find({}, (err, allTests) => {
        if (err) {
        } else if (allTests) {
          var count = 0;
          for (var i in allTests) {
            if (classroomTests.includes(allTests[i].id)) {
              testData.push(allTests[i]);
            }
            count++;
            if (count == allTests.length) {
              res.json({
                status: 200,
                test: testData,
              });
            }
          }
        }
      });
    } else {
      res.json({
        status: 500,
        message: "No classroom",
      });
    }
  });
});

// get particular test
app.get(
  "/fetchTest",
  ensureToken,
  verifyToken,
  authorizeStudent,
  (req, res) => {
    var testId = req.query.testId;
    TestModel.findOne({ id: testId }, (err, test) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else if (test) {
        res.json({
          status: 200,
          test: test,
        });
      }
    });
  }
);

// get score
app.post(
  "/submitTest",
  ensureToken,
  verifyToken,
  authorizeStudent,
  (req, res) => {
    TestModel.findOne({ id: req.body.testId }, (err, test) => {
      if (err) {
        res.json({
          status: 500,
          message: err,
        });
      } else {
        var correctAnswers = {};
        test.questions.forEach((value, key) => {
          correctAnswers[key] = value.answer;
        });
        var userAnswers = req.body.answers;
        var correctAnswersCount = 0;
        var totalAnswers = 0;
        Object.keys(userAnswers).map((value, index) => {
          if (userAnswers[value] == correctAnswers[value]) {
            correctAnswersCount++;
          }
          totalAnswers++;
        });
        test.results.set(
          req.userEmail.split(".")[0],
          correctAnswersCount.toString() + "/" + totalAnswers.toString()
        );
        test.save((err) => {
          if (err) {
            res.json({
              status: 500,
              message: err,
            });
          } else {
            res.json({
              status: 200,
              score:
                correctAnswersCount.toString() + "/" + totalAnswers.toString(),
            });
          }
        });
      }
    });
  }
);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port : ${process.env.PORT}`);
});
