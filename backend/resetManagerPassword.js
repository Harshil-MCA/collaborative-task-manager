
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function resetPassword() {
  try {
    const email = "manager@example.com";

    const password = await new Promise((resolve) => {
      rl.question("Enter a new Manager password (minimum 12 characters): ", resolve);
    });

    if (password.length < 12 || password.length > 72) {
      throw new Error("Password must contain 12–72 characters.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Manager account not found.");
    }

    if (user.role !== "Manager") {
      throw new Error("This account does not have the Manager role.");
    }

    user.password = await bcrypt.hash(password, 12);
    await user.save();

    console.log("Manager password reset successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

resetPassword();
