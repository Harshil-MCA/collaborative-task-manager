const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  testCaseId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: "Sprint", default: null },
  requirement: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  scenario: { type: String, required: true, trim: true, maxlength: 1000 },
  preconditions: { type: String, trim: true, maxlength: 3000, default: "" },
  steps: [{ type: String, trim: true, maxlength: 1000 }],
  testData: { type: String, trim: true, maxlength: 3000, default: "" },
  expectedResult: { type: String, required: true, trim: true, maxlength: 3000 },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

testCaseSchema.index({ project: 1, testCaseId: 1 }, { unique: true });
testCaseSchema.index({ requirement: 1, active: 1 });

module.exports = mongoose.model("TestCase", testCaseSchema);
