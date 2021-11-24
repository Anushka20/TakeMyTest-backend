const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
  id: {
    type: String,
  },
  name: {
    type: String,
  },
  duration: {
    type: Number,
  },
  startTime: {
    type: Date,
  },
  questions: {
    type: Map,
    of: new mongoose.Schema({
      statement: {
        type: String,
      },
      options: {
        type: Map,
        of: String,
      },
      answer: {
        type: String,
      },
    }),
  },
  results: {
    type: Map,
    of: String,
  },
});

const TestModel = new mongoose.model("TestModel", TestSchema);
module.exports = TestModel;
