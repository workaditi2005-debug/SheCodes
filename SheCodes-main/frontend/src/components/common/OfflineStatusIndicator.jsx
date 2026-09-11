import { useEffect, useState } from "react";
import { getIsOnline, onSyncStatus, syncNow } from "../../utils/syncManager";

export default function OfflineStatusIndicator() {
  const [state, setState] = useState({ online: getIsOnline(), pending: 0, syncing: false });
  useEffect(() => onSyncStatus(setState), []);
  const label = !state.online ? `Offline · ${state.pending} pending` : state.syncing ? "Syncing…" : state.pending ? `${state.pending} waiting to sync` : "Online · synced";
  return <button onClick={syncNow} title="Synchronize saved changes" style={{ border: `1px solid ${state.online ? "#34d39966" : "#fb923c88"}`, background: state.online ? "#064e3b" : "#7c2d12", color: "#fff", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{state.online ? "●" : "●"} {label}</button>;
}

