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


// ── Structured API Error Class ───────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, { type = "UnknownError", status = 0, endpoint = "", method = "GET", detail = "", originalError = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.type = type; // "NetworkError" | "AuthError" | "ForbiddenError" | "NotFoundError" | "ValidationError" | "ServerError" | "HttpError"
    this.status = status;
    this.endpoint = endpoint;
    this.method = method;
    this.detail = detail;
    this.originalError = originalError;
  }
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

    if (!authToken) {
      console.warn(`[API Auth] ${method} ${path} blocked: No authentication token found.`);
      throw new ApiError("Authentication required. Please sign in.", {
        type: "AuthError",
        status: 401,
        endpoint: path,
        method,
      });
    }
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
    console.error(`[API NetworkError] ${method} ${path} failed:`, networkErr.message);
    throw new ApiError(
      "Unable to connect to NeuroAid servers. Please check that the backend server is running and try again.",
      {
        type: "NetworkError",
        status: 0,
        endpoint: path,
        method,
        originalError: networkErr,
      }
    );
  }

  if (!res.ok) {
    let detail = "";
    let errBody = null;
    try {
      errBody = await res.json();
      detail = errBody?.detail || "";
    } catch {
      detail = res.statusText || "";
    }

    if (res.status === 401) {
      console.warn(`[API 401 Unauthorized] ${method} ${path}:`, detail);
      if (requiresAuth && path !== "/messages/unread/count") {
        clearSession();
      }
      throw new ApiError(detail || "Session expired or unauthorized. Please sign in again.", {
        type: "AuthError",
        status: 401,
        endpoint: path,
        method,
        detail,
      });
    }

    if (res.status === 403) {
      console.warn(`[API 403 Forbidden] ${method} ${path}:`, detail);
      throw new ApiError(detail || "Access denied: Required privileges missing.", {
        type: "ForbiddenError",
        status: 403,
        endpoint: path,
        method,
        detail,
      });
    }

    if (res.status === 404) {
      console.warn(`[API 404 NotFound] ${method} ${path}:`, detail);
      throw new ApiError(detail || "Requested resource not found.", {
        type: "NotFoundError",
        status: 404,
        endpoint: path,
        method,
        detail,
      });
    }

    if (res.status === 422) {
      console.error(`[API 422 ValidationError] ${method} ${path}:`, errBody);
      const valDetail = Array.isArray(errBody?.detail)
        ? errBody.detail.map(d => `${d.loc?.slice(1)?.join('.') || 'field'}: ${d.msg}`).join("; ")
        : (detail || "Invalid request payload.");
      throw new ApiError(valDetail, {
        type: "ValidationError",
        status: 422,
        endpoint: path,
        method,
        detail: valDetail,
      });
    }

    if (res.status >= 500) {
      console.error(`[API ${res.status} ServerError] ${method} ${path}:`, detail);
      throw new ApiError(detail || "An internal server error occurred. Please try again later.", {
        type: "ServerError",
        status: res.status,
        endpoint: path,
        method,
        detail,
      });
    }

    throw new ApiError(detail || `API error (${res.status}): ${res.statusText || "Request failed"}`, {
      type: "HttpError",
      status: res.status,
      endpoint: path,
      method,
      detail,
    });
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
  let res;
  try {
    res = await fetch(`${BASE}/auth/firebase-onboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(profileData),
    });
  } catch (networkErr) {
    console.error(`[API NetworkError] POST /auth/firebase-onboard failed:`, networkErr);
    throw new ApiError(
      "Unable to connect to NeuroAid servers. Please verify that the server is running and try again.",
      {
        type: "NetworkError",
        status: 0,
        endpoint: "/auth/firebase-onboard",
        method: "POST",
        originalError: networkErr,
      }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err?.detail || `Onboarding error (${res.status})`;
    console.warn(`[API ${res.status} OnboardError]:`, detail);
    throw new ApiError(detail, {
      type: res.status === 401 ? "AuthError" : res.status === 403 ? "ForbiddenError" : res.status === 422 ? "ValidationError" : "HttpError",
      status: res.status,
      endpoint: "/auth/firebase-onboard",
      method: "POST",
      detail,
    });
  }

  const data = await res.json();
  saveSession(idToken, data.user);
  return data;
}

/** Update authenticated user profile (basic fields & doctor clinic info) */
export async function updateProfile(updates, explicitToken = null) {
  const headers = { "Content-Type": "application/json" };
  const token = explicitToken || (await getFirebaseIdToken()) || getToken();
  if (!token) throw new ApiError("Not authenticated.", { type: "AuthError", status: 401 });
  headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/auth/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });
  } catch (networkErr) {
    console.error(`[API NetworkError] PUT /auth/me failed:`, networkErr);
    throw new ApiError(
      "Unable to connect to NeuroAid servers. Please check your connection.",
      { type: "NetworkError", status: 0, endpoint: "/auth/me", method: "PUT", originalError: networkErr }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err?.detail || `Profile update error (${res.status})`, {
      status: res.status,
      endpoint: "/auth/me",
      method: "PUT",
    });
  }

  const data = await res.json();
  if (data?.user) {
    sessionStorage.setItem("neuroaid_user", JSON.stringify(data.user));
  }
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
  if (!token) throw new ApiError("Not authenticated.", { type: "AuthError", status: 401 });
  headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/auth/me`, { method: "GET", headers });
  } catch (networkErr) {
    console.error(`[API NetworkError] GET /auth/me failed:`, networkErr);
    throw new ApiError(
      "Unable to connect to NeuroAid servers. Please check that the server is running.",
      { type: "NetworkError", status: 0, endpoint: "/auth/me", method: "GET", originalError: networkErr }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err?.detail || `Failed to fetch profile (${res.status})`, {
      type: res.status === 401 ? "AuthError" : "HttpError",
      status: res.status,
      endpoint: "/auth/me",
      method: "GET",
    });
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
  const token = (await getFirebaseIdToken()) || getToken();
  if (!token) return 0;
  try {
    const data = await request("GET", "/messages/unread/count", null, true);
    return data?.count || 0;
  } catch {
    return 0;
  }
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

