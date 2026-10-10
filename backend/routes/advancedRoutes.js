const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const Requirement = require("../models/Requirement");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const TestCase = require("../models/TestCase");
const TestExecution = require("../models/TestExecution");
const Bug = require("../models/Bug");
const Release = require("../models/Release");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

const managerRoles = ["Manager", "Project Manager"];
const deliveryRoles = ["Manager", "Project Manager", "Developer"];
const qaRoles = ["Manager", "Project Manager", "QA Tester"];
const id = value => mongoose.isValidObjectId(value);
const same = (a, b) => String(a) === String(b);

function bodyString(value, max, required = false) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    return null;
  }
  return value.trim();
}

async function log(actor, entityType, entity, action, previousValue = null, newValue = null, details = "") {
  await Activity.create({
    actor: actor._id,
    entityType,
    entityId: entity?._id || null,
    task: entityType === "Task" ? entity?._id : null,
    taskTitle: entityType === "Task" ? entity?.title || "" : "",
    action,
    details,
    previousValue,
    newValue,
  });
}

async function projectFor(req, projectId) {
  if (!id(projectId)) return null;
  const project = await Project.findById(projectId);
  if (!project) return null;
  const memberAccess = managerRoles.includes(req.user.role) ||
    same(project.owner, req.user._id) ||
    project.members.some(member => same(member, req.user._id));
  if (memberAccess) return project;
  if (req.user.role === "QA Tester" && (
    await TestCase.exists({ project: project._id, active: true }) ||
    await Bug.exists({ project: project._id, status: "Ready for Retest" })
  )) return project;
  return null;
}

async function qaVisibleProjectIds() {
  const [testCaseProjects, retestProjects] = await Promise.all([
    TestCase.find({ active: true }).distinct("project"),
    Bug.find({ status: "Ready for Retest" }).distinct("project"),
  ]);
  return [...new Set([...testCaseProjects, ...retestProjects].map(String))]
    .map(value => new mongoose.Types.ObjectId(value));
}

function validDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf()) && start <= end;
}

const requirementTransitions = {
  Draft: ["Approved"],
  Approved: ["In Development"],
  "In Development": ["In QA"],
  "In QA": ["Completed", "In Development"],
  Completed: ["In Development"],
};

const developmentTransitions = {
  Backlog: ["To Do"],
  "To Do": ["In Progress", "Backlog"],
  "In Progress": ["Code Review", "Rework"],
  "Code Review": ["Ready for QA", "In Progress"],
  "Ready for QA": ["Done", "Rework"],
  Rework: ["In Progress"],
  Done: ["Rework"],
};

const bugTransitions = {
  Open: ["Assigned", "In Progress"],
  Assigned: ["In Progress"],
  "In Progress": ["Fixed"],
  Fixed: ["Ready for Retest"],
  "Ready for Retest": ["Closed", "Reopened"],
  Reopened: ["Assigned", "In Progress"],
  Closed: ["Reopened"],
};

// Advanced users are managed by Managers/Project Managers; passwords are never returned.
router.get("/advanced/users", authorizeRoles(...managerRoles), async (req, res) => {
  const filter = req.query.mode === "promotion" ? { role: "User" } : req.query.mode === "all" ? {} : { role: "Developer" };
  const users = await User.find(filter)
    .select("name email role").sort({ name: 1 });
  res.json({ users });
});

