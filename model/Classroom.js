const mongoose = require("mongoose");

const ClassroomSchema = new mongoose.Schema({
  id: {
    type: String,
  },
  name: {
    type: String,
  },
  createdBy: {
    type: String,
  },
  studentEnrolled: {
    type: Array,
  },
  testId: {
    type: Array,
  },
});

const ClassroomModel = new mongoose.model("ClassroomModel", ClassroomSchema);

module.exports = ClassroomModel;
