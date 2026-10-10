
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createManager() {
  try {
    const name = process.env.MANAGER_NAME;
    const email = process.env.MANAGER_EMAIL?.trim().toLowerCase();
    const password = process.env.MANAGER_PASSWORD;

    if (!name || !email || !password || password.length < 12) {
      throw new Error(
        "Set MANAGER_NAME, MANAGER_EMAIL and a password of at least 12 characters in .env"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email });

    if (existing) {
      console.log("An account already exists for this email.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Manager",
    });

    console.log(`Manager account created: ${email}`);
  } catch (error) {
    console.error("Manager setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createManager();
