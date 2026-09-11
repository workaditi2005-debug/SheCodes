// ── API service layer ─────────────────────────────────────────────────────────
const BASE = "/api";
import { cacheKey, enqueue, getCached, setCached } from "../utils/offlineDb";
import { getIsOnline, syncNow } from "../utils/syncManager";

// ── Token / session helpers ───────────────────────────────────────────────────
export const getToken   = () => sessionStorage.getItem("neuroaid_token");
export const getUser    = () => { const u = sessionStorage.getItem("neuroaid_user"); return u ? JSON.parse(u) : null; };
export const isLoggedIn = () => !!getToken();

export function saveSession(token, user) {
  sessionStorage.setItem("neuroaid_token", token);
  sessionStorage.setItem("neuroaid_user", JSON.stringify(user));
}
export function clearSession() {
  try {
    sessionStorage.removeItem("neuroaid_token");
    sessionStorage.removeItem("neuroaid_user");
  } catch {}
  try {
    localStorage.removeItem("neuroaid_token");
    localStorage.removeItem("neuroaid_user");
  } catch {}
}

// ── Firebase ID Token readiness (Prepared for upcoming backend token verification) ──
let _firebaseTokenGetter = null;

export function registerFirebaseTokenGetter(getterFn) {
  _firebaseTokenGetter = getterFn;
}

export async function getFirebaseIdToken(forceRefresh = false) {
  if (typeof _firebaseTokenGetter === "function") {
    try {
      return await _firebaseTokenGetter(forceRefresh);
    } catch {
      return null;
    }
  }
  return null;
}


// ── Core request ──────────────────────────────────────────────────────────────
async function request(method, path, body, requiresAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (requiresAuth) {
    // 1. Prefer active Firebase ID token for real Firebase-authenticated users
    let authToken = await getFirebaseIdToken();

    // 2. Fall back to stored token (for deterministic SIH demo mode or temporary migration)
    if (!authToken) {
      authToken = getToken();
    }

    if (!authToken) throw new Error("Not authenticated. Please log in.");
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error(`Network connection failed (${networkErr.message || "Failed to fetch"}). Please check that the server is running.`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.detail || "";
    } catch {}

    if (res.status === 401 && requiresAuth) {
      clearSession();
      throw new Error(detail || "Session expired or unauthorized. Please log in again.");
    }
    if (res.status === 403) {
      throw new Error(detail || "Access denied: Doctor privileges required.");
    }
    if (res.status === 404) {
      throw new Error(detail || "Requested resource not found.");
    }
    throw new Error(detail || `API error (${res.status}): ${res.statusText || "Request failed"}`);
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────────

/** Onboard or link a Firebase-authenticated user using real Firebase ID token */
export async function firebaseOnboard(profileData, idToken) {
  const res = await fetch(`${BASE}/auth/firebase-onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Onboarding error ${res.status}`);
  }
  const data = await res.json();
  saveSession(idToken, data.user);
  return data;
}

/** Register a new user (legacy endpoint). role = "patient" | "doctor" | "caregiver" */
export async function register({ full_name, email, password, role, age, gender, phone, license_number, specialization, hospital, location, years_experience, consultation_mode, bio, max_patients }) {
  const data = await request("POST", "/auth/register", { full_name, email, password, role, age, gender, phone, license_number, specialization, hospital, location, years_experience, consultation_mode, bio, max_patients });
  saveSession(data.token, data.user);
  return data;
}

/** Login (legacy endpoint). role = "patient" | "doctor" | "caregiver" */
export async function login(email, password, role = "patient") {
  const data = await request("POST", "/auth/login", { email, password, role });
  saveSession(data.token, data.user);
  return data;
}

/** Logout current user. */
export async function logout() {
  try {
    await request("POST", "/auth/logout", null, true);
  } catch (err) {
    console.warn("Backend logout note:", err);
  } finally {
    clearSession();
  }
}

/** Get current user profile using current authentication token */
export async function fetchMe(explicitToken = null) {
  const headers = { "Content-Type": "application/json" };
  const token = explicitToken || (await getFirebaseIdToken()) || getToken();
  if (!token) throw new Error("Not authenticated.");
  headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/auth/me`, { method: "GET", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch profile (${res.status})`);
  }
  const data = await res.json();
  sessionStorage.setItem("neuroaid_user", JSON.stringify(data.user));
  return data.user;
}

