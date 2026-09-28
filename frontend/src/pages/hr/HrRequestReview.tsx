import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronLeft, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge, EscalationBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import type { LeaveDetail, ApiError } from '../../types/api';

function TimelineIcon({ event }: { event: string }) {
  if (event.includes('APPROVED') || event.includes('ACCEPTED')) return <CheckCircle2 size={16} className="text-[#067647]" strokeWidth={1.5} />;
  if (event.includes('REJECTED') || event.includes('DECLINED')) return <XCircle size={16} className="text-[#B42318]" strokeWidth={1.5} />;
  return <Clock size={16} className="text-[#667085]" strokeWidth={1.5} />;
}

function friendlyEvent(evt: string): string {
  const map: Record<string, string> = {
    SUBMITTED: 'Submitted', SUBMIT_TO_HR: 'Submitted directly to HR',
    MANAGER_APPROVED: 'Approved by manager', MANAGER_REJECTED: 'Rejected by manager',
    HR_APPROVED: 'Approved by HR', HR_REJECTED: 'Rejected by HR',
    CANCELLED: 'Cancelled', ESCALATED: 'Escalated',
    MANAGER_STAGE_SKIPPED: 'Manager stage skipped (no manager)',
  };
  return map[evt] ?? evt;
}

export default function HrRequestReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: req, isLoading, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.get<LeaveDetail>(`/leave-requests/${id}`),
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment?: string }) =>
      api.post(`/leave-requests/${id}/hr/${action}`, {
        expectedStatus: req?.status,
        comment: comment ?? undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] });
      qc.invalidateQueries({ queryKey: ['hr-queue'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      refetch();
      setShowRejectForm(false);
    },
    onError: (err: ApiError) => {
      if (err.code === 'STALE_STATE') {
        setActionError('This request was just updated. Refreshing...');
        refetch();
      } else if (err.code === 'ILLEGAL_TRANSITION') {
        setActionError('This action is not allowed in the current state (for example, HR cannot approve before the manager).');
        refetch();
      } else {
        setActionError(err.detail ?? 'Action failed.');
      }
    },
  });

  function handleAction(action: 'approve' | 'reject') {
    if (action === 'reject' && !rejectComment.trim()) {
      setActionError('A comment is required when rejecting.');
      return;
    }
    setActionError(null);
    actionMutation.mutate({ action, comment: action === 'reject' ? rejectComment : undefined });
  }

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

  const canHrApprove = req.allowedActions.includes('HR_APPROVE');
  const canHrReject = req.allowedActions.includes('HR_REJECT');

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
            ...(req.estimatedDeduction > 0 ? [{ label: 'Est. deduction', value: formatMoney(req.estimatedDeduction) }] : []),
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

        {req.deductionBreakdown.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#F2F4F7]">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em] mb-2">Deduction breakdown</p>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-[#667085] pb-1">Month</th>
                  <th className="text-right text-[#667085] pb-1">Unpaid days</th>
                  <th className="text-right text-[#667085] pb-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {req.deductionBreakdown.map(e => (
                  <tr key={e.month}>
                    <td className="text-[#475467] py-0.5">{e.month}</td>
                    <td className="text-right font-mono">{e.unpaidDays}</td>
                    <td className="text-right font-mono text-[#B42318]">{formatMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coverage with amounts (HR can see) */}
      {req.coverageAssignments.length > 0 && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[#475467]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#101828]">Coverage</h2>
            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${
              req.coverageStatus === 'FULL' ? 'bg-[#ECFDF3] text-[#067647]' :
              req.coverageStatus === 'PARTIAL' ? 'bg-[#FFFAEB] text-[#B54708]' :
              'bg-[#F2F4F7] text-[#475467]'
            }`}>{req.coverageStatus}</span>
          </div>
          <div className="flex flex-col gap-2">
            {req.coverageAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[#F9FAFB] px-3 py-2 rounded-[6px]">
                <div className="flex items-center gap-2">
                  <InitialsAvatar name={a.coveringEmployeeName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-[#101828]">{a.coveringEmployeeName}</p>
                    <p className="text-xs text-[#667085]">{a.sharePercent}% share, {a.coveredDays} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-[#0B6E6E]">{formatMoney(a.allowanceAmount)}</p>
                  <span className={`text-xs font-medium ${a.status === 'ACCEPTED' ? 'text-[#067647]' : 'text-[#B54708]'}`}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
        <h2 className="text-sm font-semibold text-[#101828] mb-4">Timeline</h2>
        {req.timeline.length === 0 ? (
          <p className="text-sm text-[#667085]">No events yet.</p>
        ) : (
          <ol className="relative border-l border-[#E4E7EC] ml-3 flex flex-col gap-0">
            {req.timeline.map((evt, i) => (
              <li key={evt.id} className={`ml-4 ${i < req.timeline.length - 1 ? 'pb-5' : ''}`}>
                <div className="absolute -left-[9px] flex items-center justify-center w-[18px] h-[18px] bg-white">
                  <TimelineIcon event={evt.eventType} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#101828]">{friendlyEvent(evt.eventType)}</p>
                  <p className="text-xs text-[#667085]">by {evt.actorName} · {formatDateTime(evt.createdAt)}</p>
                  {evt.comments && <p className="mt-1 text-sm text-[#475467] italic">&ldquo;{evt.comments}&rdquo;</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* HR Actions */}
      {(canHrApprove || canHrReject) && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#101828]">HR Decision</h2>

          {showRejectForm ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-[#344054] mb-1 block" htmlFor="hr-reject-comment">Rejection reason (required)</label>
                <textarea
                  id="hr-reject-comment"
                  rows={3}
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Explain why this request is being rejected."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] resize-none focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="hr-confirm-reject-btn"
                  onClick={() => handleAction('reject')}
                  disabled={actionMutation.isPending}
                  className="h-9 px-4 border border-[#B42318] text-[#B42318] text-sm font-medium rounded-[6px] hover:bg-[#FEF3F2] disabled:opacity-50 transition-colors"
                >
                  {actionMutation.isPending ? 'Rejecting...' : 'Confirm rejection'}
                </button>
                <button onClick={() => setShowRejectForm(false)}
                  className="h-9 px-4 border border-[#D0D5DD] text-[#344054] text-sm font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canHrApprove && (
                <button
                  id="hr-approve-btn"
                  onClick={() => handleAction('approve')}
                  disabled={actionMutation.isPending}
                  className="h-9 px-4 bg-[#0B6E6E] text-white text-sm font-medium rounded-[6px] hover:bg-[#095A5A] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
                >
                  {actionMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              )}
              {canHrReject && (
                <button
                  id="hr-reject-btn"
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
