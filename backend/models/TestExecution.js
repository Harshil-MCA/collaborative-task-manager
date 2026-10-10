const mongoose = require("mongoose");

const testExecutionSchema = new mongoose.Schema({
  testCase: { type: mongoose.Schema.Types.ObjectId, ref: "TestCase", required: true },
  requirement: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  tester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buildVersion: { type: String, trim: true, maxlength: 100, default: "" },
  environment: { type: String, enum: ["Dev", "QA", "Production", "Staging"], required: true },
  executedAt: { type: Date, default: Date.now },
  actualResult: { type: String, trim: true, maxlength: 5000, default: "" },
  evidenceUrl: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: ["Not Run", "Pass", "Fail", "Blocked"], default: "Not Run" },
}, { timestamps: true });

testExecutionSchema.index({ testCase: 1, executedAt: -1 });
testExecutionSchema.index({ requirement: 1, status: 1 });

module.exports = mongoose.model("TestExecution", testExecutionSchema);
