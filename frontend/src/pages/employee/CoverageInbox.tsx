import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import type { CoverageInbox, CoverageAssignment, ApiError } from '../../types/api';

function AssignmentCard({ a, onAccept, onDecline, loading }: {
  a: CoverageAssignment;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  loading: boolean;
}) {
  return (
    <div className="border border-[#E4E7EC] rounded-[10px] p-4 bg-white flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <InitialsAvatar name={a.requesterName} size="sm" />
          <div>
            <p className="text-sm font-medium text-[#101828]">{a.requesterName} is on leave</p>
            <p className="text-xs text-[#667085] font-mono">{formatDate(a.startDate)} to {formatDate(a.endDate)}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${
          a.status === 'OFFERED' ? 'bg-[#FFFAEB] text-[#B54708]' :
          a.status === 'ACCEPTED' ? 'bg-[#ECFDF3] text-[#067647]' :
          'bg-[#F2F4F7] text-[#475467]'
        }`}>{a.status}</span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-[#667085]">Your share</dt>
          <dd className="font-mono font-medium text-[#101828]">{a.sharePercent}%</dd>
        </div>
        <div>
          <dt className="text-[#667085]">Covered days</dt>
          <dd className="font-mono font-medium text-[#101828]">{a.coveredDays}</dd>
        </div>
        <div>
          <dt className="text-[#667085]">Allowance</dt>
          <dd className="font-mono font-medium text-[#0B6E6E]">{formatMoney(a.allowanceAmount)}</dd>
        </div>
      </dl>

      {a.note && (
        <p className="text-xs text-[#475467] bg-[#F9FAFB] rounded-[6px] px-3 py-2">
          <span className="font-medium">Note:</span> {a.note}
        </p>
      )}

      {a.status === 'OFFERED' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            id={`accept-coverage-${a.id}`}
            onClick={() => onAccept(a.id)}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#0B6E6E] text-white text-xs font-medium rounded-[6px] hover:bg-[#095A5A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 size={13} strokeWidth={1.5} /> Accept
          </button>
          <button
            id={`decline-coverage-${a.id}`}
            onClick={() => onDecline(a.id)}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 border border-[#D0D5DD] text-[#344054] text-xs font-medium rounded-[6px] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={13} strokeWidth={1.5} /> Decline
          </button>
          <span className="text-xs text-[#667085] ml-1">No penalty for declining.</span>
        </div>
      )}
    </div>
  );
}

export default function CoverageInboxPage() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: inbox, isLoading, isError } = useQuery({
    queryKey: ['coverage-inbox'],
    queryFn: () => api.get<CoverageInbox>('/me/coverage'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.post(`/coverage/${id}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coverage-inbox'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: ApiError) => setActionError(err.detail ?? 'Could not accept coverage.'),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => api.post(`/coverage/${id}/decline`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverage-inbox'] }),
    onError: (err: ApiError) => setActionError(err.detail ?? 'Could not decline coverage.'),
  });

  const loading = acceptMutation.isPending || declineMutation.isPending;

  const capPct = inbox ? Math.min(100, Math.round((inbox.monthlyLoadDays / inbox.monthlyCapDays) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Coverage</h1>
        <p className="mt-1 text-sm text-[#667085]">Incoming offers and your active commitments. Declining has no consequence.</p>
      </div>

      {/* Monthly cap bar */}
      {inbox && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#101828]">Monthly coverage load</span>
            <span className="text-sm font-mono text-[#475467]">
              {inbox.monthlyLoadDays} / {inbox.monthlyCapDays} days this month
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${capPct >= 90 ? 'bg-[#B42318]' : capPct >= 70 ? 'bg-[#F79009]' : 'bg-[#0B6E6E]'}`}
              style={{ width: `${capPct}%` }}
            />
          </div>
          {capPct >= 90 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#B54708]">
              <AlertTriangle size={12} strokeWidth={1.5} />
              Near monthly cap. You can still accept if within the limit.
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FDA29B] rounded-[6px] text-sm text-[#B42318]">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
          <table className="w-full"><tbody><SkeletonRows rows={3} /></tbody></table>
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-sm text-[#B42318]">Failed to load coverage inbox.</div>
      ) : (
        <>
          {/* Incoming offers */}
          <div>
            <h2 className="text-sm font-semibold text-[#475467] uppercase tracking-[0.04em] mb-3">
              Incoming offers ({inbox?.incomingOffers.length ?? 0})
            </h2>
            {(inbox?.incomingOffers.length ?? 0) === 0 ? (
              <EmptyState title="No pending coverage offers." description="You will see offers here when a manager assigns coverage to you." />
            ) : (
              <div className="flex flex-col gap-3">
                {inbox!.incomingOffers.map(a => (
                  <AssignmentCard
                    key={a.id}
                    a={a}
                    onAccept={id => acceptMutation.mutate(id)}
                    onDecline={id => declineMutation.mutate(id)}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active commitments */}
          <div>
            <h2 className="text-sm font-semibold text-[#475467] uppercase tracking-[0.04em] mb-3">
              Active commitments ({inbox?.activeCommitments.length ?? 0})
            </h2>
            {(inbox?.activeCommitments.length ?? 0) === 0 ? (
              <EmptyState title="No active commitments." />
            ) : (
              <div className="flex flex-col gap-3">
                {inbox!.activeCommitments.map(a => (
                  <div key={a.id} className="border border-[#E4E7EC] rounded-[10px] p-4 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar name={a.requesterName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#101828]">Covering for {a.requesterName}</p>
                          <p className="text-xs text-[#667085] font-mono">{formatDate(a.startDate)} to {formatDate(a.endDate)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#ECFDF3] text-[#067647]">ACCEPTED</span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-[#F2F4F7]">
                      <div><dt className="text-[#667085]">Share</dt><dd className="font-mono font-medium">{a.sharePercent}%</dd></div>
                      <div><dt className="text-[#667085]">Days</dt><dd className="font-mono font-medium">{a.coveredDays}</dd></div>
                      <div><dt className="text-[#667085]">Allowance</dt><dd className="font-mono font-medium text-[#0B6E6E]">{formatMoney(a.allowanceAmount)}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
