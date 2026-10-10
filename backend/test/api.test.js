process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CLIENT_URL = "http://localhost:5173";

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { app } = require("../server");
const User = require("../models/User");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Activity = require("../models/Activity");

let mongo;
let manager;
let user;
let otherUser;
let developer;
let qaTester;
let managerToken;
let userToken;
let otherUserToken;
let developerToken;
let qaToken;

async function login(email, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  assert.equal(response.status, 200);
  return response.body.token;
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const password = await bcrypt.hash("Password123!", 12);
  [manager, user, otherUser, developer, qaTester] = await User.create([
    {
      name: "Test Manager",
      email: "manager@test.example",
      password,
      role: "Manager",
    },
    {
      name: "Test User",
      email: "user@test.example",
      password,
      role: "User",
    },
    {
      name: "Other User",
      email: "other@test.example",
      password,
      role: "User",
    },
    {
      name: "Test Developer",
      email: "developer@test.example",
      password,
      role: "Developer",
    },
    {
      name: "Test QA",
      email: "qa@test.example",
      password,
      role: "QA Tester",
    },
  ]);

  managerToken = await login(manager.email, "Password123!");
  userToken = await login(user.email, "Password123!");
  otherUserToken = await login(otherUser.email, "Password123!");
  developerToken = await login(developer.email, "Password123!");
  qaToken = await login(qaTester.email, "Password123!");
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("registers a User and rejects public Manager registration", async () => {
  const registration = await request(app)
    .post("/api/auth/register")
    .send({
      name: "New User",
      email: "new-user@test.example",
      password: "Password123!",
    });

  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.role, "User");
  assert.ok(registration.body.token);

  const managerRegistration = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Not Allowed",
      email: "not-manager@test.example",
      password: "Password123!",
      role: "Manager",
    });

  assert.equal(managerRegistration.status, 403);
});

test("rejects unauthenticated and invalid login requests", async () => {
  const protectedResponse = await request(app).get("/api/tasks/dashboard");
  assert.equal(protectedResponse.status, 401);

  const invalidLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: manager.email, password: "wrong-password" });

  assert.equal(invalidLogin.status, 401);
});

test("enforces task creation, ownership and status authorization", async () => {
  const userCreate = await request(app)
    .post("/api/tasks")
    .set("Authorization", "Bearer " + userToken)
    .send({
      title: "Unauthorized task",
      assignee: user.id,
    });
  assert.equal(userCreate.status, 403);

  const created = await request(app)
    .post("/api/tasks")
    .set("Authorization", "Bearer " + managerToken)
    .send({
      title: "Prepare assessment demo",
      description: "Run the complete MVP flow",
      assignee: user.id,
      priority: "High",
    });

  assert.equal(created.status, 201);
  assert.equal(created.body.task.assignee._id, user.id.toString());

  const taskId = created.body.task._id;
  const otherUserDashboard = await request(app)
    .get("/api/tasks/dashboard")
    .set("Authorization", "Bearer " + otherUserToken);
  assert.equal(otherUserDashboard.status, 200);
  assert.equal(otherUserDashboard.body.tasks.length, 0);

  const otherUserUpdate = await request(app)
    .patch("/api/tasks/" + taskId + "/status")
    .set("Authorization", "Bearer " + otherUserToken)
    .send({ status: "Completed" });
  assert.equal(otherUserUpdate.status, 403);

  const userUpdate = await request(app)
    .patch("/api/tasks/" + taskId + "/status")
    .set("Authorization", "Bearer " + userToken)
    .send({ status: "In Progress" });
  assert.equal(userUpdate.status, 200);
  assert.equal(userUpdate.body.task.status, "In Progress");
});

test("returns activity history only to task participants", async () => {
  const created = await request(app)
    .post("/api/tasks")
    .set("Authorization", "Bearer " + managerToken)
    .send({ title: "Activity test", assignee: user.id });

  const taskId = created.body.task._id;
  await request(app)
    .patch("/api/tasks/" + taskId + "/status")
    .set("Authorization", "Bearer " + userToken)
    .send({ status: "Completed" });

  const managerHistory = await request(app)
    .get("/api/tasks/" + taskId + "/activity")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(managerHistory.status, 200);
  assert.deepEqual(
    managerHistory.body.activities.map(activity => activity.action).sort(),
    ["STATUS_UPDATED", "TASK_CREATED"].sort()
  );

  const otherHistory = await request(app)
    .get("/api/tasks/" + taskId + "/activity")
    .set("Authorization", "Bearer " + otherUserToken);
  assert.equal(otherHistory.status, 403);
});

