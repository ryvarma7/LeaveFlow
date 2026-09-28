import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { formatDate } from '../../lib/format';
import type { LeaveSummary, LeaveStatus } from '../../types/api';

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

function matchesTab(r: LeaveSummary, tab: string) {
  if (tab === 'all') return true;
  if (tab === 'pending') return r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR';
  return r.status.toLowerCase() === tab;
}

export default function MyRequests() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { data: requests, isLoading, isError } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => api.get<LeaveSummary[]>('/leave-requests/mine'),
  });

  const filtered = (requests ?? []).filter(r => matchesTab(r, tab));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">My Requests</h1>
        <p className="mt-1 text-sm text-[#667085]">All your leave submissions.</p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        {/* Status filter tabs */}
        <div className="flex items-center gap-0 border-b border-[#E4E7EC] overflow-x-auto">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(0); }}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
                tab === t.value
                  ? 'border-[#0B6E6E] text-[#0B6E6E]'
                  : 'border-transparent text-[#475467] hover:text-[#101828]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto px-4 py-3">
            <Link
              to="/employee/apply"
              id="apply-leave-btn"
              className="h-8 px-3 bg-[#0B6E6E] text-white text-xs font-medium rounded-[6px] hover:bg-[#095A5A] transition-colors flex items-center"
            >
              Apply leave
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                {['Request no.', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows rows={5} />
              ) : isError ? (
                <tr><td colSpan={6}><div className="p-8 text-center text-sm text-[#B42318]">Failed to load requests.</div></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No requests." description="Apply for leave to see your requests here." /></td></tr>
              ) : (
                paginated.map(r => (
                  <tr key={r.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-[#475467]">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#101828]">{r.leaveTypeName}</td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">
                      {formatDate(r.startDate)}
                      {r.startDate !== r.endDate && <><br /><span className="text-[#667085]">to {formatDate(r.endDate)}</span></>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-[#475467]">{r.workingDays}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status as LeaveStatus} />
                        <EscalationBadge level={r.escalationLevel} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/employee/requests/${r.id}`} className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#F2F4F7]">
            <span className="text-sm text-[#667085]">
              Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
