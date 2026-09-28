import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ChevronLeft, Users } from 'lucide-react';
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

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: req, isLoading, isError, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.get<LeaveDetail>(`/leave-requests/${id}`),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/leave-requests/${id}/cancel`, { expectedStatus: req?.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request', id] });
      qc.invalidateQueries({ queryKey: ['my-requests'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      refetch();
    },
    onError: (err: ApiError) => {
      if (err.code === 'STALE_STATE') {
        setActionError('This request was updated. Refreshing...');
        refetch();
      } else {
        setActionError(err.detail ?? 'Action failed.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
            <div className="h-3 w-48 bg-[#F2F4F7] rounded animate-pulse mb-3" />
            <div className="h-2 w-full bg-[#F2F4F7] rounded animate-pulse mb-2" />
            <div className="h-2 w-3/4 bg-[#F2F4F7] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !req) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#B42318]">Request not found or you do not have access.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-[#0B6E6E] underline">Go back</button>
      </div>
    );
  }

  const canCancel = req.allowedActions.includes('CANCEL');

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[#475467] hover:text-[#101828] transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.5} /> Back
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
            {req.leaveTypeName}
          </h1>
          <p className="mt-1 text-sm text-[#667085] font-mono">{req.requestNumber}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusBadge status={req.status} />
          <EscalationBadge level={req.escalationLevel} />
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FDA29B] rounded-[6px] text-sm text-[#B42318]">
          {actionError}
        </div>
      )}

      {/* Details card */}
      <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
        <h2 className="text-sm font-semibold text-[#101828] mb-4">Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Start date', value: formatDate(req.startDate) },
            { label: 'End date', value: formatDate(req.endDate) },
            { label: 'Working days', value: String(req.workingDays) },
            { label: 'Paid days', value: String(req.paidDays) },
            ...(req.unpaidDays > 0 ? [{ label: 'Unpaid days', value: String(req.unpaidDays) }] : []),
            { label: 'Submitted', value: formatDateTime(req.createdAt) },
          ].map(item => (
            <div key={item.label}>
              <dt className="text-[#667085]">{item.label}</dt>
              <dd className="font-medium text-[#101828] font-mono">{item.value}</dd>
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

        {req.unpaidDays > 0 && req.estimatedDeduction > 0 && (
          <div className="mt-4 pt-4 border-t border-[#F2F4F7]">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em] mb-1">Estimated deduction</p>
            <p className="text-sm font-medium text-[#B42318]">{formatMoney(req.estimatedDeduction)}</p>
            <p className="text-xs text-[#667085] mt-0.5">Estimated deduction. Final payroll may differ.</p>
          </div>
        )}
      </div>

      {/* Coverage */}
      {req.coverageAssignments.length > 0 && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
          <div className="flex items-center gap-2 mb-4">
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
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-[#F2F4F7] last:border-0">
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={a.coveringEmployeeName} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-[#101828]">{a.coveringEmployeeName}</div>
                    <div className="text-xs text-[#667085]">{a.sharePercent}% share, {a.coveredDays} days</div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  a.status === 'ACCEPTED' ? 'bg-[#ECFDF3] text-[#067647]' :
                  a.status === 'OFFERED' ? 'bg-[#FFFAEB] text-[#B54708]' :
                  'bg-[#F2F4F7] text-[#475467]'
                }`}>{a.status}</span>
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

      {/* Actions */}
      {canCancel && (
        <div className="flex items-center gap-3">
          <button
            id="cancel-request-btn"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="h-10 px-5 border border-[#B42318] text-[#B42318] text-sm font-medium rounded-[6px] hover:bg-[#FEF3F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#B42318] focus:ring-offset-2"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel request'}
          </button>
        </div>
      )}
    </div>
  );
}
