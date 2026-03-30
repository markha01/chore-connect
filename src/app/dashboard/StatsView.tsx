'use client';

import { useState } from 'react';
import { Chore, Household, Me } from './types';

// Pleasant, vibrant colors that pop on a dark background
const CHART_COLORS = [
  '#a78bfa', // soft violet
  '#34d399', // soft emerald
  '#f472b6', // soft pink
  '#60a5fa', // soft blue
  '#fbbf24', // soft amber
  '#4ade80', // soft green
  '#c084fc', // soft purple
  '#22d3ee', // soft cyan
  '#fb923c', // soft orange
  '#818cf8', // soft indigo
];

interface BarData {
  name: string;
  value: number; // 0-100
  count: number;
  color: string;
}

function BarChart({
  data,
  title,
  subtitle,
  emptyMessage,
}: {
  data: BarData[];
  title: string;
  subtitle: string;
  emptyMessage: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasData = data.some((d) => d.value > 0);

  // Chart dimensions (SVG coordinate space)
  const PAD_L = 42;
  const PAD_R = 16;
  const PAD_T = 28;
  const PAD_B = 52;
  const CHART_H = 260;

  // Make the chart wider when there are many members
  const MIN_SEG_W = 60;
  const innerW = Math.max(data.length * MIN_SEG_W, 520);
  const CHART_W = PAD_L + innerW + PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          fontWeight: '700',
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          marginBottom: '0.15rem',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {subtitle}
      </div>

      {!hasData ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 0',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Horizontally scrollable chart wrapper */}
          <div style={{ overflowX: 'auto', overflowY: 'visible', marginBottom: '0.75rem' }}>
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              style={{
                display: 'block',
                width: '100%',
                minWidth: `${Math.min(CHART_W, 340)}px`,
                overflow: 'visible',
              }}
            >
              {/* Chart area background */}
              <rect
                x={PAD_L}
                y={PAD_T}
                width={innerW}
                height={innerH}
                fill="rgba(255,255,255,0.015)"
                rx={4}
              />

              {/* Horizontal grid lines */}
              {gridLines.map((pct) => {
                const y = PAD_T + innerH - (pct / 100) * innerH;
                const isBaseline = pct === 0;
                return (
                  <g key={pct}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={PAD_L + innerW}
                      y2={y}
                      stroke={isBaseline ? 'rgba(45,45,74,0.9)' : 'rgba(45,45,74,0.55)'}
                      strokeWidth={isBaseline ? 1.5 : 1}
                      strokeDasharray={isBaseline ? undefined : '4 6'}
                    />
                    <text
                      x={PAD_L - 8}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="#6b7280"
                      fontSize="10"
                      fontFamily="Inter, sans-serif"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* Left axis line */}
              <line
                x1={PAD_L}
                y1={PAD_T}
                x2={PAD_L}
                y2={PAD_T + innerH}
                stroke="rgba(45,45,74,0.6)"
                strokeWidth={1}
              />

              {/* Bars + labels */}
              {data.map((item, i) => {
                const segW = innerW / data.length;
                const barW = Math.min(Math.max(segW * 0.52, 20), 72);
                const barH = Math.max((item.value / 100) * innerH, item.value > 0 ? 3 : 0);
                const bx = PAD_L + i * segW + (segW - barW) / 2;
                const by = PAD_T + innerH - barH;
                const isHovered = hoveredIndex === i;

                // Tooltip position — clamp to chart bounds
                const ttW = 58;
                const ttH = 24;
                const rawTtX = bx + barW / 2 - ttW / 2;
                const ttX = Math.min(Math.max(rawTtX, PAD_L), PAD_L + innerW - ttW);
                const ttY = Math.max(by - ttH - 8, PAD_T - ttH - 4);
                const arrowX = bx + barW / 2;

                // X-axis label
                const lblX = PAD_L + i * segW + segW / 2;
                const lblY = PAD_T + innerH + 14;
                const name = item.name.length > 11 ? item.name.slice(0, 10) + '…' : item.name;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'default' }}
                  >
                    {/* Bar */}
                    <rect
                      x={bx}
                      y={by}
                      width={barW}
                      height={Math.max(barH, 0)}
                      rx={5}
                      ry={5}
                      fill={item.color}
                      opacity={hoveredIndex !== null && !isHovered ? 0.35 : 0.88}
                      style={{ transition: 'opacity 0.15s ease' }}
                    />

                    {/* Top cap glow */}
                    {barH > 8 && (
                      <rect
                        x={bx + 2}
                        y={by}
                        width={barW - 4}
                        height={6}
                        rx={3}
                        fill={item.color}
                        opacity={isHovered ? 0.6 : 0.3}
                        style={{ transition: 'opacity 0.15s ease' }}
                      />
                    )}

                    {/* Hover tooltip */}
                    {isHovered && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect
                          x={ttX}
                          y={ttY}
                          width={ttW}
                          height={ttH}
                          rx={6}
                          fill={item.color}
                          opacity={0.96}
                        />
                        <text
                          x={ttX + ttW / 2}
                          y={ttY + ttH / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fff"
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="Inter, sans-serif"
                        >
                          {item.value.toFixed(1)}%
                        </text>
                        {/* Arrow */}
                        <polygon
                          points={`${arrowX - 5},${ttY + ttH} ${arrowX + 5},${ttY + ttH} ${arrowX},${ttY + ttH + 6}`}
                          fill={item.color}
                          opacity={0.96}
                        />
                      </g>
                    )}

                    {/* X-axis label */}
                    <text
                      x={lblX}
                      y={lblY}
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      fill={isHovered ? item.color : '#8b8ba8'}
                      fontSize="11"
                      fontWeight={isHovered ? '600' : '400'}
                      fontFamily="Inter, sans-serif"
                      style={{ transition: 'fill 0.15s ease' }}
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.375rem 0.875rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            {data.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {item.name}
                </span>
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: item.color,
                    fontWeight: '600',
                  }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  me: Me | null;
  household: Household | null;
  chores: Chore[];
}

export default function StatsView({ me, household, chores }: Props) {
  if (!household) return null;

  const members = household.members;

  // ── Completion share ────────────────────────────────────────────────────────
  const completed = chores.filter((c) => c.is_complete);
  const completionCounts: Record<number, number> = {};
  completed.forEach((c) => {
    if (c.completed_by) {
      completionCounts[c.completed_by] = (completionCounts[c.completed_by] || 0) + 1;
    }
  });
  const totalCompleted = completed.length;

  const completionData: BarData[] = members.map((m, i) => ({
    name: m.display_name,
    value:
      totalCompleted > 0
        ? ((completionCounts[m.user_id] || 0) / totalCompleted) * 100
        : 0,
    count: completionCounts[m.user_id] || 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // ── Assignment share ────────────────────────────────────────────────────────
  const assigned = chores.filter((c) => c.assigned_to !== null);
  const assignmentCounts: Record<number, number> = {};
  assigned.forEach((c) => {
    if (c.assigned_to) {
      assignmentCounts[c.assigned_to] = (assignmentCounts[c.assigned_to] || 0) + 1;
    }
  });
  const totalAssigned = assigned.length;

  const assignmentData: BarData[] = members.map((m, i) => ({
    name: m.display_name,
    value:
      totalAssigned > 0
        ? ((assignmentCounts[m.user_id] || 0) / totalAssigned) * 100
        : 0,
    count: assignmentCounts[m.user_id] || 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const totalPending = chores.filter((c) => !c.is_complete).length;

  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        paddingBottom: '5.5rem',
        maxWidth: '640px',
        margin: '0 auto',
        animation: 'viewFadeIn 0.2s ease',
      }}
    >
      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.625rem',
          marginBottom: '1.25rem',
        }}
      >
        {[
          { label: 'Total', value: chores.length, color: '#a78bfa' },
          { label: 'Done', value: totalCompleted, color: '#34d399' },
          { label: 'Pending', value: totalPending, color: '#f472b6' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.875rem 0.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '1.625rem',
                fontWeight: '800',
                color,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginTop: '0.3rem',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <BarChart
        data={completionData}
        title="Completion Share"
        subtitle={`Who completed chores · ${totalCompleted} completed total`}
        emptyMessage="No chores have been completed yet."
      />

      <BarChart
        data={assignmentData}
        title="Assignment Share"
        subtitle={`How chores are distributed · ${totalAssigned} assigned total`}
        emptyMessage="No chores have been assigned to members yet."
      />
    </div>
  );
}