router.patch("/advanced/users/:id/role", authorizeRoles(...managerRoles), async (req, res) => {
  if (!id(req.params.id)) return res.status(400).json({ message: "Invalid user ID" });
  if (!["User", "Developer", "QA Tester"].includes(req.body.role)) {
    return res.status(400).json({ message: "Role must be User, Developer or QA Tester" });
  }
  if (same(req.params.id, req.user._id)) return res.status(403).json({ message: "You cannot change your own role" });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User account not found" });
  if (["Manager", "Project Manager"].includes(user.role)) {
    return res.status(403).json({ message: "Manager privileges cannot be changed here" });
  }
  const previousRole = user.role;
  user.role = req.body.role;
  await user.save();
  await log(req.user, "User", user, "USER_ROLE_CHANGED", previousRole, user.role);
  res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

router.patch("/advanced/users/:id/promote-developer", authorizeRoles(...managerRoles), async (req, res) => {
  if (!id(req.params.id)) return res.status(400).json({ message: "Invalid user ID" });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User account not found" });
  if (user.role !== "User") return res.status(400).json({ message: "Only User accounts can be promoted" });
  const previousRole = user.role;
  user.role = "Developer";
  await user.save();
  await log(req.user, "User", user, "USER_ROLE_CHANGED", previousRole, user.role);
  res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

// Projects
router.get("/projects", async (req, res) => {
  let filter;
  if (managerRoles.includes(req.user.role)) {
    filter = {};
  } else if (req.user.role === "Developer") {
    const [taskProjects, bugProjects] = await Promise.all([
      Task.find({ $or: [{ developer: req.user._id }, { assignee: req.user._id }] }).distinct("project"),
      Bug.find({ assignedDeveloper: req.user._id }).distinct("project"),
    ]);
    filter = { $or: [{ owner: req.user._id }, { members: req.user._id }, { _id: { $in: [...taskProjects, ...bugProjects] } }] };
  } else if (req.user.role === "QA Tester") {
    filter = { $or: [{ owner: req.user._id }, { members: req.user._id }, { _id: { $in: await qaVisibleProjectIds() } }] };
  } else {
    filter = { $or: [{ owner: req.user._id }, { members: req.user._id }] };
  }
  const projects = await Project.find(filter).populate("owner members", "name email role").sort({ updatedAt: -1 });
  res.json({ projects });
});

router.post("/projects", authorizeRoles(...managerRoles), async (req, res) => {
  const name = bodyString(req.body.name, 150, true);
  const key = bodyString(req.body.key, 12, true);
  const description = bodyString(req.body.description || "", 3000);
  if (!name || !key || !description) return res.status(400).json({ message: "Valid project name, key and description are required" });
  try {
    const project = await Project.create({
      name, key, description,
      owner: req.user._id,
      members: Array.isArray(req.body.members) ? req.body.members.filter(id) : [],
    });
    await log(req.user, "Project", project, "PROJECT_CREATED");
    res.status(201).json({ project });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Project key already exists" });
    res.status(500).json({ message: "Unable to create project" });
  }
});

router.get("/projects/:id", async (req, res) => {
  const project = await projectFor(req, req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found or access denied" });
  const [requirements, sprints, tasks] = await Promise.all([
    Requirement.find({ project: project._id }).sort({ requirementId: 1 }),
    Sprint.find({ project: project._id }).sort({ startDate: -1 }),
    Task.find({ project: project._id }).populate("assignee developer", "name email role").sort({ updatedAt: -1 }),
  ]);
  res.json({ project, requirements, sprints, tasks });
});

router.put("/projects/:id", authorizeRoles(...managerRoles), async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found or access denied" });
  if (req.body.name !== undefined) project.name = bodyString(req.body.name, 150, true);
  if (req.body.description !== undefined) project.description = bodyString(req.body.description, 3000);
  if (Array.isArray(req.body.members)) project.members = req.body.members.filter(id);
  if (!project.name || project.description === null) return res.status(400).json({ message: "Invalid project details" });
  await project.save();
  await log(req.user, "Project", project, "PROJECT_UPDATED");
  res.json({ project });
});

// Requirements and traceability
router.get("/requirements", async (req, res) => {
  const project = await projectFor(req, req.query.project);
  if (!project) return res.status(403).json({ message: "Project access denied" });
  const requirements = await Requirement.find({ project: project._id })
    .populate("owner", "name email role").populate("linkedTasks", "title developmentStage");
  const testCases = await TestCase.find({ project: project._id, active: true }).select("requirement testCaseId");
  const covered = new Set(testCases.map(item => String(item.requirement)));
  res.json({ requirements, missingTestCoverage: requirements.filter(item => !covered.has(String(item._id))) });
});

router.post("/requirements", authorizeRoles(...managerRoles), async (req, res) => {
  const project = await projectFor(req, req.body.project);
  const requirementId = bodyString(req.body.requirementId, 40, true);
  const title = bodyString(req.body.title, 200, true);
  const description = bodyString(req.body.description, 5000, true);
  if (!project || !requirementId || !title || !description) return res.status(400).json({ message: "Project and requirement details are required" });
  try {
    const requirement = await Requirement.create({
      requirementId, project: project._id, title, description,
      acceptanceCriteria: bodyString(req.body.acceptanceCriteria || "", 5000),
      priority: req.body.priority || "Medium",
      owner: id(req.body.owner) ? req.body.owner : req.user._id,
    });
    await log(req.user, "Requirement", requirement, "REQUIREMENT_CREATED");
    res.status(201).json({ requirement });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Requirement ID already exists in this project" });
    res.status(500).json({ message: "Unable to create requirement" });
  }
});

router.patch("/requirements/:id/status", authorizeRoles(...managerRoles), async (req, res) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement || !(await projectFor(req, requirement.project))) return res.status(404).json({ message: "Requirement not found or access denied" });
  const next = req.body.status;
  if (!requirementTransitions[requirement.status]?.includes(next)) return res.status(400).json({ message: "Invalid requirement transition" });
  const previous = requirement.status;
  requirement.status = next;
  await requirement.save();
  await log(req.user, "Requirement", requirement, "REQUIREMENT_STATUS_CHANGED", previous, next);
  res.json({ requirement });
});

router.post("/requirements/:id/link-task", authorizeRoles(...managerRoles), async (req, res) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement || !(await projectFor(req, requirement.project)) || !id(req.body.task)) return res.status(404).json({ message: "Requirement or task not found" });
  const task = await Task.findOne({ _id: req.body.task, project: requirement.project });
  if (!task) return res.status(404).json({ message: "Task does not belong to the project" });
  task.requirement = requirement._id;
  await task.save();
  if (!requirement.linkedTasks.some(item => same(item, task._id))) requirement.linkedTasks.push(task._id);
  await requirement.save();
  await log(req.user, "Task", task, "TASK_REQUIREMENT_LINKED", null, requirement._id);
  res.json({ requirement, task });
});

