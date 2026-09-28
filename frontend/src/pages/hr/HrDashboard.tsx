import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { KpiCard } from '../../components/ui/KpiCard';
import { SkeletonCard, SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { formatDate } from '../../lib/format';
import type { DashboardSummary, LeaveSummary } from '../../types/api';

export default function HrDashboard() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['hr-queue'],
    queryFn: () => api.get<LeaveSummary[]>('/hr/queue?scope=pending'),
  });

  const { data: escalated } = useQuery({
    queryKey: ['hr-escalated'],
    queryFn: () => api.get<LeaveSummary[]>('/hr/queue?scope=escalated'),
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">HR Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[#667085]">{today}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              label="Awaiting HR Approval"
              value={summary?.awaitingHrCount ?? 0}
              accent
            />
            <KpiCard
              label="Total Escalated"
              value={summary?.totalEscalatedCount ?? 0}
            />
            <KpiCard
              label="On Leave Today"
              value={summary?.employeesOnLeaveTodayCount ?? 0}
              sub="employees across all teams"
            />
            <KpiCard
              label="Requests This Month"
              value={summary?.requestsThisMonthCount ?? 0}
            />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Queue Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">HR Approval Queue</h2>
                <p className="text-xs text-[#667085] mt-0.5">Requests awaiting HR review</p>
              </div>
              <Link
                to="/hr/queue"
                id="view-hr-queue-link"
                className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium transition-colors"
              >
                Full queue
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    {['Employee', 'Team', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queueLoading ? (
                    <SkeletonRows rows={5} />
                  ) : (queue?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState title="No pending requests." description="All requests have been reviewed." />
                      </td>
                    </tr>
                  ) : (
                    queue?.map(r => (
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
                        <td className="px-4 py-3 text-sm text-[#475467]">{r.teamName ?? '--'}</td>
                        <td className="px-4 py-3 text-sm text-[#475467]">{r.leaveTypeName}</td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467] text-xs">
                          {formatDate(r.startDate)}<br />
                          <span className="text-[#667085]">to {formatDate(r.endDate)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-[#475467]">
                          {r.workingDays}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={r.status} />
                            <EscalationBadge level={r.escalationLevel} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/hr/queue/${r.id}`}
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
          {/* Escalated Panel */}
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h2 className="text-sm font-semibold text-[#101828]">Escalated Requests</h2>
              <p className="text-xs text-[#667085] mt-0.5">Past stage deadline</p>
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {(escalated?.length ?? 0) === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#667085]">No escalated requests.</p>
                </div>
              ) : (
                escalated?.slice(0, 6).map(r => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#101828] truncate">{r.employeeName}</div>
                        <div className="text-xs text-[#667085]">
                          {r.teamName} · {r.leaveTypeName} · {r.workingDays} days
                        </div>
                      </div>
                      <EscalationBadge level={r.escalationLevel} />
                    </div>
                    <div className="mt-1.5">
                      <Link
                        to={`/hr/queue/${r.id}`}
                        className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium"
                      >
                        Review →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
            <h2 className="text-sm font-semibold text-[#101828] mb-3">Admin Actions</h2>
            <div className="flex flex-col gap-1.5">
              {[
                { to: '/hr/requests', label: 'All Requests', id: 'all-requests-link' },
                { to: '/hr/employees', label: 'Employee Registry', id: 'employee-registry-link' },
                { to: '/hr/payroll', label: 'Payroll Adjustments', id: 'payroll-link' },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  id={link.id}
                  className="flex items-center justify-between px-3 py-2 text-sm text-[#475467] hover:bg-[#F5F6F8] rounded-[6px] transition-colors"
                >
                  {link.label}
                  <span className="text-[#667085]">»</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
