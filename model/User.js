const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  isStudent: {
    type: Boolean,
  },
  isTeacher: {
    type: Boolean,
  },
  enrolledClassroomIdName: {
    type: Array,
  },
  createdClassroomIdName: {
    type: Array,
  },
});

const UserModel = new mongoose.model("UserModel", UserSchema);
module.exports = UserModel;