// Sprints and allocation
router.get("/sprints", async (req, res) => {
  const project = await projectFor(req, req.query.project);
  if (!project) return res.status(403).json({ message: "Project access denied" });
  const sprints = await Sprint.find({ project: project._id }).sort({ startDate: -1 });
  res.json({ sprints });
});

router.post("/sprints", authorizeRoles(...managerRoles), async (req, res) => {
  const project = await projectFor(req, req.body.project);
  if (!project || !bodyString(req.body.sprintId, 40, true) || !bodyString(req.body.goal, 200, true) || !validDateRange(req.body.startDate, req.body.endDate)) {
    return res.status(400).json({ message: "Valid project, sprint ID, goal and date range are required" });
  }
  try {
    const sprint = await Sprint.create({
      sprintId: req.body.sprintId, project: project._id, goal: req.body.goal,
      startDate: req.body.startDate, endDate: req.body.endDate, state: req.body.state || "Planned",
    });
    await log(req.user, "Sprint", sprint, "SPRINT_CREATED");
    res.status(201).json({ sprint });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Sprint ID already exists in this project" });
    res.status(500).json({ message: "Unable to create sprint" });
  }
});

router.patch("/sprints/:id/state", authorizeRoles(...managerRoles), async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint || !(await projectFor(req, sprint.project))) return res.status(404).json({ message: "Sprint not found or access denied" });
  if (!["Planned", "Active", "Closed"].includes(req.body.state)) return res.status(400).json({ message: "Invalid sprint state" });
  if (req.body.state === "Closed") {
    const unfinished = await Task.countDocuments({ sprint: sprint._id, developmentStage: { $ne: "Done" } });
    if (unfinished) return res.status(409).json({ message: "Sprint has unfinished tasks" });
    sprint.closedAt = new Date();
  }
  const previous = sprint.state;
  sprint.state = req.body.state;
  await sprint.save();
  await log(req.user, "Sprint", sprint, "SPRINT_STATE_CHANGED", previous, sprint.state);
  res.json({ sprint });
});

