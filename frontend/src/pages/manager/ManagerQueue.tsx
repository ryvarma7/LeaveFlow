import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { formatDate } from '../../lib/format';
import type { LeaveSummary, LeaveStatus } from '../../types/api';

const TABS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Escalated to me', value: 'escalated' },
  { label: 'History', value: 'history' },
];

export default function ManagerQueue() {
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { data: queue, isLoading } = useQuery({
    queryKey: ['manager-queue', tab],
    queryFn: () => api.get<LeaveSummary[]>(`/manager/queue?scope=${tab}`),
  });

  const totalPages = Math.ceil((queue?.length ?? 0) / PAGE_SIZE);
  const paginated = (queue ?? []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Approval Queue</h1>
        <p className="mt-1 text-sm text-[#667085]">Leave requests from your team awaiting your action.</p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        <div className="flex items-center border-b border-[#E4E7EC]">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(0); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
                tab === t.value
                  ? 'border-[#0B6E6E] text-[#0B6E6E]'
                  : 'border-transparent text-[#475467] hover:text-[#101828]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                {['Employee', 'Type', 'Dates', 'Days', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows rows={5} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title={tab === 'pending' ? 'No pending requests.' : tab === 'escalated' ? 'No escalated requests.' : 'No history yet.'}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(r => (
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
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-right text-[#475467]">{r.workingDays}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status as LeaveStatus} />
                        <EscalationBadge level={r.escalationLevel} />
                        {r.conflictFlag && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#FFFAEB] text-[#B54708]">Conflict</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/manager/queue/${r.id}`}
                        className="text-xs text-[#0B6E6E] hover:text-[#095A5A] font-medium"
                      >
                        {tab === 'history' ? 'View' : 'Review'}
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
              {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, queue?.length ?? 0)} of {queue?.length ?? 0}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
              >Previous</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="h-8 px-3 text-sm border border-[#D0D5DD] rounded-[6px] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
