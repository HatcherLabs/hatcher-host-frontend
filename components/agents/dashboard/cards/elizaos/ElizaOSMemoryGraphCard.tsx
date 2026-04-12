'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Brain, GitBranch, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Room {
  id: string;
  name: string;
  channelId?: string;
  worldId?: string;
}

interface Memory {
  id: string;
  type: string;
  createdAt: number;
  text: string;
  source?: string;
  roomId?: string;
}

interface GraphNode {
  id: string;
  label: string;
  kind: 'room' | 'type';
  count: number;
  color: string;
  x: number;
  y: number;
  r: number;
  parentRoom?: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, string> = {
  messages: '#22d3ee',     // cyan-400
  observations: '#a78bfa', // violet-400
  reflections: '#c084fc',  // purple-400
};

const TYPE_BG: Record<string, string> = {
  messages: 'rgba(34,211,238,0.12)',
  observations: 'rgba(167,139,250,0.12)',
  reflections: 'rgba(192,132,252,0.12)',
};

function typeColor(t: string) {
  return TYPE_COLORS[t] ?? '#94a3b8';
}
function typeBg(t: string) {
  return TYPE_BG[t] ?? 'rgba(148,163,184,0.12)';
}

/* ------------------------------------------------------------------ */
/*  Radial layout builder                                             */
/* ------------------------------------------------------------------ */

function buildGraph(
  rooms: Room[],
  memories: Memory[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Count memories per room per type
  const roomMemories: Record<string, Record<string, number>> = {};
  const roomTotals: Record<string, number> = {};
  const unassigned: Record<string, number> = {};

  for (const m of memories) {
    const rid = m.roomId ?? '__unassigned';
    if (!roomMemories[rid]) roomMemories[rid] = {};
    roomMemories[rid][m.type] = (roomMemories[rid][m.type] ?? 0) + 1;
    roomTotals[rid] = (roomTotals[rid] ?? 0) + 1;
    if (!m.roomId) {
      unassigned[m.type] = (unassigned[m.type] ?? 0) + 1;
    }
  }

  // Rooms to display (only those with memories, limit to 8 for readability)
  const roomsWithMemories = rooms
    .filter((r) => roomTotals[r.id] > 0)
    .sort((a, b) => (roomTotals[b.id] ?? 0) - (roomTotals[a.id] ?? 0))
    .slice(0, 8);

  // If there are unassigned memories, add a virtual room
  if (Object.keys(unassigned).length > 0) {
    roomsWithMemories.push({
      id: '__unassigned',
      name: 'Unassigned',
    });
  }

  if (roomsWithMemories.length === 0) return { nodes: [], edges: [] };

  const cx = 200;
  const cy = 180;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const roomCount = roomsWithMemories.length;
  const outerR = roomCount === 1 ? 0 : Math.min(130, 50 + roomCount * 15);

  roomsWithMemories.forEach((room, i) => {
    const angle = (2 * Math.PI * i) / roomCount - Math.PI / 2;
    const rx = cx + outerR * Math.cos(angle);
    const ry = cy + outerR * Math.sin(angle);
    const total = roomTotals[room.id] ?? 0;
    const nodeR = Math.max(22, Math.min(36, 18 + Math.sqrt(total) * 2));

    nodes.push({
      id: `room-${room.id}`,
      label: room.name || room.id.slice(0, 8),
      kind: 'room',
      count: total,
      color: 'var(--color-accent, #22d3ee)',
      x: rx,
      y: ry,
      r: nodeR,
    });

    // Type child nodes around the room
    const types = Object.entries(roomMemories[room.id] ?? {});
    const childR = nodeR + 36;
    types.forEach(([type, count], j) => {
      const childAngle = angle + ((j - (types.length - 1) / 2) * 0.5);
      const childX = rx + childR * Math.cos(childAngle);
      const childY = ry + childR * Math.sin(childAngle);
      const childNodeR = Math.max(14, Math.min(24, 10 + Math.sqrt(count) * 2));

      const nodeId = `type-${room.id}-${type}`;
      nodes.push({
        id: nodeId,
        label: type,
        kind: 'type',
        count,
        color: typeColor(type),
        x: childX,
        y: childY,
        r: childNodeR,
        parentRoom: room.id,
      });

      edges.push({ from: `room-${room.id}`, to: nodeId });
    });
  });

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  SVG Graph                                                         */
/* ------------------------------------------------------------------ */

function MemoryGraph({
  nodes,
  edges,
  onRoomClick,
  selectedRoom,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onRoomClick: (roomId: string | null) => void;
  selectedRoom: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)] italic">
        No memory data to visualize
      </div>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 360"
      className="w-full h-auto"
      style={{ maxHeight: 360 }}
    >
      {/* Edges */}
      {edges.map((e) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--text-muted, #475569)"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isRoom = node.kind === 'room';
        const roomId = isRoom
          ? node.id.replace('room-', '')
          : node.parentRoom ?? null;
        const isSelected = selectedRoom && roomId === selectedRoom;
        const dimmed = selectedRoom && !isSelected;

        return (
          <g
            key={node.id}
            style={{
              cursor: isRoom ? 'pointer' : 'default',
              opacity: dimmed ? 0.35 : 1,
              transition: 'opacity 0.2s ease',
            }}
            onClick={() => {
              if (!isRoom) return;
              const rid = node.id.replace('room-', '');
              onRoomClick(selectedRoom === rid ? null : rid);
            }}
          >
            {/* Glow for selected */}
            {isSelected && isRoom && (
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + 4}
                fill="none"
                stroke={node.color}
                strokeWidth={2}
                strokeOpacity={0.5}
              />
            )}

            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={isRoom ? 'rgba(34,211,238,0.08)' : typeBg(node.label)}
              stroke={isRoom ? 'var(--color-accent, #22d3ee)' : node.color}
              strokeWidth={isRoom ? 1.5 : 1}
              strokeOpacity={0.6}
            />

            {/* Label */}
            <text
              x={node.x}
              y={node.y - (isRoom ? 4 : 2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isRoom ? 'var(--text-primary, #f1f5f9)' : node.color}
              fontSize={isRoom ? 9 : 8}
              fontWeight={isRoom ? 600 : 400}
              style={{ pointerEvents: 'none' }}
            >
              {node.label.length > 10
                ? node.label.slice(0, 9) + '...'
                : node.label}
            </text>

            {/* Count */}
            <text
              x={node.x}
              y={node.y + (isRoom ? 8 : 7)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-muted, #64748b)"
              fontSize={7}
              style={{ pointerEvents: 'none' }}
            >
              {node.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats bar                                                         */
/* ------------------------------------------------------------------ */

function StatsBar({
  totalMemories,
  typeCounts,
  activeRooms,
}: {
  totalMemories: number;
  typeCounts: Record<string, number>;
  activeRooms: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="rounded-lg px-2.5 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
        <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
          {totalMemories}
        </div>
        <div className="text-[9px] text-[var(--text-muted)]">Memories</div>
      </div>
      <div className="rounded-lg px-2.5 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
        <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
          {Object.keys(typeCounts).length}
        </div>
        <div className="text-[9px] text-[var(--text-muted)]">Types</div>
      </div>
      <div className="rounded-lg px-2.5 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
        <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
          {activeRooms}
        </div>
        <div className="text-[9px] text-[var(--text-muted)]">Rooms</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend                                                             */
/* ------------------------------------------------------------------ */

function Legend({ typeCounts }: { typeCounts: Record<string, number> }) {
  return (
    <div className="flex items-center gap-3 flex-wrap mt-2">
      {Object.entries(typeCounts).map(([type, count]) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: typeColor(type) }}
          />
          <span className="text-[10px] text-[var(--text-muted)]">
            {type} ({count})
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main card                                                         */
/* ------------------------------------------------------------------ */

export function ElizaOSMemoryGraphCard() {
  const { agent, setTab } = useAgentContext();
  const isActive = agent.status === 'active';
  const [memories, setMemories] = useState<Memory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [totalMemories, setTotalMemories] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [memRes, roomRes] = await Promise.all([
        api.getElizaosMemories(agent.id),
        api.getElizaosRooms(agent.id),
      ]);

      if (memRes.success) {
        setMemories(memRes.data.memories);
        setTotalMemories(memRes.data.total);
      }
      if (roomRes.success) {
        setRooms(roomRes.data.rooms);
      }
      if (!memRes.success && !roomRes.success) {
        setError('Failed to load memory data');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id, isActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memories) {
      counts[m.type] = (counts[m.type] ?? 0) + 1;
    }
    return counts;
  }, [memories]);

  const { nodes, edges } = useMemo(
    () => buildGraph(rooms, memories),
    [rooms, memories],
  );

  const activeRooms = useMemo(
    () => rooms.filter((r) => memories.some((m) => m.roomId === r.id)).length,
    [rooms, memories],
  );

  /* Inactive state */
  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Memory Graph
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Start the agent to view the memory graph.
        </div>
      </GlassCard>
    );
  }

  /* Loading */
  if (loading) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </GlassCard>
    );
  }

  /* Error */
  if (error) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Memory graph unavailable: {error}
        </div>
      </GlassCard>
    );
  }

  /* Empty */
  if (memories.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Memory Graph
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Brain size={24} className="text-cyan-400/30 mb-2" />
          <p className="text-xs text-[var(--text-muted)]">
            No memories yet. Start a conversation to populate the graph.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Memory Graph
          </h3>
        </div>
        <button
          onClick={() => setTab('memory')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Browse all
        </button>
      </div>

      {selectedRoom && selectedRoom !== '__unassigned' && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-[var(--text-muted)]">
            Filtered to room:
          </span>
          <span className="text-[10px] font-medium text-cyan-400">
            {rooms.find((r) => r.id === selectedRoom)?.name ??
              selectedRoom.slice(0, 12)}
          </span>
          <button
            onClick={() => setSelectedRoom(null)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-default)] bg-black/20 overflow-hidden">
        <MemoryGraph
          nodes={nodes}
          edges={edges}
          onRoomClick={setSelectedRoom}
          selectedRoom={selectedRoom}
        />
      </div>

      <Legend typeCounts={typeCounts} />
      <StatsBar
        totalMemories={totalMemories}
        typeCounts={typeCounts}
        activeRooms={activeRooms}
      />
    </GlassCard>
  );
}