router.patch("/tasks/:id/allocation", authorizeRoles(...managerRoles), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || (task.project && !(await projectFor(req, task.project)))) return res.status(404).json({ message: "Task not found or access denied" });
  if (req.body.developer !== undefined) {
    if (req.body.developer !== null && !id(req.body.developer)) return res.status(400).json({ message: "Invalid developer" });
    if (req.body.developer && !(await User.exists({ _id: req.body.developer, role: "Developer" }))) {
      return res.status(400).json({ message: "Developer must be a Developer account" });
    }
  }
  const fields = ["project", "requirement", "sprint", "parentTask", "developer", "priority", "dueDate", "effortEstimateHours", "qaRequired", "branchUrl", "pullRequestUrl", "commitUrl"];
  const previous = {};
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      previous[field] = task[field];
      task[field] = req.body[field];
    }
  });
  await task.save();
  await log(req.user, "Task", task, "TASK_ALLOCATION_UPDATED", previous, req.body);
  res.json({ task });
});

router.patch("/tasks/:id/workflow", authorizeRoles(...deliveryRoles), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  const canEdit = managerRoles.includes(req.user.role) || same(task.developer, req.user._id) || same(task.assignee, req.user._id);
  if (!canEdit) return res.status(403).json({ message: "Access denied" });
  const next = req.body.developmentStage;
  if (!developmentTransitions[task.developmentStage]?.includes(next)) return res.status(400).json({ message: "Invalid development transition" });
  if (next === "Done" && task.qaRequired) {
    if (!task.qaSignedOff) return res.status(409).json({ message: "QA sign-off is required before this task can be Done" });
    const passed = task.requirement && await TestExecution.exists({ task: task._id, status: "Pass" });
    const blocking = await Bug.exists({ task: task._id, severity: "Blocker", status: { $nin: ["Closed"] } });
    if (!passed || blocking) return res.status(409).json({ message: "Required QA pass and resolved blocker checks are not satisfied" });
  }
  const previous = task.developmentStage;
  task.developmentStage = next;
  await task.save();
  await log(req.user, "Task", task, "TASK_STAGE_CHANGED", previous, next);
  res.json({ task });
});

router.post("/tasks/:id/comments", authorizeRoles(...deliveryRoles, "QA Tester"), async (req, res) => {
  const body = bodyString(req.body.body, 2000, true);
  if (!body) return res.status(400).json({ message: "Comment body is required" });
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  task.comments.push({ author: req.user._id, body });
  await task.save();
  await log(req.user, "Task", task, "TASK_COMMENT_ADDED", null, body);
  res.status(201).json({ comment: task.comments[task.comments.length - 1] });
});

router.post("/tasks/:id/time", authorizeRoles(...deliveryRoles), async (req, res) => {
  const hours = Number(req.body.hours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return res.status(400).json({ message: "Hours must be between 0 and 24" });
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  task.timeLogs.push({ user: req.user._id, hours, note: bodyString(req.body.note || "", 500) });
  task.loggedHours += hours;
  await task.save();
  await log(req.user, "Task", task, "TASK_TIME_LOGGED", null, hours);
  res.status(201).json({ task });
});

router.get("/tasks/export.csv", async (req, res) => {
  const filter = managerRoles.includes(req.user.role)
    ? { createdBy: req.user._id }
    : { assignee: req.user._id };
  const tasks = await Task.find(filter).populate("assignee", "name email").sort({ updatedAt: -1 });
  const escape = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const rows = [
    ["Title", "Status", "Development Stage", "Priority", "Assignee", "Due Date"],
    ...tasks.map(task => [
      task.title, task.status, task.developmentStage, task.priority,
      task.assignee?.email || "", task.dueDate ? task.dueDate.toISOString() : "",
    ]),
  ];
  res.type("text/csv").send(rows.map(row => row.map(escape).join(",")).join("\\n"));
});

router.post("/sprints/:id/carry-forward", authorizeRoles(...managerRoles), async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint || !(await projectFor(req, sprint.project))) return res.status(404).json({ message: "Sprint not found or access denied" });
  const result = await Task.updateMany(
    { sprint: sprint._id, developmentStage: { $ne: "Done" } },
    { $set: { sprint: null } },
  );
  await log(req.user, "Sprint", sprint, "SPRINT_WORK_CARRIED_FORWARD", sprint._id, null, String(result.modifiedCount) + " tasks moved to backlog");
  res.json({ carriedForward: result.modifiedCount });
});

