import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { KpiCard } from '../../components/ui/KpiCard';
import { SkeletonCard, SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { formatDate } from '../../lib/format';
import type { DashboardSummary, LeaveSummary } from '../../types/api';

export default function ManagerDashboard() {
  const { user } = useAuth();

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

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue (main, 2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Pending Approvals</h2>
                <p className="text-xs text-[#667085] mt-0.5">Requests awaiting your decision</p>
              </div>
              <Link
                to="/manager/queue"
                id="view-full-queue-link"
                className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium transition-colors"
              >
                Full queue
              </Link>
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
                  ) : (pending?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState title="No pending requests." description="All requests have been reviewed." />
                      </td>
                    </tr>
                  ) : (
                    pending?.map(r => (
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
                        <td className="px-4 py-3 text-sm text-[#475467]">{r.leaveTypeName}</td>
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/manager/queue/${r.id}`}
                            className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium"
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
