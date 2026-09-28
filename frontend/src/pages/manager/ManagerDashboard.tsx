import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PieChart as PieIcon,
  ShieldCheck,
  Calendar as CalendarIcon,
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { KpiCard } from '../../components/ui/KpiCard';
import { SkeletonCard, SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { DonutChart, type DonutSlice } from '../../components/ui/DonutChart';
import { AttendanceGauge } from '../../components/ui/AttendanceGauge';
import { formatDate } from '../../lib/format';
import type { DashboardSummary, LeaveSummary } from '../../types/api';

type ChartMode = 'type' | 'coverage' | 'priority';
type ChartScope = 'pending' | 'all';

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: '#0B6E6E', // brand teal
  sick: '#0284C7', // sky blue
  casual: '#059669', // emerald
  unpaid: '#D97706', // amber
  lop: '#D97706', // amber
  maternity: '#0D9488', // teal
  paternity: '#2563EB', // blue
  compensatory: '#475467', // slate
  bereavement: '#64748B', // slate
};

function getLeaveTypeColor(typeName: string): string {
  const lower = typeName.toLowerCase();
  for (const [key, color] of Object.entries(LEAVE_TYPE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#475467';
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [chartMode, setChartMode] = useState<ChartMode>('type');
  const [chartScope, setChartScope] = useState<ChartScope>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  const { data: pending, isLoading: queueLoading } = useQuery({
    queryKey: ['manager-queue', 'pending'],
    queryFn: () => api.get<LeaveSummary[]>('/manager/queue?scope=pending'),
  });

  const { data: escalated } = useQuery({
    queryKey: ['manager-queue', 'escalated'],
    queryFn: () => api.get<LeaveSummary[]>('/manager/queue?scope=escalated'),
  });

  const { data: history } = useQuery({
    queryKey: ['manager-queue', 'history'],
    queryFn: () => api.get<LeaveSummary[]>('/manager/queue?scope=history'),
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Decide dataset based on scope
  const targetDataset = useMemo(() => {
    if (chartScope === 'pending') {
      return pending ?? [];
    }
    return [...(pending ?? []), ...(history ?? [])];
  }, [chartScope, pending, history]);

  // Aggregate data for Donut Chart
  const donutData = useMemo<DonutSlice[]>(() => {
    if (targetDataset.length === 0) return [];

    if (chartMode === 'type') {
      const typeMap = new Map<string, { count: number; days: number; color: string }>();
      targetDataset.forEach(req => {
        const name = req.leaveTypeName || 'Other';
        const existing = typeMap.get(name) || {
          count: 0,
          days: 0,
          color: getLeaveTypeColor(name),
        };
        existing.count += 1;
        existing.days += req.workingDays || 0;
        typeMap.set(name, existing);
      });

      return Array.from(typeMap.entries()).map(([name, stat]) => ({
        id: name,
        label: name,
        value: stat.count,
        secondaryValue: stat.days,
        secondaryLabel: 'days',
        color: stat.color,
      }));
    }

    if (chartMode === 'coverage') {
      const fullCount = targetDataset.filter(r => r.coverageStatus === 'FULL').length;
      const partialCount = targetDataset.filter(r => r.coverageStatus === 'PARTIAL').length;
      const noneCount = targetDataset.filter(r => !r.coverageStatus || r.coverageStatus === 'NONE').length;

      const slices: DonutSlice[] = [];
      if (fullCount > 0) {
        slices.push({
          id: 'FULL',
          label: 'Full Coverage',
          value: fullCount,
          color: '#12B76A',
        });
      }
      if (partialCount > 0) {
        slices.push({
          id: 'PARTIAL',
          label: 'Partial Coverage',
          value: partialCount,
          color: '#F79009',
        });
      }
      if (noneCount > 0) {
        slices.push({
          id: 'NONE',
          label: 'No Coverage',
          value: noneCount,
          color: '#F04438',
        });
      }
      return slices;
    }

    // Priority mode
    const escalatedCount = targetDataset.filter(r => r.escalated || r.escalationLevel > 0).length;
    const conflictCount = targetDataset.filter(r => r.conflictFlag && !(r.escalated || r.escalationLevel > 0)).length;
    const standardCount = targetDataset.length - escalatedCount - conflictCount;

    const slices: DonutSlice[] = [];
    if (escalatedCount > 0) {
      slices.push({
        id: 'escalated',
        label: 'Escalated Urgency',
        value: escalatedCount,
        color: '#F04438',
      });
    }
    if (conflictCount > 0) {
      slices.push({
        id: 'conflict',
        label: 'Team Conflicts',
        value: conflictCount,
        color: '#F59E0B',
      });
    }
    if (standardCount > 0) {
      slices.push({
        id: 'standard',
        label: 'Standard Queue',
        value: standardCount,
        color: '#0B6E6E',
      });
    }
    return slices;
  }, [targetDataset, chartMode]);

  // Working days breakdown per leave type
  const daysBreakdown = useMemo(() => {
    const map = new Map<string, { days: number; color: string }>();
    let totalDays = 0;

    targetDataset.forEach(r => {
      const name = r.leaveTypeName || 'Other';
      const days = r.workingDays || 0;
      totalDays += days;
      const cur = map.get(name) || { days: 0, color: getLeaveTypeColor(name) };
      cur.days += days;
      map.set(name, cur);
    });

    const items = Array.from(map.entries()).map(([name, { days, color }]) => ({
      name,
      days,
      color,
      percentage: totalDays > 0 ? Math.round((days / totalDays) * 100) : 0,
    }));

    return { totalDays, items };
  }, [targetDataset]);

  // Filtered pending requests
  const filteredPending = useMemo(() => {
    if (!selectedCategory) return pending ?? [];

    return (pending ?? []).filter(r => {
      if (chartMode === 'type') {
        return r.leaveTypeName === selectedCategory;
      }
      if (chartMode === 'coverage') {
        if (selectedCategory === 'Full Coverage') return r.coverageStatus === 'FULL';
        if (selectedCategory === 'Partial Coverage') return r.coverageStatus === 'PARTIAL';
        return !r.coverageStatus || r.coverageStatus === 'NONE';
      }
      if (chartMode === 'priority') {
        if (selectedCategory === 'Escalated Urgency') return r.escalated || r.escalationLevel > 0;
        if (selectedCategory === 'Team Conflicts') return r.conflictFlag;
        return !(r.escalated || r.escalationLevel > 0) && !r.conflictFlag;
      }
      return true;
    });
  }, [pending, selectedCategory, chartMode]);

  function handleSliceClick(slice: DonutSlice) {
    if (selectedCategory === slice.label) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(slice.label);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
          Manager Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#667085]">{today}, {user?.teamName ?? 'Your team'}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              label="Awaiting Your Decision"
              value={summary?.awaitingDecisionCount ?? 0}
              accent
            />
            <KpiCard
              label="Escalated to You"
              value={summary?.escalatedToManagerCount ?? 0}
            />
            <KpiCard
              label="Team Off Today"
              value={`${summary?.teamOffTodayCount ?? 0} / ${summary?.teamSize ?? 0}`}
              sub="members on leave"
            />
            <KpiCard
              label="Coverage Gaps"
              value={summary?.coverageGapsCount ?? 0}
              sub="requests without full coverage"
            />
          </>
        )}
      </div>

      {/* Visualizations & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie / Donut Chart Card (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-[#E4E7EC] rounded-[10px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header with Mode & Scope Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F2F4F7]">
              <div>
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#0B6E6E]" />
                  <h2 className="text-sm font-semibold text-[#101828]">
                    Team Leave Distribution
                  </h2>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Interactive visualization of leave requests, coverage health, and priority
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Scope selector */}
                <div className="inline-flex bg-[#F2F4F7] p-0.5 rounded-[6px] text-xs">
                  <button
                    onClick={() => {
                      setChartScope('pending');
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                      chartScope === 'pending'
                        ? 'bg-white text-[#101828] shadow-xs'
                        : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    Pending ({pending?.length ?? 0})
                  </button>
                  <button
                    onClick={() => {
                      setChartScope('all');
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                      chartScope === 'all'
                        ? 'bg-white text-[#101828] shadow-xs'
                        : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    All Recent ({(pending?.length ?? 0) + (history?.length ?? 0)})
                  </button>
                </div>

                {/* Mode selector */}
                <div className="inline-flex bg-[#F2F4F7] p-0.5 rounded-[6px] text-xs">
                  <button
                    onClick={() => {
                      setChartMode('type');
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                      chartMode === 'type'
                        ? 'bg-[#0B6E6E] text-white shadow-xs'
                        : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    Leave Type
                  </button>
                  <button
                    onClick={() => {
                      setChartMode('coverage');
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                      chartMode === 'coverage'
                        ? 'bg-[#0B6E6E] text-white shadow-xs'
                        : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    Coverage
                  </button>
                  <button
                    onClick={() => {
                      setChartMode('priority');
                      setSelectedCategory(null);
                    }}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                      chartMode === 'priority'
                        ? 'bg-[#0B6E6E] text-white shadow-xs'
                        : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    Priority
                  </button>
                </div>
              </div>
            </div>

            {/* Donut Chart and Breakdown */}
            <div className="pt-5">
              {queueLoading ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-[#F2F4F7] border-t-[#0B6E6E] animate-spin" />
                </div>
              ) : donutData.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#E6F4F4] text-[#0B6E6E] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#101828]">No requests in selected scope</h3>
                  <p className="text-xs text-[#667085] max-w-sm mt-1">
                    Your approval queue is all clear! Switch to &quot;All Recent&quot; to review previous team leave distribution patterns.
                  </p>
                  {chartScope === 'pending' && (history?.length ?? 0) > 0 && (
                    <button
                      onClick={() => setChartScope('all')}
                      className="mt-3 text-xs text-[#0B6E6E] hover:underline font-semibold"
                    >
                      View All Recent Requests ({history?.length} past records)
                    </button>
                  )}
                </div>
              ) : (
                <DonutChart
                  data={donutData}
                  centerTitle="Requests"
                  centerSubtitle={chartScope === 'pending' ? 'Pending' : 'Total'}
                  onSliceClick={handleSliceClick}
                />
              )}
            </div>
          </div>

          {/* Bottom Filter Hint & Total Impact */}
          {donutData.length > 0 && (
            <div className="mt-5 pt-3 border-t border-[#F2F4F7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085]">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#0B6E6E]" />
                <span>
                  Tip: Click any slice or legend item to {selectedCategory ? 'clear filter' : 'filter the pending table below'}.
                </span>
              </span>

              {daysBreakdown.totalDays > 0 && (
                <span className="font-medium text-[#101828]">
                  Total Impact:{' '}
                  <strong className="text-[#0B6E6E] font-mono">{daysBreakdown.totalDays}</strong> working days
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Rail: Attendance Gauge & Days Distribution */}
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-6 shadow-sm flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-[#F2F4F7]">
              <CalendarIcon className="w-4 h-4 text-[#0B6E6E]" />
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Team Capacity Today</h2>
                <p className="text-xs text-[#667085] mt-0.5">Real-time attendance & absence rate</p>
              </div>
            </div>

            <div className="pt-4">
              <AttendanceGauge
                teamSize={summary?.teamSize ?? 0}
                offToday={summary?.teamOffTodayCount ?? 0}
                coverageGaps={summary?.coverageGapsCount ?? 0}
                awaitingReview={summary?.awaitingDecisionCount ?? 0}
              />
            </div>
          </div>

          {/* Days Requested Distribution Bar */}
          {daysBreakdown.items.length > 0 && (
            <div className="pt-4 border-t border-[#F2F4F7]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#344054]">
                  Working Days by Leave Type
                </span>
                <span className="text-xs font-mono text-[#667085]">
                  {daysBreakdown.totalDays} total days
                </span>
              </div>

              {/* Multi-segment stacked bar */}
              <div className="w-full h-3 rounded-[4px] bg-[#F2F4F7] overflow-hidden flex">
                {daysBreakdown.items.map(item => (
                  <div
                    key={item.name}
                    className="h-full transition-all duration-300 relative group cursor-pointer"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.name}: ${item.days} days (${item.percentage}%)`}
                  />
                ))}
              </div>

              {/* Mini legend for days bar */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
                {daysBreakdown.items.slice(0, 3).map(item => (
                  <span key={item.name} className="inline-flex items-center gap-1.5 text-[11px] text-[#667085]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate max-w-[80px]">{item.name}</span>
                    <strong className="text-[#101828] font-mono">{item.days}d</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick link to Team Calendar */}
          <Link
            to="/manager/calendar"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-medium text-[#0B6E6E] bg-[#E6F4F4] hover:bg-[#D5EFEF] rounded-[6px] transition-colors"
          >
            <span>Open Interactive Team Calendar</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue (main, 2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7] flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#101828]">Pending Approvals</h2>
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-[#E6F4F4] text-[#0B6E6E]">
                      Filtered: {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="hover:text-[#095A5A]"
                        title="Clear filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Requests awaiting your decision ({filteredPending.length} shown)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-[#667085] hover:text-[#101828] underline font-medium"
                  >
                    Clear Filter
                  </button>
                )}
                <Link
                  to="/manager/queue"
                  id="view-full-queue-link"
                  className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium transition-colors"
                >
                  Full queue &rarr;
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    {['Employee', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queueLoading ? (
                    <SkeletonRows rows={4} />
                  ) : filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          title={selectedCategory ? `No requests matching "${selectedCategory}"` : 'No pending requests.'}
                          description={
                            selectedCategory
                              ? 'Try clicking "Clear Filter" to view all requests.'
                              : 'All requests have been reviewed.'
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredPending.map(r => (
                      <tr key={r.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <InitialsAvatar name={r.employeeName} size="sm" />
                            <div>
                              <div className="text-sm font-medium text-[#101828]">{r.employeeName}</div>
                              <div className="text-xs text-[#667085] font-mono">{r.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#475467]">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getLeaveTypeColor(r.leaveTypeName) }}
                            />
                            {r.leaveTypeName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">
                          {formatDate(r.startDate)} to {formatDate(r.endDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-[#475467]">
                          {r.workingDays}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={r.status} />
                            <EscalationBadge level={r.escalationLevel} />
                            {r.conflictFlag && (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded"
                                style={{ backgroundColor: '#FFFAEB', color: '#B54708' }}>
                                Conflict
                              </span>
                            )}
                            {r.coverageStatus === 'FULL' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#ECFDF3] text-[#067647]">
                                <ShieldCheck className="w-3 h-3 mr-0.5" /> Covered
                              </span>
                            )}
                            {r.coverageStatus === 'NONE' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#FEF3F2] text-[#B42318]">
                                No Coverage
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/manager/queue/${r.id}`}
                            className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-semibold"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Rail */}
        <div className="flex flex-col gap-4">
          {/* Escalated */}
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h2 className="text-sm font-semibold text-[#101828]">Escalated to You</h2>
              <p className="text-xs text-[#667085] mt-0.5">Passed initial manager stage deadline</p>
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {(escalated?.length ?? 0) === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#667085]">No escalated requests.</p>
                </div>
              ) : (
                escalated?.slice(0, 5).map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#101828] truncate">{r.employeeName}</div>
                      <div className="text-xs text-[#667085] truncate">
                        {r.leaveTypeName} · {r.workingDays} days
                      </div>
                    </div>
                    <EscalationBadge level={r.escalationLevel} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
            <h2 className="text-sm font-semibold text-[#101828] mb-3">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                to="/manager/calendar"
                id="team-calendar-link"
                className="flex items-center justify-between px-3 py-2 text-sm text-[#475467] hover:bg-[#F5F6F8] rounded-[6px] transition-colors"
              >
                Team Calendar
                <span className="text-[#667085]">»</span>
              </Link>
              <Link
                to="/manager/queue?scope=history"
                id="queue-history-link"
                className="flex items-center justify-between px-3 py-2 text-sm text-[#475467] hover:bg-[#F5F6F8] rounded-[6px] transition-colors"
              >
                Approval History
                <span className="text-[#667085]">»</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