test("supports project, requirement, sprint and guarded development workflow", async () => {
  const projectResponse = await request(app)
    .post("/api/projects")
    .set("Authorization", "Bearer " + managerToken)
    .send({
      name: "Assessment Project",
      key: "ASSESS",
      description: "Assessment workflow",
      members: [developer.id, qaTester.id, user.id],
    });
  assert.equal(projectResponse.status, 201);
  const projectId = projectResponse.body.project._id;

  const requirementResponse = await request(app)
    .post("/api/requirements")
    .set("Authorization", "Bearer " + managerToken)
    .send({
      project: projectId,
      requirementId: "REQ-001",
      title: "Login requirement",
      description: "Users can log in securely",
      acceptanceCriteria: "Valid credentials create a session",
    });
  assert.equal(requirementResponse.status, 201);
  const requirementId = requirementResponse.body.requirement._id;

  const sprintResponse = await request(app)
    .post("/api/sprints")
    .set("Authorization", "Bearer " + managerToken)
    .send({
      project: projectId,
      sprintId: "SPRINT-1",
      goal: "MVP workflow",
      startDate: "2026-01-01",
      endDate: "2026-01-14",
    });
  assert.equal(sprintResponse.status, 201);

  const taskResponse = await request(app)
    .post("/api/tasks")
    .set("Authorization", "Bearer " + managerToken)
    .send({ title: "Implement login", assignee: user.id });
  assert.equal(taskResponse.status, 201);
  const taskId = taskResponse.body.task._id;

  const allocation = await request(app)
    .patch("/api/tasks/" + taskId + "/allocation")
    .set("Authorization", "Bearer " + managerToken)
    .send({ project: projectId, requirement: requirementId, developer: developer.id, qaRequired: true });
  assert.equal(allocation.status, 200);

  const invalidTransition = await request(app)
    .patch("/api/tasks/" + taskId + "/workflow")
    .set("Authorization", "Bearer " + developerToken)
    .send({ developmentStage: "Ready for QA" });
  assert.equal(invalidTransition.status, 400);

  for (const stage of ["To Do", "In Progress", "Code Review", "Ready for QA"]) {
    const response = await request(app)
      .patch("/api/tasks/" + taskId + "/workflow")
      .set("Authorization", "Bearer " + developerToken)
      .send({ developmentStage: stage });
    assert.equal(response.status, 200);
  }

  const testCase = await request(app)
    .post("/api/qa/test-cases")
    .set("Authorization", "Bearer " + qaToken)
    .send({
      project: projectId,
      requirement: requirementId,
      task: taskId,
      testCaseId: "TC-001",
      scenario: "Valid login",
      expectedResult: "Login succeeds",
    });
  assert.equal(testCase.status, 201);

  const blockedDone = await request(app)
    .patch("/api/tasks/" + taskId + "/workflow")
    .set("Authorization", "Bearer " + developerToken)
    .send({ developmentStage: "Done" });
  assert.equal(blockedDone.status, 409);

  const execution = await request(app)
    .post("/api/qa/executions")
    .set("Authorization", "Bearer " + qaToken)
    .send({
      testCase: testCase.body.testCase._id,
      environment: "QA",
      status: "Fail",
      actualResult: "Login did not succeed",
    });
  assert.equal(execution.status, 201);

  const missingExecution = await request(app)
    .post("/api/bugs")
    .set("Authorization", "Bearer " + qaToken)
    .send({
      testExecution: "",
      bugId: "BUG-INVALID",
      summary: "Invalid bug",
      reproductionSteps: "No execution",
      expectedResult: "No error",
      actualResult: "Error",
    });
  assert.equal(missingExecution.status, 400);

  const bug = await request(app)
    .post("/api/bugs")
    .set("Authorization", "Bearer " + qaToken)
    .send({
      testExecution: execution.body.execution._id,
      bugId: "BUG-001",
      summary: "Login fails",
      reproductionSteps: "Submit valid credentials",
      expectedResult: "Login succeeds",
      actualResult: "Login fails",
      severity: "Major",
      priority: "High",
      environment: "QA",
    });
  assert.equal(bug.status, 201);
  assert.equal(bug.body.bug.testExecution, execution.body.execution._id);
  assert.equal(bug.body.bug.testCase, testCase.body.testCase._id);
  assert.equal(bug.body.bug.requirement, requirementId);
  assert.equal(bug.body.bug.task, taskId);

  const unauthorizedBugUpdate = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + otherUserToken)
    .send({ status: "Assigned" });
  assert.equal(unauthorizedBugUpdate.status, 403);

  const invalidBugTransition = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + managerToken)
    .send({ status: "Closed" });
  assert.equal(invalidBugTransition.status, 400);

  const assignedBug = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/assign")
    .set("Authorization", "Bearer " + managerToken)
    .send({ developer: developer.id });
  assert.equal(assignedBug.status, 200);
  assert.equal(assignedBug.body.bug.assignedDeveloper, developer.id.toString());
  const developerBugs = await request(app)
    .get("/api/bugs")
    .set("Authorization", "Bearer " + developerToken);
  assert.equal(developerBugs.status, 200);
  assert.ok(developerBugs.body.bugs.some(item => item._id === bug.body.bug._id));
  await Project.updateOne({ _id: projectId }, { $pull: { members: developer.id } });
  const developerProjects = await request(app)
    .get("/api/projects")
    .set("Authorization", "Bearer " + developerToken);
  assert.equal(developerProjects.status, 200);
  assert.ok(developerProjects.body.projects.some(item => item._id === projectId));
  const developerProjectBugs = await request(app)
    .get("/api/bugs?project=" + projectId)
    .set("Authorization", "Bearer " + developerToken);
  assert.equal(developerProjectBugs.status, 200);
  assert.ok(developerProjectBugs.body.bugs.some(item => item._id === bug.body.bug._id && item.task?.title === "Implement login"));
  await Project.updateOne({ _id: projectId }, { $pull: { members: qaTester.id } });
  const qaProjects = await request(app)
    .get("/api/projects")
    .set("Authorization", "Bearer " + qaToken);
  assert.equal(qaProjects.status, 200);
  assert.ok(qaProjects.body.projects.some(item => item._id === projectId));
  const qaCases = await request(app)
    .get("/api/qa/test-cases?project=" + projectId)
    .set("Authorization", "Bearer " + qaToken);
  assert.equal(qaCases.status, 200);
  assert.ok(qaCases.body.testCases.some(item => item._id === testCase.body.testCase._id));
  const invalidDeveloperTransition = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + developerToken)
    .send({ status: "Fixed" });
  assert.equal(invalidDeveloperTransition.status, 400);
  assert.equal(invalidDeveloperTransition.body.message, "Invalid bug transition");
  const developerStartsWork = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + developerToken)
    .send({ status: "In Progress" });
  assert.equal(developerStartsWork.status, 200);
  const refreshedBugs = await request(app)
    .get("/api/bugs?project=" + projectId)
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(refreshedBugs.status, 200);
  assert.equal(refreshedBugs.body.bugs.find(item => item._id === bug.body.bug._id).assignedDeveloper._id, developer.id.toString());

  const eligibleDevelopers = await request(app)
    .get("/api/advanced/users")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(eligibleDevelopers.status, 200);
  assert.ok(eligibleDevelopers.body.users.some(item => item._id === developer.id.toString() && item.role === "Developer"));
  assert.ok(!eligibleDevelopers.body.users.some(item => item._id === otherUser.id.toString()));

  const allUsers = await request(app)
    .get("/api/advanced/users?mode=all")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(allUsers.status, 200);
  assert.ok(allUsers.body.users.some(item => item._id === otherUser.id.toString() && item.role === "User"));
  const roleChange = await request(app)
    .patch("/api/advanced/users/" + otherUser.id + "/role")
    .set("Authorization", "Bearer " + managerToken)
    .send({ role: "QA Tester" });
  assert.equal(roleChange.status, 200);
  assert.equal(roleChange.body.user.role, "QA Tester");
  assert.equal((await User.findById(otherUser.id)).role, "QA Tester");
  const selfPromotion = await request(app)
    .patch("/api/advanced/users/" + manager.id + "/role")
    .set("Authorization", "Bearer " + managerToken)
    .send({ role: "Developer" });
  assert.equal(selfPromotion.status, 403);
  const unauthorizedRoleChange = await request(app)
    .patch("/api/advanced/users/" + user.id + "/role")
    .set("Authorization", "Bearer " + otherUserToken)
    .send({ role: "QA Tester" });
  assert.equal(unauthorizedRoleChange.status, 403);

  const promotionCandidates = await request(app)
    .get("/api/advanced/users?mode=promotion")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(promotionCandidates.status, 200);
  assert.ok(promotionCandidates.body.users.some(item => item._id === user.id.toString() && item.role === "User"));

  const promoted = await request(app)
    .patch("/api/advanced/users/" + user.id + "/promote-developer")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.role, "Developer");
  assert.equal((await User.findById(user.id)).role, "Developer");

  const unauthorizedPromotion = await request(app)
    .patch("/api/advanced/users/" + user.id + "/promote-developer")
    .set("Authorization", "Bearer " + otherUserToken);
  assert.equal(unauthorizedPromotion.status, 403);

  const unauthorizedAssignment = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/assign")
    .set("Authorization", "Bearer " + otherUserToken)
    .send({ developer: developer.id });
  assert.equal(unauthorizedAssignment.status, 403);

  const invalidDeveloperAssignment = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/assign")
    .set("Authorization", "Bearer " + managerToken)
    .send({ developer: "not-an-object-id" });
  assert.equal(invalidDeveloperAssignment.status, 400);

  const fixedBug = await request(app)
    .put("/api/bugs/" + bug.body.bug._id + "/fix")
    .set("Authorization", "Bearer " + developerToken)
    .send({ fixNotes: "Corrected the login validation", pullRequestUrl: "https://example.test/pr/1" });
  assert.equal(fixedBug.status, 200);
  assert.equal(fixedBug.body.bug.status, "Fixed");
  const invalidPullRequest = await request(app)
    .put("/api/bugs/" + bug.body.bug._id + "/fix")
    .set("Authorization", "Bearer " + developerToken)
    .send({ fixNotes: "Invalid URL test", pullRequestUrl: "not-a-url" });
  assert.equal(invalidPullRequest.status, 400);
  const readyForRetest = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + developerToken)
    .send({ status: "Ready for Retest" });
  assert.equal(readyForRetest.status, 200);
  const qaBugs = await request(app)
    .get("/api/bugs")
    .set("Authorization", "Bearer " + qaToken);
  assert.equal(qaBugs.status, 200);
  assert.ok(qaBugs.body.bugs.some(item => item._id === bug.body.bug._id && item.status === "Ready for Retest"));

  const failedRetest = await request(app)
    .post("/api/bugs/" + bug.body.bug._id + "/retest")
    .set("Authorization", "Bearer " + qaToken)
    .send({ status: "Fail", environment: "QA", actualResult: "Still failing" });
  assert.equal(failedRetest.status, 201);
  assert.equal(failedRetest.body.bug.status, "Reopened");

  const closeAfterFailedRetest = await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + qaToken)
    .send({ status: "Closed" });
  assert.equal(closeAfterFailedRetest.status, 400);

  await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/assign")
    .set("Authorization", "Bearer " + managerToken)
    .send({ developer: developer.id });
  await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + developerToken)
    .send({ status: "In Progress" });
  await request(app)
    .put("/api/bugs/" + bug.body.bug._id + "/fix")
    .set("Authorization", "Bearer " + developerToken)
    .send({ fixNotes: "Applied the final fix" });
  await request(app)
    .patch("/api/bugs/" + bug.body.bug._id + "/status")
    .set("Authorization", "Bearer " + developerToken)
    .send({ status: "Ready for Retest" });

  const passingRetest = await request(app)
    .post("/api/bugs/" + bug.body.bug._id + "/retest")
    .set("Authorization", "Bearer " + qaToken)
    .send({ status: "Pass", environment: "QA", actualResult: "Login succeeds" });
  assert.equal(passingRetest.status, 201);
  assert.equal(passingRetest.body.bug.status, "Closed");

  const bugHistory = await Activity.find({ entityType: "Bug", entityId: bug.body.bug._id });
  assert.ok(bugHistory.some(item => item.action === "BUG_ASSIGNED"));
  assert.ok(bugHistory.some(item => item.action === "BUG_RETESTED"));

  const done = await request(app)
    .patch("/api/tasks/" + taskId + "/workflow")
    .set("Authorization", "Bearer " + developerToken)
    .send({ developmentStage: "Done" });
  assert.equal(done.status, 200);

  const csv = await request(app)
    .get("/api/tasks/export.csv")
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(csv.status, 200);
  assert.match(csv.text, /Title.*Status/);

  const report = await request(app)
    .get("/api/reports/dashboard?project=" + projectId)
    .set("Authorization", "Bearer " + managerToken);
  assert.equal(report.status, 200);
  assert.equal(report.body.stageCounts.Done, 1);
});