/** Doctors & Care Team — get assigned patients. */
export async function getPatients() {
  const data = await request("GET", "/auth/patients", null, true);
  return data.patients;
}

// ── Assessment API ────────────────────────────────────────────────────────────
export const submitAnalysis = (payload) => request("POST", "/analyze", payload, true);

/** Get current patient's own past results */
export async function getMyResults() {
  const data = await request("GET", "/results/my", null, true);
  return data.results; // array, newest last
}

/** Doctor only — get a specific patient's results (consent-checked) */
export async function getPatientResults(patientId) {
  const data = await request("GET", `/results/patient/${patientId}`, null, true);
  return data.results;
}

// ── Consent Management API ────────────────────────────────────────────────────
export async function getConsent() {
  return request("GET", "/consent", null, true);
}

export async function updateConsent(payload) {
  return request("PUT", "/consent", payload, true);
}

export async function getAuditLogs(limit = 50) {
  return request("GET", `/auth/audit-logs?limit=${limit}`, null, true);
}

// ── Messaging ────────────────────────────────────────────────────────────────
export async function sendMessage(recipientId, text) {
  return request("POST", "/messages/send", { recipient_id: recipientId, text }, true);
}
export async function getMessages(otherUserId) {
  const data = await request("GET", `/messages/${otherUserId}`, null, true);
  return data.messages;
}
export async function deleteMessage(messageId) {
  return request("DELETE", `/messages/${messageId}`, null, true);
}
export async function getConversations() {
  const data = await request("GET", "/conversations", null, true);
  return data.conversations;
}
export async function getUnreadCount() {
  const data = await request("GET", "/messages/unread/count", null, true);
  return data.count;
}

export async function getDoctors() {
  const data = await request("GET", "/auth/doctors", null, true);
  return data.doctors;
}

export async function getMyDoctor() {
  const data = await request("GET", "/auth/doctors/my-doctor", null, true);
  return data;
}

export async function enrollWithDoctor(doctorId) {
  return request("POST", "/auth/doctors/enroll", { doctor_id: doctorId }, true);
}

export async function getPendingRequests() {
  const data = await request("GET", "/auth/doctors/pending-requests", null, true);
  return data?.pending_requests || [];
}

export async function approvePatient(patientId, action) {
  return request("POST", "/auth/doctors/approve", { patient_id: patientId, action }, true);
}

// ── Educational RAG Chat ─────────────────────────────────────────────────────
export async function submitChat(question, userContext = {}) {
  return request("POST", "/chat", { question, user_context: userContext }, false);
}

// ── Cognitive Games API ─────────────────────────────────────────────────────
export async function getGamesList() {
  return request("GET", "/games", null, false);
}

export async function getGameConfig(gameId) {
  return request("GET", `/games/${gameId}/config`, null, false);
}

export async function submitGameSession(payload) {
  const token = getToken();
  const actionId = crypto.randomUUID();
  const isOnline = getIsOnline();
  const optimistic = { session_id: actionId, ...payload, score: payload.score || Math.max(40, 100 - (payload.mistakes_count || 0) * 12), stars: 3, stars_label: "3/3 Stars", feedback_message: "Saved safely on this device.", cognitive_domain: "Cognitive Training", timestamp: new Date().toISOString(), offline: !isOnline };
  if (!isOnline) {
    await enqueue({ id: actionId, type: "GAME_SESSION", payload: { ...payload, client_action_id: actionId } });
    const user = getUser(); const key = cacheKey(user?.id, "game-history");
    const history = await getCached(key, []); await setCached(key, [optimistic, ...history]);
    syncNow(); return optimistic;
  }
  return request("POST", "/games/session", { ...payload, client_action_id: actionId }, !!token);
}

