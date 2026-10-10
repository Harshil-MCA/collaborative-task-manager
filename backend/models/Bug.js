const mongoose = require("mongoose");

const bugSchema = new mongoose.Schema({
  bugId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  requirement: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", default: null },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  testCase: { type: mongoose.Schema.Types.ObjectId, ref: "TestCase", default: null },
  testExecution: { type: mongoose.Schema.Types.ObjectId, ref: "TestExecution", default: null },
  summary: { type: String, required: true, trim: true, maxlength: 300 },
  reproductionSteps: { type: String, required: true, trim: true, maxlength: 5000 },
  expectedResult: { type: String, required: true, trim: true, maxlength: 3000 },
  actualResult: { type: String, required: true, trim: true, maxlength: 3000 },
  severity: { type: String, enum: ["Minor", "Major", "Critical", "Blocker"], default: "Major" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  environment: { type: String, trim: true, maxlength: 100, default: "" },
  assignedDeveloper: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  evidenceUrl: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: ["Open", "Assigned", "In Progress", "Fixed", "Ready for Retest", "Closed", "Reopened"], default: "Open" },
  fixNotes: { type: String, trim: true, maxlength: 5000, default: "" },
  pullRequestUrl: { type: String, trim: true, maxlength: 500, default: "" },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  lastRetestPassed: { type: Boolean, default: false },
}, { timestamps: true });

bugSchema.index({ project: 1, bugId: 1 }, { unique: true });
bugSchema.index({ task: 1, status: 1 });
bugSchema.index({ assignedDeveloper: 1, status: 1 });

module.exports = mongoose.model("Bug", bugSchema);
