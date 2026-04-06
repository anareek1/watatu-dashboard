import { NextResponse } from 'next/server';

const CLICKUP_API = 'https://api.clickup.com/api/v2';

const SPACES = {
  "901810181220": "Strategic Initiatives",
  "90187069347": "TECH Developments",
  "901810227157": "Omar",
  "901810323705": "Company Processes",
  "901810368272": "Travel Care",
};

async function fetchTasks(token, teamId, spaceId, includeClosed) {
  const allTasks = [];
  let page = 0;
  while (true) {
    const params = new URLSearchParams({
      space_ids: JSON.stringify([spaceId]),
      include_closed: includeClosed ? 'true' : 'false',
      order_by: 'updated',
      reverse: 'true',
      subtasks: 'true',
      page: String(page),
    });
    try {
      const res = await fetch(`${CLICKUP_API}/team/${teamId}/task?${params}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.tasks || data.tasks.length === 0) break;
      allTasks.push(...data.tasks);
      if (data.tasks.length < 100) break;
      page++;
      if (page > 3) break;
    } catch (err) { break; }
  }
  return allTasks;
}

function processTask(t) {
  return {
    id: t.id,
    name: t.name,
    status: t.status?.status || 'unknown',
    priority: t.priority?.priority || null,
    assignees: (t.assignees || []).map(a => a.username || a.email || 'Unknown'),
    due_date: t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null,
    date_created: t.date_created ? new Date(parseInt(t.date_created)).toISOString() : null,
    date_updated: t.date_updated ? new Date(parseInt(t.date_updated)).toISOString() : null,
    date_closed: t.date_closed ? new Date(parseInt(t.date_closed)).toISOString() : null,
    list_name: t.list?.name || 'Unknown',
    url: t.url,
  };
}

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;
  const teamId = process.env.CLICKUP_TEAM_ID;
  if (!token || !teamId) {
    return NextResponse.json({ error: 'Missing CLICKUP_API_TOKEN or CLICKUP_TEAM_ID' }, { status: 500 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const spaces = {};
  const recentlyClosed = [];
  const personActivity = {};

  for (const [spaceId, spaceName] of Object.entries(SPACES)) {
    // Open tasks
    const openRaw = await fetchTasks(token, teamId, spaceId, false);
    const openTasks = openRaw.map(processTask);

    // Closed tasks (to find recently completed)
    const closedRaw = await fetchTasks(token, teamId, spaceId, true);
    const closedTasks = closedRaw
      .map(processTask)
      .filter(t => {
        if (!t.date_closed) return false;
        return new Date(t.date_closed) >= weekAgo;
      });

    recentlyClosed.push(...closedTasks.map(t => ({ ...t, space: spaceName })));

    // Track person activity from closed tasks
    for (const t of closedTasks) {
      for (const a of (t.assignees || [])) {
        if (!personActivity[a]) personActivity[a] = { completed: 0, inProgress: 0, assigned: 0 };
        personActivity[a].completed++;
      }
    }

    // Track person activity from open tasks
    for (const t of openTasks) {
      for (const a of (t.assignees || [])) {
        if (!personActivity[a]) personActivity[a] = { completed: 0, inProgress: 0, assigned: 0 };
        personActivity[a].assigned++;
        if (t.status?.toLowerCase() === 'in progress') personActivity[a].inProgress++;
      }
    }

    spaces[spaceId] = { name: spaceName, tasks: openTasks };
  }

  // Find stuck tasks (to do for more than 14 days, no update)
  const allOpen = Object.values(spaces).flatMap(s => s.tasks);
  const stuck = allOpen.filter(t => {
    const isStatic = ['to do', 'open', 'backlog'].includes(t.status?.toLowerCase());
    if (!isStatic) return false;
    if (!t.date_updated) return true;
    const updated = new Date(t.date_updated);
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 14;
  });

  // Recently updated (last 7 days, still open)
  const recentlyUpdated = allOpen.filter(t => {
    if (!t.date_updated) return false;
    return new Date(t.date_updated) >= weekAgo;
  });

  return NextResponse.json({
    spaces,
    motion: {
      completed_this_week: recentlyClosed.length,
      recently_completed: recentlyClosed.slice(0, 30),
      updated_this_week: recentlyUpdated.length,
      stuck_tasks: stuck.length,
      stuck_list: stuck.slice(0, 20),
      person_activity: personActivity,
    },
    timestamp: new Date().toISOString(),
  });
}
