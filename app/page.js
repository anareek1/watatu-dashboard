'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const SPACE_META = {
  "901810181220": { emoji: "🎯" },
  "90187069347": { emoji: "⚙️" },
  "901810227157": { emoji: "👤" },
  "901810323705": { emoji: "🏢" },
  "901810368272": { emoji: "✈️" },
};

const STATUS_COLORS = {
  "to do": "#6B7280", "today": "#F59E0B", "open": "#6B7280",
  "in progress": "#3B82F6", "planning": "#8B5CF6",
  "waiting on others": "#F97316", "update required": "#EF4444",
  "review": "#A855F7", "complete": "#10B981", "done": "#10B981",
  "closed": "#374151", "cancelled": "#374151",
};
const STATUS_ORDER = ["in progress", "today", "planning", "to do", "open", "waiting on others", "update required", "review"];

function getStatusColor(s) { return STATUS_COLORS[s?.toLowerCase()] || "#6B7280"; }

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSpace, setActiveSpace] = useState(null);
  const [view, setView] = useState('motion');
  const [lastRefresh, setLastRefresh] = useState(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/clickup');
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const json = await res.json();
      setData(json); setLastRefresh(new Date(json.timestamp));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); } }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 5*60*1000); return () => clearInterval(i); }, [fetchData]);

  const spaces = data?.spaces || {};
  const motion = data?.motion || {};
  const allTasks = Object.values(spaces).flatMap(s => s.tasks || []);
  const openTasks = allTasks.filter(t => !["complete","done","closed","cancelled"].includes(t.status?.toLowerCase()));
  const inProgress = openTasks.filter(t => t.status?.toLowerCase() === "in progress").length;
  const blocked = openTasks.filter(t => ["waiting on others","update required","blocked"].includes(t.status?.toLowerCase())).length;
  const unassigned = openTasks.filter(t => !t.assignees?.length).length;

  const selectedTasks = activeSpace ? (spaces[activeSpace]?.tasks || []).filter(t => !["complete","done","closed","cancelled"].includes(t.status?.toLowerCase())) : openTasks;
  const statusGroups = {};
  for (const t of selectedTasks) { const s = t.status?.toLowerCase() || "unknown"; if (!statusGroups[s]) statusGroups[s] = []; statusGroups[s].push(t); }
  const sortedStatuses = Object.keys(statusGroups).sort((a,b) => { const ai = STATUS_ORDER.indexOf(a); const bi = STATUS_ORDER.indexOf(b); return (ai===-1?99:ai)-(bi===-1?99:bi); });

  const personAct = motion.person_activity || {};
  const sortedPeople = Object.entries(personAct).sort((a,b) => (b[1].completed + b[1].inProgress) - (a[1].completed + a[1].inProgress));

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(145deg, #0a0e17, #111827, #0a0e17)", minHeight: "100vh", color: "#E5E7EB" }}>
      {/* Header */}
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: loading ? "#F59E0B" : "#10B981", boxShadow: loading ? "0 0 8px #F59E0B" : "0 0 8px #10B981", animation: loading ? "pulse 1.5s infinite" : "none" }} />
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#F9FAFB", letterSpacing: "-0.02em" }}>Watatu × WithGrowth</h1>
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Live Operations Dashboard{lastRefresh && ` · ${lastRefresh.toLocaleTimeString()}`} · Auto-refresh 5min</p>
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 600, background: loading ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.15)", color: loading ? "#6B7280" : "#60A5FA", border: "1px solid " + (loading ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.3)"), borderRadius: "8px", cursor: loading ? "default" : "pointer", fontFamily: "inherit" }}>{loading ? "Loading..." : "↻ Refresh"}</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: "Completed", sub: "this week", value: motion.completed_this_week || 0, color: "#10B981" },
          { label: "Updated", sub: "this week", value: motion.updated_this_week || 0, color: "#3B82F6" },
          { label: "In Progress", sub: "now", value: inProgress, color: "#60A5FA" },
          { label: "Blocked", sub: "waiting", value: blocked, color: "#F97316" },
          { label: "Stuck", sub: ">14 days idle", value: motion.stuck_tasks || 0, color: "#EF4444" },
          { label: "Unassigned", sub: "no owner", value: unassigned, color: "#F87171" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "16px 18px", background: "#0a0e17" }}>
            <div style={{ fontSize: "26px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: s.color, lineHeight: 1 }}>{loading && !data ? "—" : s.value}</div>
            <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: "10px", color: "#4B5563", marginTop: "1px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ padding: "14px 32px", display: "flex", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
        {[
          { id: "motion", label: "📊 Weekly Motion" },
          { id: "people", label: "👥 People" },
          { id: "stuck", label: "🚨 Stuck Tasks" },
          { id: "tasks", label: "📋 All Tasks" },
        ].map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setActiveSpace(null); }} style={{ padding: "6px 14px", fontSize: "12px", fontWeight: view === v.id ? 600 : 500, background: view === v.id ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)", color: view === v.id ? "#60A5FA" : "#9CA3AF", border: "1px solid " + (view === v.id ? "rgba(59,130,246,0.3)" : "transparent"), borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}>{v.label}</button>
        ))}
      </div>

      {/* Space tabs for tasks view */}
      {view === 'tasks' && (
        <div style={{ padding: "12px 32px", display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Btn active={!activeSpace} onClick={() => setActiveSpace(null)} label="All" />
          {Object.entries(spaces).map(([id, sp]) => {
            const c = (sp.tasks||[]).filter(t => !["complete","done","closed","cancelled"].includes(t.status?.toLowerCase())).length;
            return <Btn key={id} active={activeSpace===id} onClick={() => setActiveSpace(activeSpace===id?null:id)} label={`${SPACE_META[id]?.emoji||"📁"} ${sp.name}`} count={c} />;
          })}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {loading && !data ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B7280" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ fontSize: "14px", margin: 0 }}>Connecting to ClickUp...</p>
          </div>
        ) : error ? (
          <div style={{ padding: "24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "14px", color: "#FCA5A5" }}>
            <strong>Error:</strong> {error}<br /><br />
            <span style={{ color: "#9CA3AF", fontSize: "13px" }}>Check CLICKUP_API_TOKEN and CLICKUP_TEAM_ID in Vercel env variables.</span>
          </div>
        ) : view === 'motion' ? (
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", margin: "0 0 16px" }}>Completed This Week ({motion.completed_this_week || 0})</h2>
            {(motion.recently_completed || []).length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: "13px" }}>No tasks completed this week.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "8px" }}>
                {(motion.recently_completed || []).map(t => (
                  <a key={t.id} href={t.url||'#'} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 16px", background: "rgba(16,185,129,0.06)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.15)", borderLeft: "3px solid #10B981", textDecoration: "none", color: "inherit", display: "block" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#D1FAE5", marginBottom: "6px" }}>✓ {t.name}</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "11px", color: "#6B7280" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", fontSize: "10px" }}>{t.space || t.list_name}</span>
                      {t.assignees?.length > 0 && <span style={{ color: "#60A5FA" }}>{t.assignees.join(", ")}</span>}
                      {t.date_closed && <span>{new Date(t.date_closed).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : view === 'people' ? (
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", margin: "0 0 16px" }}>Team Activity This Week</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
              {sortedPeople.map(([name, stats]) => {
                const total = stats.completed + stats.inProgress;
                return (
                  <div key={name} style={{ padding: "16px", background: "rgba(255,255,255,0.025)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", marginBottom: "12px" }}>{name}</div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#10B981" }}>{stats.completed}</div>
                        <div style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase" }}>Completed</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#3B82F6" }}>{stats.inProgress}</div>
                        <div style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase" }}>In Progress</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#9CA3AF" }}>{stats.assigned}</div>
                        <div style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase" }}>Total Open</div>
                      </div>
                    </div>
                    {/* Activity bar */}
                    <div style={{ marginTop: "10px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
                      {stats.completed > 0 && <div style={{ width: `${(stats.completed / Math.max(stats.assigned,1)) * 100}%`, background: "#10B981", height: "100%" }} />}
                      {stats.inProgress > 0 && <div style={{ width: `${(stats.inProgress / Math.max(stats.assigned,1)) * 100}%`, background: "#3B82F6", height: "100%" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === 'stuck' ? (
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", margin: "0 0 4px" }}>Stuck Tasks ({motion.stuck_tasks || 0})</h2>
            <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 16px" }}>Tasks in "to do" with no updates for 14+ days</p>
            {(motion.stuck_list || []).length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: "13px" }}>No stuck tasks found.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "8px" }}>
                {(motion.stuck_list || []).map(t => (
                  <a key={t.id} href={t.url||'#'} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.15)", borderLeft: "3px solid #EF4444", textDecoration: "none", color: "inherit", display: "block" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#FCA5A5", marginBottom: "6px" }}>{t.name}</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "11px", color: "#6B7280" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", fontSize: "10px" }}>{t.list_name}</span>
                      {t.assignees?.length > 0 ? <span style={{ color: "#60A5FA" }}>{t.assignees.join(", ")}</span> : <span style={{ color: "#EF4444" }}>No owner</span>}
                      {t.date_updated && <span>Last update: {new Date(t.date_updated).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tasks view */
          selectedTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>No open tasks.</div>
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
          )
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

function Btn({ active, onClick, label, count }) {
  return <button onClick={onClick} style={{ padding: "6px 14px", fontSize: "12px", fontWeight: active?600:500, background: active?"rgba(59,130,246,0.2)":"rgba(255,255,255,0.04)", color: active?"#60A5FA":"#9CA3AF", border: "1px solid "+(active?"rgba(59,130,246,0.3)":"transparent"), borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}>{label}{count>0&&<span style={{ marginLeft:"6px", opacity:0.6 }}>{count}</span>}</button>;
}

function TaskCard({ task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  return (
    <a href={task.url||'#'} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.025)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${getStatusColor(task.status)}`, textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ fontSize: "13px", fontWeight: 500, color: "#E5E7EB", lineHeight: 1.4, marginBottom: "8px" }}>{task.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "11px", color: "#6B7280" }}>
        {task.list_name && task.list_name !== "Unknown" && <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", fontSize: "10px", fontWeight: 500 }}>{task.list_name}</span>}
        {task.priority && <span style={{ padding: "2px 8px", borderRadius: "4px", background: task.priority==="urgent"?"rgba(239,68,68,0.15)":task.priority==="high"?"rgba(249,115,22,0.15)":"rgba(255,255,255,0.04)", color: task.priority==="urgent"?"#FCA5A5":task.priority==="high"?"#FDBA74":"#9CA3AF", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>{task.priority}</span>}
        {task.assignees?.length > 0 && <span style={{ color: "#60A5FA" }}>{task.assignees.join(", ")}</span>}
        {task.due_date && <span style={{ color: isOverdue?"#FCA5A5":"#6B7280" }}>{isOverdue?"⚠ ":""}{new Date(task.due_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
      </div>
    </a>
  );
}
