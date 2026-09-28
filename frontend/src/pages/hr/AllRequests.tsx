import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { formatDate } from '../../lib/format';
import type { LeaveSummary, LeaveStatus, Team } from '../../types/api';

interface HrRequestsResponse {
  content: LeaveSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export default function AllRequests() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const PAGE_SIZE = 15;

  const { data: teams } = useQuery({
    queryKey: ['hr-teams'],
    queryFn: () => api.get<Team[]>('/hr/teams'),
  });

  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (statusFilter) params.set('status', statusFilter);
  if (teamFilter) params.set('teamId', teamFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['hr-requests', page, statusFilter, teamFilter],
    queryFn: () => api.get<HrRequestsResponse | LeaveSummary[]>(`/hr/leave-requests?${params}`),
  });

  // Support both paginated and plain array response
  const items: LeaveSummary[] = Array.isArray(data) ? data : (data as HrRequestsResponse)?.content ?? [];
  const totalPages = Array.isArray(data) ? Math.ceil(items.length / PAGE_SIZE) : (data as HrRequestsResponse)?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">All Requests</h1>
        <p className="mt-1 text-sm text-[#667085]">All leave requests across the organisation.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="h-9 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
        >
          <option value="">All statuses</option>
          <option value="PENDING_MANAGER">Pending Manager</option>
          <option value="PENDING_HR">Pending HR</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={teamFilter}
          onChange={e => { setTeamFilter(e.target.value); setPage(0); }}
          className="h-9 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
        >
          <option value="">All teams</option>
          {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(statusFilter || teamFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setTeamFilter(''); setPage(0); }}
            className="text-sm text-[#475467] hover:text-[#101828] underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                {['Employee', 'Team', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows rows={8} />
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No requests found." /></td></tr>
              ) : (
                items.map(r => (
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
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">
                      {formatDate(r.startDate)} to {formatDate(r.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-[#475467]">{r.workingDays}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status as LeaveStatus} />
                        <EscalationBadge level={r.escalationLevel} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/hr/queue/${r.id}`} className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#F2F4F7]">
            <span className="text-sm text-[#667085]">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
