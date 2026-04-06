import { NextResponse } from 'next/server';

const CLICKUP_API = 'https://api.clickup.com/api/v2';

const SPACES = {
  "901810181220": "Strategic Initiatives",
  "90183284980": "Tanzania Ops",
  "90187409628": "Uganda Ops",
  "90187069347": "TECH Developments",
  "901810101380": "WG Project Plan",
  "901810227157": "Omar",
  "901810323705": "Company Processes",
  "901810368272": "Travel Care",
  "90183319649": "Elototo Ops",
};

async function fetchTeamTasks(token, teamId, spaceId) {
  try {
    const params = new URLSearchParams({
      space_ids: JSON.stringify([spaceId]),
      include_closed: 'false',
      order_by: 'updated',
      reverse: 'true',
      subtasks: 'true',
    });
    const res = await fetch(`${CLICKUP_API}/team/${teamId}/task?${params}`, {
      headers: { Authorization: token },
      next: { revalidate: 0 },
    });
    if (!res.ok) { console.error(`ClickUp API error for space ${spaceId}: ${res.status}`); return []; }
    const data = await res.json();
    return (data.tasks || []).map(t => ({
      id: t.id,
      name: t.name,
      status: t.status?.status || 'unknown',
      priority: t.priority?.priority || null,
      assignees: (t.assignees || []).map(a => a.username || a.email || 'Unknown'),
      due_date: t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null,
      list_name: t.list?.name || 'Unknown',
      url: t.url,
    }));
  } catch (err) { console.error(`Error fetching space ${spaceId}:`, err); return []; }
}

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;
  const teamId = process.env.CLICKUP_TEAM_ID;
  if (!token || !teamId) {
    return NextResponse.json({ error: 'Missing CLICKUP_API_TOKEN or CLICKUP_TEAM_ID environment variables' }, { status: 500 });
  }
  const results = {};
  const entries = Object.entries(SPACES);
  const promises = entries.map(async ([spaceId, spaceName]) => {
    const tasks = await fetchTeamTasks(token, teamId, spaceId);
    return [spaceId, { name: spaceName, tasks }];
  });
  const resolved = await Promise.all(promises);
  for (const [id, data] of resolved) { results[id] = data; }
  return NextResponse.json({ spaces: results, timestamp: new Date().toISOString() });
}