// QA test cases
router.get("/qa/queue", authorizeRoles(...qaRoles), async (req, res) => {
  let projectFilter = {};
  if (req.user.role === "QA Tester") {
    projectFilter = { $or: [{ owner: req.user._id }, { members: req.user._id }, { _id: { $in: await qaVisibleProjectIds() } }] };
  } else if (!managerRoles.includes(req.user.role)) {
    projectFilter = { $or: [{ owner: req.user._id }, { members: req.user._id }] };
  }
  const projects = await Project.find(projectFilter).select("_id");
  const tasks = await Task.find({
    developmentStage: "Ready for QA",
    project: { $in: projects.map(project => project._id) },
  })
    .populate("project requirement sprint developer", "name key requirementId sprintId email");
  res.json({ tasks });
});

router.get("/qa/test-cases", authorizeRoles(...qaRoles), async (req, res) => {
  const filter = {};
  if (id(req.query.project)) filter.project = req.query.project;
  if (id(req.query.requirement)) filter.requirement = req.query.requirement;
  if (req.query.project && !(await projectFor(req, req.query.project))) return res.status(403).json({ message: "Project access denied" });
  if (!req.query.project && req.user.role === "QA Tester") filter.project = { $in: await qaVisibleProjectIds() };
  const testCases = await TestCase.find(filter).populate("requirement project task", "requirementId name title");
  res.json({ testCases });
});

router.post("/qa/test-cases", authorizeRoles(...qaRoles), async (req, res) => {
  const project = await projectFor(req, req.body.project);
  if (!project || !id(req.body.requirement) || !bodyString(req.body.testCaseId, 40, true) || !bodyString(req.body.scenario, 1000, true) || !bodyString(req.body.expectedResult, 3000, true)) {
    return res.status(400).json({ message: "Project, requirement and test case details are required" });
  }
  const requirement = await Requirement.findOne({ _id: req.body.requirement, project: project._id });
  if (!requirement) return res.status(400).json({ message: "Requirement does not belong to project" });
  try {
    const testCase = await TestCase.create({
      testCaseId: req.body.testCaseId, project: project._id, requirement: requirement._id,
      sprint: id(req.body.sprint) ? req.body.sprint : null, task: id(req.body.task) ? req.body.task : null,
      scenario: req.body.scenario, preconditions: req.body.preconditions || "",
      steps: Array.isArray(req.body.steps) ? req.body.steps : [], testData: req.body.testData || "",
      expectedResult: req.body.expectedResult, priority: req.body.priority || "Medium", createdBy: req.user._id,
    });
    await log(req.user, "TestCase", testCase, "TEST_CASE_CREATED");
    res.status(201).json({ testCase });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Test Case ID already exists in this project" });
    res.status(500).json({ message: "Unable to create test case" });
  }
});

router.put("/qa/test-cases/:id", authorizeRoles(...qaRoles), async (req, res) => {
  const testCase = await TestCase.findById(req.params.id);
  if (!testCase || !(await projectFor(req, testCase.project))) return res.status(404).json({ message: "Test case not found or access denied" });
  ["scenario", "preconditions", "testData", "expectedResult", "priority", "active"].forEach(field => {
    if (req.body[field] !== undefined) testCase[field] = req.body[field];
  });
  if (Array.isArray(req.body.steps)) testCase.steps = req.body.steps;
  await testCase.save();
  await log(req.user, "TestCase", testCase, "TEST_CASE_UPDATED");
  res.json({ testCase });
});

router.get("/qa/executions", authorizeRoles(...qaRoles), async (req, res) => {
  const filter = {};
  if (id(req.query.testCase)) filter.testCase = req.query.testCase;
  if (id(req.query.requirement)) filter.requirement = req.query.requirement;
  const executions = await TestExecution.find(filter).populate("tester testCase requirement task", "name email testCaseId requirementId title").sort({ executedAt: -1 });
  res.json({ executions });
});

