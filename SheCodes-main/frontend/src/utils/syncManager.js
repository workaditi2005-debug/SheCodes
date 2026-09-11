import { deferQueued, queuedActions, removeQueued } from "./offlineDb";

const listeners = new Set();
let syncing = false;
let timer;
let simulatedOffline = false;

export function setSimulatedOffline(val) {
  simulatedOffline = Boolean(val);
  announce();
}

export function getIsSimulatedOffline() {
  return simulatedOffline;
}

export function getIsOnline() {
  if (simulatedOffline) return false;
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function snapshot(extra = {}) {
  return queuedActions().then(items => ({ online: getIsOnline(), pending: items.length, syncing, ...extra }));
}
async function announce(extra) {
  const state = await snapshot(extra);
  listeners.forEach(listener => listener(state));
}

export function onSyncStatus(listener) {
  listeners.add(listener);
  announce();
  return () => listeners.delete(listener);
}

export async function syncNow() {
  if (syncing || !getIsOnline()) return announce();
  const token = sessionStorage.getItem("neuroaid_token");
  if (!token) return announce();
  const actions = (await queuedActions()).filter(item => item.nextRetryAt <= Date.now());
  if (!actions.length) return announce({ lastSync: new Date().toISOString() });
  syncing = true;
  await announce();
  try {
    const response = await fetch("/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actions: actions.map(({ id, type, payload, createdAt }) => ({ id, type, payload, created_at: createdAt })) }),
    });
    if (!response.ok) throw new Error(`Sync failed (${response.status})`);
    const body = await response.json();
    const completed = body.results.filter(result => result.status === "applied" || result.status === "duplicate").map(result => result.id);
    await removeQueued(completed);
    for (const result of body.results.filter(result => result.status === "retry")) await deferQueued(result.id);
    await announce({ lastSync: new Date().toISOString(), lastError: null });
  } catch (error) {
    for (const action of actions) await deferQueued(action.id);
    await announce({ lastError: "Waiting to retry" });
  } finally { syncing = false; await announce(); }
}

export function startSyncManager() {
  const trigger = () => syncNow();
  window.addEventListener("online", trigger);
  window.addEventListener("offline", () => announce());
  timer = window.setInterval(syncNow, 15_000);
  announce();
  if (getIsOnline()) syncNow();
  return () => { window.removeEventListener("online", trigger); window.clearInterval(timer); };
}

