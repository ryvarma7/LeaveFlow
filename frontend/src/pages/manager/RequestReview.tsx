import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronLeft, AlertTriangle, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../lib/format';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { LeaveDetail, CoverageSuggestion, ApiError } from '../../types/api';

function ConflictBanner({ count, threshold }: { count: number; threshold: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-start gap-2.5 p-3 bg-[#FFFAEB] border border-[#FEC84B] rounded-[6px]">
      <AlertTriangle size={16} className="text-[#B54708] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <span className="text-sm text-[#B54708]">
        {count} teammate(s) are already absent during this period. Team threshold is {threshold}%.
        Approve only if operationally acceptable.
      </span>
    </div>
  );
}

type OfferFormData = { coveringEmployeeId: number; sharePercent: number; note?: string };

export default function RequestReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState<number | null>(null); // suggestion employee id
  const [offerShare, setOfferShare] = useState(100);
  const [offerNote, setOfferNote] = useState('');

  const { data: req, isLoading, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.get<LeaveDetail>(`/leave-requests/${id}`),
    enabled: !!id,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['coverage-suggestions', id],
    queryFn: () => api.get<CoverageSuggestion[]>(`/leave-requests/${id}/coverage/suggestions`),
    enabled: !!id && !!req && ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'].includes(req.status),
  });

  function handleAction(action: 'approve' | 'reject') {
    if (action === 'reject' && !rejectComment.trim()) {
      setActionError('A comment is required when rejecting.');
      return;
    }
    setActionError(null);
    actionMutation.mutate({ action, comment: action === 'reject' ? rejectComment : undefined });
  }

  const actionMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment?: string }) =>
      api.post(`/leave-requests/${id}/manager/${action}`, {
        expectedStatus: req?.status,
        comment: comment ?? undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] });
      qc.invalidateQueries({ queryKey: ['manager-queue'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      refetch();
      setShowRejectForm(false);
    },
    onError: (err: ApiError) => {
      if (err.code === 'STALE_STATE') {
        setActionError('This request was just updated. Refreshing...');
        refetch();
      } else {
        setActionError(err.detail ?? 'Action failed.');
      }
    },
  });

  const offerMutation = useMutation({
    mutationFn: (body: OfferFormData) =>
      api.post(`/leave-requests/${id}/coverage/offers`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] });
      qc.invalidateQueries({ queryKey: ['coverage-suggestions', id] });
      setShowOfferForm(null);
      setOfferShare(100);
      setOfferNote('');
    },
    onError: (err: ApiError) => setActionError(err.detail ?? 'Offer failed.'),
  });

  const withdrawMutation = useMutation({
    mutationFn: (assignmentId: number) => api.post(`/coverage/${assignmentId}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['request', id] }),
    onError: (err: ApiError) => setActionError(err.detail ?? 'Withdraw failed.'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
            <div className="h-3 w-48 bg-[#F2F4F7] rounded animate-pulse mb-3" />
            <div className="h-2 w-full bg-[#F2F4F7] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!req) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[#475467] hover:text-[#101828] w-fit transition-colors">
          <ChevronLeft size={16} strokeWidth={1.5} /> Back
        </button>
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-8 text-center text-sm text-[#475467]">
          Leave request not found or you do not have permission to view it.
        </div>
      </div>
    );
  }

  const canApprove = req.allowedActions.includes('MANAGER_APPROVE');
  const canReject = req.allowedActions.includes('MANAGER_REJECT');
  const activeAssignments = req.coverageAssignments.filter(a => ['OFFERED', 'ACCEPTED'].includes(a.status));
  const usedShare = activeAssignments.reduce((s, a) => s + a.sharePercent, 0);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[#475467] hover:text-[#101828] w-fit transition-colors">
        <ChevronLeft size={16} strokeWidth={1.5} /> Back to queue
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">{req.leaveTypeName}</h1>
          <p className="mt-0.5 text-sm text-[#667085] font-mono">{req.requestNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={req.status} />
          <EscalationBadge level={req.escalationLevel} />
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FDA29B] rounded-[6px] text-sm text-[#B42318]">{actionError}</div>
      )}

      {/* Employee info */}
      <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
        <div className="flex items-center gap-3 mb-4">
          <InitialsAvatar name={req.employeeName} size="md" />
          <div>
            <p className="text-sm font-semibold text-[#101828]">{req.employeeName}</p>
            <p className="text-xs text-[#667085]">{req.teamName} · <span className="font-mono">{req.employeeCode}</span></p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Start', value: formatDate(req.startDate) },
            { label: 'End', value: formatDate(req.endDate) },
            { label: 'Working days', value: String(req.workingDays) },
            { label: 'Paid days', value: String(req.paidDays) },
            ...(req.unpaidDays > 0 ? [{ label: 'Unpaid days', value: String(req.unpaidDays) }] : []),
            { label: 'Submitted', value: formatDateTime(req.createdAt) },
          ].map(item => (
            <div key={item.label}>
              <dt className="text-[#667085]">{item.label}</dt>
              <dd className="font-medium font-mono text-[#101828]">{item.value}</dd>
            </div>
          ))}
        </dl>

        {req.reason && (
          <div className="mt-4 pt-4 border-t border-[#F2F4F7]">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em] mb-1">Reason</p>
            <p className="text-sm text-[#475467]">{req.reason}</p>
          </div>
        )}

        {req.handoverNotes && (
          <div className="mt-4 pt-4 border-t border-[#F2F4F7]">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em] mb-1">Handover notes</p>
            <p className="text-sm text-[#475467]">{req.handoverNotes}</p>
          </div>
        )}
      </div>

      {/* Conflict banner */}
      {req.conflictFlag && <ConflictBanner count={1} threshold={25} />}

      {/* Stage deadline */}
      {req.stageDeadlineAt && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FFFAEB] border border-[#FEC84B] rounded-[6px]">
          <AlertTriangle size={14} className="text-[#B54708]" strokeWidth={1.5} />
          <span className="text-sm text-[#B54708]">
            Decision needed by {formatDateTime(req.stageDeadlineAt)} or it will escalate.
          </span>
        </div>
      )}

      {/* Coverage Panel */}
      <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-[#475467]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#101828]">Coverage</h2>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${
            req.coverageStatus === 'FULL' ? 'bg-[#ECFDF3] text-[#067647]' :
            req.coverageStatus === 'PARTIAL' ? 'bg-[#FFFAEB] text-[#B54708]' :
            'bg-[#F2F4F7] text-[#475467]'
          }`}>{req.coverageStatus}</span>
          <span className="text-xs text-[#667085]">
            {usedShare}% assigned of 100%
          </span>
        </div>

        {/* Current assignments */}
        {activeAssignments.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {activeAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[#F9FAFB] px-3 py-2 rounded-[6px]">
                <div className="flex items-center gap-2">
                  <InitialsAvatar name={a.coveringEmployeeName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-[#101828]">{a.coveringEmployeeName}</p>
                    <p className="text-xs text-[#667085]">{a.sharePercent}% share, {a.coveredDays} days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    a.status === 'ACCEPTED' ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FFFAEB] text-[#B54708]'
                  }`}>{a.status}</span>
                  {(canApprove || canReject) && a.status === 'OFFERED' && (
                    <button
                      onClick={() => withdrawMutation.mutate(a.id)}
                      className="text-xs text-[#B42318] hover:underline"
                    >Withdraw</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {(canApprove || canReject) && suggestions && suggestions.length > 0 && (
          <div>
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em] mb-2">Suggestions (fewest coverage days first)</p>
            <p className="text-xs text-[#667085] mb-3">Teammates can decline without consequence.</p>
            <div className="flex flex-col gap-2">
              {suggestions.filter(s => s.eligible).slice(0, 5).map(s => (
                <div key={s.employeeId}>
                  {showOfferForm === s.employeeId ? (
                    <div className="border border-[#D0D5DD] rounded-[6px] p-3 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <InitialsAvatar name={s.fullName} size="sm" />
                        <p className="text-sm font-medium text-[#101828]">{s.fullName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[#344054] font-medium mb-1 block">Share % (remaining: {100 - usedShare}%)</label>
                          <input
                            type="number"
                            min={1}
                            max={100 - usedShare}
                            value={offerShare}
                            onChange={e => setOfferShare(Number(e.target.value))}
                            className="w-full h-8 px-2 border border-[#D0D5DD] rounded-[6px] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#344054] font-medium mb-1 block">Note (optional)</label>
                          <input
                            type="text"
                            maxLength={500}
                            value={offerNote}
                            onChange={e => setOfferNote(e.target.value)}
                            placeholder="Task details..."
                            className="w-full h-8 px-2 border border-[#D0D5DD] rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => offerMutation.mutate({ coveringEmployeeId: s.employeeId, sharePercent: offerShare, note: offerNote || undefined })}
                          disabled={offerMutation.isPending}
                          className="h-8 px-3 bg-[#0B6E6E] text-white text-xs font-medium rounded-[6px] hover:bg-[#095A5A] disabled:opacity-50 transition-colors"
                        >
                          {offerMutation.isPending ? 'Sending...' : 'Send offer'}
                        </button>
                        <button
                          onClick={() => setShowOfferForm(null)}
                          className="h-8 px-3 border border-[#D0D5DD] text-[#344054] text-xs font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 border border-[#E4E7EC] rounded-[6px] hover:bg-[#F9FAFB] transition-colors">
                      <div className="flex items-center gap-2">
                        <InitialsAvatar name={s.fullName} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#101828]">{s.fullName}</p>
                          <p className="text-xs text-[#667085]">{s.coveredDaysLast90Days} covered days in 90 days · {s.eligibilityReason}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowOfferForm(s.employeeId); setOfferShare(Math.min(100, 100 - usedShare)); }}
                        className="h-7 px-2.5 text-xs text-[#0B6E6E] border border-[#0B6E6E] rounded-[6px] hover:bg-[#F0FAFA] transition-colors"
                      >Offer coverage</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve / Reject */}
      {(canApprove || canReject) && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#101828]">Decision</h2>

          {showRejectForm ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-[#344054] mb-1 block" htmlFor="reject-comment">Rejection reason (required)</label>
                <textarea
                  id="reject-comment"
                  rows={3}
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Explain why this request is being rejected."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] resize-none focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="confirm-reject-btn"
                  onClick={() => handleAction('reject')}
                  disabled={actionMutation.isPending}
                  className="h-9 px-4 border border-[#B42318] text-[#B42318] text-sm font-medium rounded-[6px] hover:bg-[#FEF3F2] disabled:opacity-50 transition-colors"
                >
                  {actionMutation.isPending ? 'Rejecting...' : 'Confirm rejection'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="h-9 px-4 border border-[#D0D5DD] text-[#344054] text-sm font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canApprove && (
                <button
                  id="manager-approve-btn"
                  onClick={() => handleAction('approve')}
                  disabled={actionMutation.isPending}
                  className="h-9 px-4 bg-[#0B6E6E] text-white text-sm font-medium rounded-[6px] hover:bg-[#095A5A] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
                >
                  {actionMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              )}
              {canReject && (
                <button
                  id="manager-reject-btn"
                  onClick={() => setShowRejectForm(true)}
                  className="h-9 px-4 border border-[#B42318] text-[#B42318] text-sm font-medium rounded-[6px] hover:bg-[#FEF3F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B42318] focus:ring-offset-2"
                >Reject</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
