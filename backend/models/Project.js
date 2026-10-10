const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  key: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
  description: { type: String, trim: true, maxlength: 3000, default: "" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

projectSchema.index({ key: 1 }, { unique: true });
projectSchema.index({ owner: 1, active: 1 });

module.exports = mongoose.model("Project", projectSchema);
