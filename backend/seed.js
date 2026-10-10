require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("Missing " + name + " in backend/.env");
  }
  return value;
}

async function ensureUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    console.log(role + " already exists: " + normalizedEmail);
    return existing;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
  });

  console.log(role + " created: " + normalizedEmail);
  return user;
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in backend/.env");
  }

  const manager = await ensureUser({
    name: required("SEED_MANAGER_NAME"),
    email: required("SEED_MANAGER_EMAIL"),
    password: required("SEED_MANAGER_PASSWORD"),
    role: "Manager",
  });

  await ensureUser({
    name: required("SEED_USER_NAME"),
    email: required("SEED_USER_EMAIL"),
    password: required("SEED_USER_PASSWORD"),
    role: "User",
  });

  const optionalRoles = [
    ["SEED_PROJECT_MANAGER_NAME", "SEED_PROJECT_MANAGER_EMAIL", "SEED_PROJECT_MANAGER_PASSWORD", "Project Manager"],
    ["SEED_DEVELOPER_NAME", "SEED_DEVELOPER_EMAIL", "SEED_DEVELOPER_PASSWORD", "Developer"],
    ["SEED_QA_NAME", "SEED_QA_EMAIL", "SEED_QA_PASSWORD", "QA Tester"],
  ];

  for (const [nameKey, emailKey, passwordKey, role] of optionalRoles) {
    if (process.env[nameKey] && process.env[emailKey] && process.env[passwordKey]) {
      await ensureUser({
        name: required(nameKey),
        email: required(emailKey),
        password: required(passwordKey),
        role,
      });
    }
  }

  console.log("Seed complete. Existing records were preserved. Manager id: " + manager._id);
}

seed()
  .catch(error => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