export const getCareDashboard = () => request("GET", "/dashboard/patients", null, true);
export const getCarePatientDashboard = patientId => request("GET", `/dashboard/patient/${patientId}`, null, true);

export async function getGameHistory() {
  const token = getToken();
  const key = cacheKey(getUser()?.id, "game-history");
  try { const value = await request("GET", "/games/history", null, !!token); await setCached(key, value.sessions || []); return value; }
  catch (error) { if (!getIsOnline()) return { sessions: await getCached(key, []) }; throw error; }
}

export async function getGameStats() {
  const token = getToken();
  return request("GET", "/games/stats", null, !!token);
}

export async function getReminders() {
  const key = cacheKey(getUser()?.id, "reminders");
  try { const value = await request("GET", "/reminders", null, true); await setCached(key, value); return value; }
  catch (error) { if (!getIsOnline()) return getCached(key, []); throw error; }
}

export async function completeReminder(reminderId) {
  const actionId = crypto.randomUUID(); const key = cacheKey(getUser()?.id, "reminders");
  const optimisticUpdate = async () => { const reminders = await getCached(key, []); const item = reminders.find(r => r.id === reminderId); if (item) { item.status = "completed"; item.last_completed_at = new Date().toISOString(); await setCached(key, reminders); } return item; };
  if (!getIsOnline()) { const item = await optimisticUpdate(); await enqueue({ id: actionId, type: "REMINDER_COMPLETE", payload: { reminder_id: reminderId } }); syncNow(); return item || { id: reminderId, status: "completed", offline: true }; }
  const item = await request("POST", `/reminders/${reminderId}/complete`, null, true); await optimisticUpdate(); return item;
}

export async function toggleReminderStatus(reminderId, targetStatus) {
  const actionId = crypto.randomUUID();
  const key = cacheKey(getUser()?.id, "reminders");
  const newStatus = targetStatus || "completed";

  const optimisticUpdate = async () => {
    const reminders = await getCached(key, []);
    const item = reminders.find(r => r.id === reminderId);
    if (item) {
      item.status = newStatus;
      if (newStatus === "completed") {
        item.last_completed_at = new Date().toISOString();
      } else {
        delete item.last_completed_at;
      }
      await setCached(key, reminders);
    }
    return item;
  };

  if (!getIsOnline()) {
    const item = await optimisticUpdate();
    await enqueue({
      id: actionId,
      type: newStatus === "completed" ? "REMINDER_COMPLETE" : "REMINDER_UPDATE",
      payload: { reminder_id: reminderId, status: newStatus }
    });
    syncNow();
    return item || { id: reminderId, status: newStatus, offline: true };
  }

  try {
    let item;
    if (newStatus === "completed") {
      item = await request("POST", `/reminders/${reminderId}/complete`, null, true);
    } else {
      item = await request("PUT", `/reminders/${reminderId}`, { status: "pending" }, true);
    }
    await optimisticUpdate();
    return item;
  } catch (err) {
    const item = await optimisticUpdate();
    return item || { id: reminderId, status: newStatus };
  }
}

export async function getMemoryItems() {
  const key = cacheKey(getUser()?.id, "memory-items");
  try { const value = await request("GET", "/memory-bank", null, true); await setCached(key, value); return value; }
  catch (error) { if (!getIsOnline()) return getCached(key, []); throw error; }
}

export async function getGameRecommendation(gameId) {
  const token = getToken();
  return request("GET", `/games/${gameId}/recommended-level`, null, !!token);
}

// ── Deterministic SIH Demo API ────────────────────────────────────────────────
export async function resetAndSeedDemo() {
  return request("POST", "/demo/reset-and-seed", null, false);
}