router.post("/qa/executions", authorizeRoles(...qaRoles), async (req, res) => {
  const testCase = await TestCase.findById(req.body.testCase);
  if (!testCase || !(await projectFor(req, testCase.project))) return res.status(404).json({ message: "Test case not found or access denied" });
  if (!["Not Run", "Pass", "Fail", "Blocked"].includes(req.body.status) || !["Dev", "QA", "Production", "Staging"].includes(req.body.environment)) return res.status(400).json({ message: "Invalid execution status or environment" });
  const execution = await TestExecution.create({
    testCase: testCase._id, requirement: testCase.requirement, task: testCase.task,
    tester: req.user._id, buildVersion: req.body.buildVersion || "", environment: req.body.environment,
    actualResult: req.body.actualResult || "", evidenceUrl: req.body.evidenceUrl || "", status: req.body.status,
  });
  if (execution.status === "Pass" && execution.task) {
    await Task.updateOne({ _id: execution.task }, { $set: { qaSignedOff: true } });
  }
  await log(req.user, "TestExecution", execution, "TEST_EXECUTION_RECORDED", null, execution.status);
  res.status(201).json({ execution });
});

router.get("/qa/summary", authorizeRoles(...qaRoles), async (req, res) => {
  const match = {};
  if (id(req.query.requirement)) match.requirement = new mongoose.Types.ObjectId(req.query.requirement);
  const counts = await TestExecution.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ counts: counts.reduce((result, item) => ({ ...result, [item._id]: item.count }), {}) });
});

// Bugs and controlled retesting
router.get("/bugs", async (req, res) => {
  const filter = {};
  if (id(req.query.project)) {
    if (req.user.role === "Developer") {
      filter.project = new mongoose.Types.ObjectId(req.query.project);
    } else {
      const project = await projectFor(req, req.query.project);
      if (!project) return res.status(403).json({ message: "Project access denied" });
      filter.project = project._id;
    }
  } else if (!managerRoles.includes(req.user.role)) {
    if (req.user.role === "QA Tester") {
      filter.project = { $in: await qaVisibleProjectIds() };
    } else if (req.user.role !== "Developer") {
      const projects = await Project.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] }).select("_id");
      filter.project = { $in: projects.map(project => project._id) };
    }
  }
  if (req.user.role === "Developer") filter.assignedDeveloper = req.user._id;
  if (req.user.role === "QA Tester") filter.status = "Ready for Retest";
  const bugs = await Bug.find(filter)
    .populate("assignedDeveloper", "name email role")
    .populate("requirement", "requirementId title")
    .populate("task", "title developmentStage")
    .populate("testCase", "testCaseId scenario")
    .populate("testExecution", "status executedAt actualResult")
    .sort({ updatedAt: -1 });
  res.json({ bugs });
});

router.post("/bugs", authorizeRoles(...qaRoles), async (req, res) => {
  if (!id(req.body.testExecution)) {
    return res.status(400).json({ message: "A valid failed test execution ID is required" });
  }
  const requiredFields = ["bugId", "summary", "reproductionSteps", "expectedResult", "actualResult"];
  if (requiredFields.some(field => !bodyString(req.body[field], field === "summary" ? 300 : 5000, true))) {
    return res.status(400).json({ message: "Bug ID, summary, reproduction steps, expected result and actual result are required" });
  }
  if (!["Minor", "Major", "Critical", "Blocker"].includes(req.body.severity || "Major") ||
      !["Low", "Medium", "High", "Critical"].includes(req.body.priority || "Medium")) {
    return res.status(400).json({ message: "Invalid bug severity or priority" });
  }
  const execution = await TestExecution.findOne({ _id: req.body.testExecution, status: "Fail" }).populate("testCase");
  if (!execution || !execution.testCase) return res.status(400).json({ message: "A failed test execution with a valid test case is required" });
  if (!(await projectFor(req, execution.testCase.project))) return res.status(403).json({ message: "Project access denied" });
  try {
    const bug = await Bug.create({
      bugId: bodyString(req.body.bugId, 40, true),
      project: execution.testCase.project,
      requirement: execution.testCase.requirement,
      task: execution.testCase.task,
      testCase: execution.testCase._id,
      testExecution: execution._id,
      summary: bodyString(req.body.summary, 300, true),
      reproductionSteps: bodyString(req.body.reproductionSteps, 5000, true),
      expectedResult: bodyString(req.body.expectedResult, 3000, true),
      actualResult: bodyString(req.body.actualResult, 3000, true),
      severity: req.body.severity || "Major", priority: req.body.priority || "Medium",
      environment: bodyString(req.body.environment || "", 100),
      evidenceUrl: bodyString(req.body.evidenceUrl || "", 1000),
    });
    await log(req.user, "Bug", bug, "BUG_CREATED");
    res.status(201).json({ bug });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Bug ID already exists in this project" });
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Invalid bug data" });
    }
    console.error("Bug creation error:", error.message);
    res.status(500).json({ message: "Unable to create bug" });
  }
});

