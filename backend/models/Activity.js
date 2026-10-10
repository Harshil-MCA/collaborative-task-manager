
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    taskTitle: {
      type: String,
      default: "",
    },
    entityType: {
      type: String,
      enum: ["Task", "User", "Project", "Requirement", "Sprint", "TestCase", "TestExecution", "Bug", "Release"],
      default: "Task",
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
