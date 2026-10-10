const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
}, { _id: false });

const releaseSchema = new mongoose.Schema({
  version: { type: String, required: true, trim: true, maxlength: 50 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  status: { type: String, enum: ["Draft", "Ready", "Released"], default: "Draft" },
  approvals: {
    Dev: { type: approvalSchema, default: () => ({}) },
    QA: { type: approvalSchema, default: () => ({}) },
    Production: { type: approvalSchema, default: () => ({}) },
  },
  readiness: { type: Boolean, default: false },
}, { timestamps: true });

releaseSchema.index({ project: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("Release", releaseSchema);