router.patch("/bugs/:id/assign", authorizeRoles(...managerRoles), async (req, res) => {
  if (!id(req.params.id)) return res.status(400).json({ message: "Invalid bug ID" });
  if (!id(req.body.developer)) return res.status(400).json({ message: "A valid Developer ID is required" });
  const bug = await Bug.findById(req.params.id);
  if (!bug || !(await projectFor(req, bug.project))) return res.status(404).json({ message: "Bug not found" });
  const developer = await User.findOne({ _id: req.body.developer, role: "Developer" });
  if (!developer) return res.status(400).json({ message: "A Developer must be assigned" });
  const previous = bug.assignedDeveloper;
  bug.assignedDeveloper = developer._id;
  bug.status = "Assigned";
  await bug.save();
  await log(req.user, "Bug", bug, "BUG_ASSIGNED", previous, developer._id);
  res.json({ bug });
});

router.patch("/bugs/:id/status", async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) return res.status(404).json({ message: "Bug not found" });
  const next = req.body.status;
  if (!bugTransitions[bug.status]?.includes(next)) return res.status(400).json({ message: "Invalid bug transition" });
  const isDeveloper = req.user.role === "Developer" && same(bug.assignedDeveloper, req.user._id);
  const isQa = qaRoles.includes(req.user.role);
  if (!isDeveloper && !isQa) return res.status(403).json({ message: "Only the assigned Developer or QA can change this bug status" });
  if (next === "Closed" && (!isQa || !bug.lastRetestPassed)) return res.status(403).json({ message: "Only QA can close a bug after a passing retest" });
  const previous = bug.status;
  bug.status = next;
  if (next !== "Closed") bug.lastRetestPassed = false;
  if (next === "Closed") bug.closedBy = req.user._id;
  await bug.save();
  await log(req.user, "Bug", bug, "BUG_STATUS_CHANGED", previous, next);
  res.json({ bug });
});

router.put("/bugs/:id/fix", authorizeRoles("Developer"), async (req, res) => {
  const bug = await Bug.findOne({ _id: req.params.id, assignedDeveloper: req.user._id });
  if (!bug) return res.status(404).json({ message: "Bug not found or not assigned to you" });
  if (bug.status !== "In Progress") return res.status(400).json({ message: "Start the bug before submitting a fix" });
  const fixNotes = bodyString(req.body.fixNotes, 5000, true);
  const pullRequestUrl = bodyString(req.body.pullRequestUrl || "", 500);
  if (!fixNotes) return res.status(400).json({ message: "Fix notes are required" });
  if (pullRequestUrl) {
    try {
      const parsedUrl = new URL(pullRequestUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('invalid protocol');
    } catch {
      return res.status(400).json({ message: "Pull-request URL must be a valid HTTP or HTTPS URL" });
    }
  }
  bug.fixNotes = fixNotes;
  bug.pullRequestUrl = pullRequestUrl;
  bug.status = "Fixed";
  await bug.save();
  await log(req.user, "Bug", bug, "BUG_FIXED");
  res.json({ bug });
});

router.post("/bugs/:id/retest", authorizeRoles(...qaRoles), async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug || !bug.testCase) return res.status(404).json({ message: "Bug or linked test case not found" });
  if (bug.status !== "Ready for Retest") return res.status(400).json({ message: "Bug is not ready for retest" });
  const passed = req.body.status === "Pass";
  const execution = await TestExecution.create({
    testCase: bug.testCase, requirement: bug.requirement, task: bug.task,
    tester: req.user._id, buildVersion: req.body.buildVersion || "", environment: req.body.environment || "QA",
    actualResult: req.body.actualResult || "", evidenceUrl: req.body.evidenceUrl || "", status: passed ? "Pass" : "Fail",
  });
  bug.lastRetestPassed = passed;
  bug.status = passed ? "Closed" : "Reopened";
  if (passed) bug.closedBy = req.user._id;
  await bug.save();
  if (passed && bug.task) {
    await Task.updateOne({ _id: bug.task }, { $set: { qaSignedOff: true } });
  }
  await log(req.user, "Bug", bug, "BUG_RETESTED", null, execution.status);
  res.status(201).json({ bug, execution });
});

