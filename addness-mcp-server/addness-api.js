import fetch from "node-fetch";

const BASE_URL = process.env.ADDNESS_BASE_URL || "https://www.addness.com";
const COOKIE = process.env.ADDNESS_SESSION_COOKIE || "";

async function request(path, method = "GET", body = null) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Cookie: COOKIE,
    "User-Agent": "AddnessMCPServer/1.0",
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Addness API Error: ${res.status} ${res.statusText} - ${path}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function getTodos() {
  return request("/api/todos");
}

export async function getGoals() {
  return request("/api/goals");
}

export async function getGoalDetail(goalId) {
  return request(`/api/goals/${goalId}`);
}

export async function updateGoalStatus(goalId, status) {
  return request(`/api/goals/${goalId}`, "PATCH", { status });
}

export async function addGoalComment(goalId, comment) {
  return request(`/api/goals/${goalId}/comments`, "POST", { content: comment });
}

export async function createGoal(title, parentId = null) {
  return request("/api/goals", "POST", { title, parentId });
}

export async function getMemberGoals(memberId) {
  return request(`/api/members/${memberId}/goals`);
}

export async function getMembers() {
  return request("/api/members");
}
