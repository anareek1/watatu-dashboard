'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const SPACE_META = {
  "901810181220": { emoji: "🎯" },
  "90183284980": { emoji: "🇹🇿" },
  "90187409628": { emoji: "🇺🇬" },
  "90187069347": { emoji: "⚙️" },
  "901810101380": { emoji: "📋" },
  "901810227157": { emoji: "👤" },
  "901810323705": { emoji: "🏢" },
  "901810368272": { emoji: "✈️" },
  "90183319649": { emoji: "🏕️" },
};

const STATUS_COLORS = {
  "to do": "#6B7280", "today": "#F59E0B", "open": "#6B7280",
  "in progress": "#3B82F6", "planning": "#8B5CF6",
  "waiting on others": "#F97316", "update required": "#EF4444",
  "review": "#A855F7", "complete": "#10B981", "done": "#10B981", "closed": "#374151",
};

const STATUS_ORDER = ["in progress", "today", "planning", "to do", "open", "waiting on others", "update required", "review"];

function getStatusColor(status) {
  return STATUS_COLORS[status?.toLowerCase()] || "#6B7280";
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSpace, setActiveSpace] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clickup');
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to fetch'); }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date(json.timestamp));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); } }, [fetchData]);
  useEffect(() => { const interval = setInterval(() => { fetchData(); }, 5 * 60 * 1000); return () => clearInterval(interval); }, [fetchData]);

  const spaces = data?.spaces || {};
  const allTasks = Object.values(spaces).flatMap(s => s.tasks || []);
  const totalTasks = allTasks.length;
  const inProgress = allTasks.filter(t => t.status?.toLowerCase() === "in progress").length;
  const blocked = allTasks.filter(t => ["waiting on others", "update required", "blocked"].includes(t.status?.toLowerCase())).length;
  const unassigned = allTasks.filter(t => !t.assignees || t.assignees.length === 0).length;
  const overdue = allTasks.filter(t => { if (!t.due_date) return false; return new Date(t.due_date) < new Date(); }).length;
  const selectedTasks = activeSpace ? (spaces[activeSpace]?.tasks || []) : allTasks;
  const openTasks = selectedTasks.filter(t => !["complete", "done", "closed"].includes(t.status?.toLowerCase()));
  const statusGroups = {};
  for (const t of openTasks) { const s = t.status?.toLowerCase() || "unknown"; if (!statusGroups[s]) statusGroups[s] = []; statusGroups[s].push(t); }
  const sortedStatuses = Object.keys(statusGroups).sort((a, b) => { const ai = STATUS_ORDER.indexOf(a); const bi = STATUS_ORDER.indexOf(b); return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi); });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(145deg, #0a0e17, #111827, #0a0e17)", minHeight: "100vh", color: "#E5E7EB" }}>
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: loading ? "#F59E0B" : "#10B981", boxShadow: loading ? "0 0 8px #F59E0B" : "0 0 8px #10B981", animation: loading ? "pulse 1.5s infinite" : "none" }} />
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#F9FAFB", letterSpacing: "-0.02em" }}>Watatu × WithGrowth</h1>
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Live Operations Dashboard{lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString()}`} · Auto-refreshes every 5 min</p>
        </div>
        <button onClick={() => fetchData()} disabled={loading} style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 600, background: loading ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.15)", color: loading ? "#6B7280" : "#60A5FA", border: "1px solid " + (loading ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.3)"), borderRadius: "8px", cursor: loading ? "default" : "pointer", fontFamily: "inherit" }}>{loading ? "Loading..." : "↻ Refresh"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: "Total Open", value: allTasks.filter(t => !["complete","done","closed"].includes(t.status?.toLowerCase())).length, color: "#E5E7EB" },
          { label: "In Progress", value: inProgress, color: "#3B82F6" },
          { label: "Blocked", value: blocked, color: "#F97316" },
          { label: "Unassigned", value: unassigned, color: "#EF4444" },
          { label: "Overdue", value: overdue, color: overdue > 0 ? "#EF4444" : "#10B981" },
        ].map((stat, i) => (
          <div key={i} style={{ padding: "18px 20px", background: "#0a0e17" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: stat.color, lineHeight: 1 }}>{loading && totalTasks === 0 ? "—" : stat.value}</div>
            <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 32px", display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <TabButton active={!activeSpace} onClick={() => setActiveSpace(null)} label="All Spaces" />
        {Object.entries(spaces).map(([id, space]) => {
          const count = (space.tasks || []).filter(t => !["complete","done","closed"].includes(t.status?.toLowerCase())).length;
          return <TabButton key={id} active={activeSpace === id} onClick={() => setActiveSpace(activeSpace === id ? null : id)} label={`${SPACE_META[id]?.emoji || "📁"} ${space.name}`} count={count} />;
        })}
      </div>
      <div style={{ padding: "24px 32px" }}>
        {loading && totalTasks === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B7280" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ fontSize: "14px", margin: 0 }}>Connecting to ClickUp...</p>
          </div>
        ) : error ? (
          <div style={{ padding: "24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "14px", color: "#FCA5A5" }}>
            <strong>Connection Error:</strong> {error}<br /><br />
            <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Make sure CLICKUP_API_TOKEN and CLICKUP_TEAM_ID are set in Vercel environment variables.</span>
          </div>
        ) : openTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>No open tasks in this space.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {sortedStatuses.map(status => (
              <div key={status}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: getStatusColor(status) }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9CA3AF" }}>{status}</h3>
                  <span style={{ fontSize: "11px", color: "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{statusGroups[status].length}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "8px" }}>
                  {statusGroups[status].map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", fontSize: "12px", fontWeight: active ? 600 : 500, background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: active ? "#60A5FA" : "#9CA3AF", border: "1px solid " + (active ? "rgba(59,130,246,0.3)" : "transparent"), borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}>
      {label}{count > 0 && <span style={{ marginLeft: "6px", opacity: 0.6 }}>{count}</span>}
    </button>
  );
}

function TaskCard({ task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  return (
    <a href={task.url || '#'} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${getStatusColor(task.status)}`, textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ fontSize: "13px", fontWeight: 500, color: "#E5E7EB", lineHeight: 1.4, marginBottom: "8px" }}>{task.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "11px", color: "#6B7280" }}>
        {task.list_name && task.list_name !== "Unknown" && <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", fontSize: "10px", fontWeight: 500 }}>{task.list_name}</span>}
        {task.priority && <span style={{ padding: "2px 8px", borderRadius: "4px", background: task.priority === "urgent" ? "rgba(239,68,68,0.15)" : task.priority === "high" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)", color: task.priority === "urgent" ? "#FCA5A5" : task.priority === "high" ? "#FDBA74" : "#9CA3AF", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>{task.priority}</span>}
        {task.assignees?.length > 0 && <span style={{ color: "#60A5FA" }}>{task.assignees.join(", ")}</span>}
        {task.due_date && <span style={{ color: isOverdue ? "#FCA5A5" : "#6B7280" }}>{isOverdue ? "⚠ " : ""}{new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
      </div>
    </a>
  );
}
