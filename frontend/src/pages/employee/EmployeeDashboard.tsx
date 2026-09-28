import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { KpiCard } from '../../components/ui/KpiCard';
import { SkeletonCard, SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/format';
import type { DashboardSummary, LeaveSummary, LeaveBalance } from '../../types/api';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  const { data: requests, isLoading: reqLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => api.get<LeaveSummary[]>('/leave-requests/mine'),
  });

  const { data: balances, isLoading: balLoading } = useQuery({
    queryKey: ['balances'],
    queryFn: () => api.get<LeaveBalance[]>('/me/balances'),
  });

  const recentRequests = requests?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
          Welcome back, {user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-[#667085]">{today}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              label="Annual Leave Available"
              value={`${summary?.availableAnnualLeave ?? 0} days`}
              accent
            />
            <KpiCard
              label="Sick Leave Available"
              value={`${summary?.availableSickLeave ?? 0} days`}
            />
            <KpiCard
              label="Casual Leave Available"
              value={`${summary?.availableCasualLeave ?? 0} days`}
            />
            <KpiCard
              label="Pending Requests"
              value={summary?.pendingRequestsCount ?? 0}
              sub={`${summary?.waitingCoverageOffersCount ?? 0} coverage offer(s) waiting`}
            />
          </>
        )}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Balances */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h2 className="text-sm font-semibold text-[#101828]">Leave Balances</h2>
              <p className="text-xs text-[#667085] mt-0.5">{new Date().getFullYear()} entitlements</p>
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {balLoading ? (
                <div className="p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="mb-4">
                      <div className="h-3 w-24 bg-[#F2F4F7] rounded animate-pulse mb-2" />
                      <div className="h-2 w-full bg-[#F2F4F7] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : balances?.filter(b => b.entitled > 0 || b.available > 0).length === 0 ? (
                <EmptyState title="No balance records" />
              ) : (
                balances?.filter(b => b.entitled > 0 || b.available > 0).map(b => {
                  const total = b.entitled + b.carried + b.adjustment;
                  const usedPct = total > 0 ? Math.round((b.used / total) * 100) : 0;
                  const pendingPct = total > 0 ? Math.round((b.pending / total) * 100) : 0;
                  const availPct = Math.max(0, 100 - usedPct - pendingPct);

                  return (
                    <div key={b.id} className="px-5 py-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-[#101828]">{b.leaveTypeName}</span>
                        <span className="text-sm font-semibold font-mono text-[#0B6E6E]">
                          {b.available} left
                        </span>
                      </div>
                      {/* Balance Bar */}
                      <div className="h-2 rounded-full overflow-hidden bg-[#F2F4F7] flex">
                        <div className="bg-[#B42318] h-full transition-all" style={{ width: `${usedPct}%` }} title="Used" />
                        <div className="bg-[#F79009] h-full transition-all" style={{ width: `${pendingPct}%` }} title="Pending" />
                        <div className="bg-[#0B6E6E] h-full transition-all" style={{ width: `${availPct}%` }} title="Available" />
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[11px] text-[#667085]">
                        <span><span className="font-mono">{b.used}</span> used</span>
                        {b.pending > 0 && <span><span className="font-mono">{b.pending}</span> pending</span>}
                        <span className="ml-auto"><span className="font-mono">{total}</span> total</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#F2F4F7]">
              <Link
                to="/employee/apply"
                id="apply-leave-link"
                className="text-sm font-medium text-[#0B6E6E] hover:text-[#095A5A] transition-colors"
              >
                Apply for leave
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Recent Requests</h2>
                <p className="text-xs text-[#667085] mt-0.5">Your most recent leave submissions</p>
              </div>
              <Link
                to="/employee/requests"
                id="view-all-requests-link"
                className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    {['Type', 'Dates', 'Days', 'Status', ''].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reqLoading ? (
                    <SkeletonRows rows={4} />
                  ) : recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No requests yet." description="Apply for leave to see your requests here." />
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map(r => (
                      <tr key={r.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3 text-sm text-[#101828] font-medium">{r.leaveTypeName}</td>
                        <td className="px-4 py-3 text-sm text-[#475467] font-mono tabular-nums">
                          {formatDate(r.startDate)}
                          {r.startDate !== r.endDate && <><br /><span className="text-[#667085]">to {formatDate(r.endDate)}</span></>}
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
                            to={`/employee/requests/${r.id}`}
                            className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium"
                          >
                            View
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
      </div>
    </div>
  );
}
