
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    requirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      default: null,
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    dependsOn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    }],
    developmentStage: {
      type: String,
      enum: ["Backlog", "To Do", "In Progress", "Code Review", "Ready for QA", "Done", "Rework"],
      default: "Backlog",
    },
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    effortEstimateHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    loggedHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    qaRequired: {
      type: Boolean,
      default: false,
    },
    qaSignedOff: {
      type: Boolean,
      default: false,
    },
    blockers: [{
      description: { type: String, trim: true, maxlength: 500 },
      owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      resolvedAt: { type: Date, default: null },
    }],
    branchUrl: { type: String, trim: true, maxlength: 500, default: "" },
    pullRequestUrl: { type: String, trim: true, maxlength: 500, default: "" },
    commitUrl: { type: String, trim: true, maxlength: 500, default: "" },
    comments: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      body: { type: String, trim: true, maxlength: 2000 },
      createdAt: { type: Date, default: Date.now },
    }],
    timeLogs: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      hours: { type: Number, min: 0 },
      note: { type: String, trim: true, maxlength: 500 },
      loggedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

taskSchema.index({ createdBy: 1, updatedAt: -1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ sprint: 1, developmentStage: 1 });
taskSchema.index({ requirement: 1 });

module.exports = mongoose.model("Task", taskSchema);
