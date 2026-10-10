const mongoose = require("mongoose");

const sprintSchema = new mongoose.Schema({
  sprintId: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  goal: { type: String, required: true, trim: true, maxlength: 200 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  state: { type: String, enum: ["Planned", "Active", "Closed"], default: "Planned" },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

sprintSchema.index({ project: 1, sprintId: 1 }, { unique: true });
sprintSchema.index({ project: 1, state: 1 });

module.exports = mongoose.model("Sprint", sprintSchema);
