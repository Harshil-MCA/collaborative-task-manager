const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({
  requirementId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  acceptanceCriteria: { type: String, trim: true, maxlength: 5000, default: "" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Draft", "Approved", "In Development", "In QA", "Completed"], default: "Draft" },
  linkedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
}, { timestamps: true });

requirementSchema.index({ project: 1, requirementId: 1 }, { unique: true });
requirementSchema.index({ project: 1, status: 1 });

module.exports = mongoose.model("Requirement", requirementSchema);
