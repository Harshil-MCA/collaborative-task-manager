
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const Activity = require("../models/Activity");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

const statuses = ["Pending", "In Progress", "Completed"];
const priorities = ["Low", "Medium", "High"];

function validId(id) {
  return mongoose.isValidObjectId(id);
}

async function logActivity(task, actor, action, details) {
  await Activity.create({
    task: task?._id || null,
    actor: actor._id,
    action,
    details,
    taskTitle: task?.title || "",
  });
}

// GET /api/tasks
// Managers see tasks they created; Users see tasks assigned to them.
router.get("/", async (req, res) => {
  try {
    const filter =
      req.user.role === "Manager"
        ? { createdBy: req.user._id }
        : { assignee: req.user._id };

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to retrieve tasks" });
  }
});

// GET /api/tasks/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const filter =
      req.user.role === "Manager"
        ? { createdBy: req.user._id }
        : { assignee: req.user._id };

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });

    const counts = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "Pending").length,
      inProgress: tasks.filter((t) => t.status === "In Progress").length,
      completed: tasks.filter((t) => t.status === "Completed").length,
    };

    res.json({ counts, tasks });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to load dashboard" });
  }
});

// GET /api/tasks/users — Managers only
router.get("/users", authorizeRoles("Manager"), async (req, res) => {
  try {
    const users = await User.find({ role: "User" })
      .select("name email")
      .sort({ name: 1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Unable to retrieve users" });
  }
});

// POST /api/tasks — Manager creates and assigns a task
router.post("/", authorizeRoles("Manager"), async (req, res) => {
  try {
    const {
      title,
      description = "",
      assignee,
      status = "Pending",
      priority = "Medium",
      dueDate = null,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      return res.status(400).json({ message: "Enter a valid task title" });
    }

    if (typeof description !== "string" || description.length > 3000) {
      return res.status(400).json({ message: "Invalid description" });
    }

    if (!validId(assignee)) {
      return res.status(400).json({ message: "Valid assignee required" });
    }

    if (!statuses.includes(status) || !priorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid status or priority" });
    }

    if (
      dueDate !== null &&
      (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({ message: "Invalid due date" });
    }

    const assignedUser = await User.findOne({
      _id: assignee,
      role: "User",
    });

    if (!assignedUser) {
      return res.status(400).json({
        message: "Assignee must be an existing User account",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignee: assignedUser._id,
      createdBy: req.user._id,
      status,
      priority,
      dueDate: dueDate || null,
    });

    await logActivity(
      task,
      req.user,
      "TASK_CREATED",
      `Task assigned to ${assignedUser.name}`
    );

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to create task" });
  }
});

// PATCH /api/tasks/:id/status
// Assigned User or task's Manager may update status.
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    if (!statuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const allowed =
      (req.user.role === "Manager" &&
        String(task.createdBy) === String(req.user._id)) ||
      (req.user.role === "User" &&
        String(task.assignee) === String(req.user._id));

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const previousStatus = task.status;
    task.status = status;
    await task.save();

    await logActivity(
      task,
      req.user,
      "STATUS_UPDATED",
      `Status changed from ${previousStatus} to ${status}`
    );

    res.json({ message: "Task status updated", task });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to update task status" });
  }
});

// PUT /api/tasks/:id — Manager edits a task they created
router.put("/:id", authorizeRoles("Manager"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found or you do not own it",
      });
    }

    const {
      title,
      description,
      assignee,
      status,
      priority,
      dueDate,
    } = req.body;

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 150
      ) {
        return res.status(400).json({ message: "Invalid title" });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length > 3000) {
        return res.status(400).json({ message: "Invalid description" });
      }
      task.description = description.trim();
    }

    if (assignee !== undefined) {
      if (!validId(assignee)) {
        return res.status(400).json({ message: "Invalid assignee ID" });
      }

      const user = await User.findOne({ _id: assignee, role: "User" });

      if (!user) {
        return res.status(400).json({ message: "Invalid User assignee" });
      }

      task.assignee = user._id;
    }

    if (status !== undefined) {
      if (!statuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      task.status = status;
    }

    if (priority !== undefined) {
      if (!priorities.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      if (
        dueDate !== null &&
        (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate)))
      ) {
        return res.status(400).json({ message: "Invalid due date" });
      }
      task.dueDate = dueDate || null;
    }

    await task.save();

    await logActivity(task, req.user, "TASK_UPDATED", "Task details updated");

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    res.json({
      message: "Task updated successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to update task" });
  }
});

// GET /api/tasks/:id/activity — authorized task participants only
router.get("/:id/activity", async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const allowed =
      (req.user.role === "Manager" &&
        String(task.createdBy) === String(req.user._id)) ||
      (req.user.role === "User" &&
        String(task.assignee) === String(req.user._id));

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const activities = await Activity.find({ task: task._id })
      .populate("actor", "name email role")
      .sort({ createdAt: -1 });

    res.json({ activities });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to retrieve task history" });
  }
});

// DELETE /api/tasks/:id — Manager deletes their own task
router.delete("/:id", authorizeRoles("Manager"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found or you do not own it",
      });
    }

    await logActivity(task, req.user, "TASK_DELETED", "Task deleted");

    // Keep activity history after the task itself is deleted.
    await Activity.updateMany(
      { task: task._id },
      { $set: { task: null } }
    );

    await task.deleteOne();

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Unable to delete task" });
  }
});

module.exports = router;