// Release readiness and approvals
router.get("/releases", async (req, res) => {
  const project = await projectFor(req, req.query.project);
  if (!project) return res.status(403).json({ message: "Project access denied" });
  res.json({ releases: await Release.find({ project: project._id }).sort({ createdAt: -1 }) });
});

router.post("/releases", authorizeRoles(...managerRoles), async (req, res) => {
  const project = await projectFor(req, req.body.project);
  if (!project || !bodyString(req.body.version, 50, true)) return res.status(400).json({ message: "Project and release version are required" });
  try {
    const release = await Release.create({ project: project._id, version: req.body.version });
    await log(req.user, "Release", release, "RELEASE_CREATED");
    res.status(201).json({ release });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Release version already exists in this project" });
    res.status(500).json({ message: "Unable to create release" });
  }
});

router.patch("/releases/:id/approve", authorizeRoles(...qaRoles), async (req, res) => {
  const release = await Release.findById(req.params.id);
  if (!release || !(await projectFor(req, release.project))) return res.status(404).json({ message: "Release not found or access denied" });
  const environment = req.body.environment;
  if (!["Dev", "QA", "Production"].includes(environment)) return res.status(400).json({ message: "Invalid release environment" });
  release.approvals[environment] = {
    status: req.body.status === "Rejected" ? "Rejected" : "Approved",
    approvedBy: req.user._id, approvedAt: new Date(), notes: req.body.notes || "",
  };
  await release.save();
  await log(req.user, "Release", release, "RELEASE_APPROVAL_UPDATED", null, environment);
  res.json({ release });
});

router.get("/reports/readiness", async (req, res) => {
  const project = await projectFor(req, req.query.project);
  if (!project) return res.status(403).json({ message: "Project access denied" });
  const [pendingQa, reopenedDefects, unfinishedSprintItems, totalTasks] = await Promise.all([
    Task.countDocuments({ project: project._id, developmentStage: "Ready for QA" }),
    Bug.countDocuments({ project: project._id, status: { $in: ["Reopened", "Ready for Retest"] } }),
    Task.countDocuments({ project: project._id, sprint: { $ne: null }, developmentStage: { $ne: "Done" } }),
    Task.countDocuments({ project: project._id }),
  ]);
  res.json({
    project: project._id,
    ready: pendingQa === 0 && reopenedDefects === 0 && unfinishedSprintItems === 0,
    pendingQa, reopenedDefects, unfinishedSprintItems, totalTasks,
  });
});

router.get("/reports/dashboard", async (req, res) => {
  const projectFilter = id(req.query.project) ? { project: new mongoose.Types.ObjectId(req.query.project) } : {};
  const taskFilter = projectFilter;
  const [stageCounts, developerWorkload, overdue, blockers, defectTrend] = await Promise.all([
    Task.aggregate([{ $match: taskFilter }, { $group: { _id: "$developmentStage", count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: { ...taskFilter, developer: { $ne: null } } },
      { $group: { _id: "$developer", tasks: { $sum: 1 }, estimatedHours: { $sum: "$effortEstimateHours" }, loggedHours: { $sum: "$loggedHours" } } },
      { $sort: { tasks: -1 } },
    ]),
    Task.countDocuments({ ...taskFilter, dueDate: { $lt: new Date() }, developmentStage: { $ne: "Done" } }),
    Task.countDocuments({ ...taskFilter, blockers: { $elemMatch: { resolvedAt: null } } }),
    Bug.aggregate([{ $match: projectFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  res.json({
    stageCounts: stageCounts.reduce((result, item) => ({ ...result, [item._id]: item.count }), {}),
    developerWorkload,
    overdue,
    blockers,
    defectTrend: defectTrend.reduce((result, item) => ({ ...result, [item._id]: item.count }), {}),
  });
});

module.exports = router;
