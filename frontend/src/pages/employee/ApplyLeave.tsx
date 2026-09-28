import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, CalendarX } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import type { LeaveType, LeavePreviewResponse, ApiError } from '../../types/api';

const schema = z.object({
  leaveTypeId: z.coerce.number().min(1, 'Select a leave type'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
  reason: z.string().max(500).optional(),
  handoverNotes: z.string().max(1000).optional(),
  acknowledgeUnpaid: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function fieldError(code: string): string {
  const map: Record<string, string> = {
    OVERLAPPING_REQUEST: 'You already have a leave request for this period.',
    COVERAGE_COMMITMENT_CONFLICT: 'You have accepted coverage on these dates. Ask your manager to reassign first.',
    WEEKEND_ONLY: 'The selected range contains no working days.',
    DATE_BEFORE_JOIN: 'Start date is before your join date.',
    CROSS_YEAR: 'Leave request must be within a single calendar year.',
    MAX_HORIZON_EXCEEDED: 'Request too far in the future.',
    BACKDATE_EXCEEDED: 'Start date is too far in the past for this leave type.',
    NO_ELIGIBLE_APPROVER: 'No approver could be found for this request. Contact HR.',
  };
  return map[code] ?? `Request failed: ${code}`;
}

export default function ApplyLeave() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<LeavePreviewResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get<LeaveType[]>('/leave-types'),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const watchedFields = watch(['leaveTypeId', 'startDate', 'endDate']);

  const { isFetching: previewLoading } = useQuery({
    queryKey: ['preview', ...watchedFields],
    queryFn: async () => {
      const [leaveTypeId, startDate, endDate] = watchedFields;
      if (!leaveTypeId || !startDate || !endDate) return null;
      const data = await api.post<LeavePreviewResponse>('/leave-requests/preview', {
        leaveTypeId: Number(leaveTypeId),
        startDate,
        endDate,
      });
      setPreview(data);
      return data;
    },
    enabled: !!(watchedFields[0] && watchedFields[1] && watchedFields[2]),
  });

  const submitMutation = useMutation({
    mutationFn: (body: object) => api.post<{ id: number }>('/leave-requests', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      navigate(`/employee/requests/${res.id}`);
    },
    onError: (err: ApiError) => {
      if (err.code === 'UNPAID_ACKNOWLEDGEMENT_REQUIRED') {
        setSubmitError('Please acknowledge the unpaid days before submitting.');
      } else {
        setSubmitError(fieldError(err.code));
      }
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    submitMutation.mutate({
      leaveTypeId: Number(values.leaveTypeId),
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason || undefined,
      handoverNotes: values.handoverNotes || undefined,
      acknowledgeUnpaid: values.acknowledgeUnpaid ?? false,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Apply for Leave</h1>
        <p className="mt-1 text-sm text-[#667085]">Submit a new leave request. Working days and balance are calculated automatically.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[#101828]">Leave details</h2>

          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1" htmlFor="leaveTypeId">Leave type</label>
            <select
              id="leaveTypeId"
              {...register('leaveTypeId')}
              className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
            >
              <option value="">Select type</option>
              {leaveTypes?.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            {errors.leaveTypeId && <p className="mt-1 text-xs text-[#B42318]">{errors.leaveTypeId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-1" htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
              />
              {errors.startDate && <p className="mt-1 text-xs text-[#B42318]">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-1" htmlFor="endDate">End date</label>
              <input
                id="endDate"
                type="date"
                min={watchedFields[1] || today}
                {...register('endDate')}
                className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
              />
              {errors.endDate && <p className="mt-1 text-xs text-[#B42318]">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1" htmlFor="reason">Reason <span className="text-[#667085] font-normal">(optional)</span></label>
            <textarea
              id="reason"
              rows={2}
              maxLength={500}
              {...register('reason')}
              placeholder="Brief reason for leave"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1" htmlFor="handoverNotes">Handover notes <span className="text-[#667085] font-normal">(optional, max 1000 chars)</span></label>
            <textarea
              id="handoverNotes"
              rows={3}
              maxLength={1000}
              {...register('handoverNotes')}
              placeholder="What needs to be covered while you are away?"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
            />
          </div>
        </div>

        {previewLoading && (
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
            <div className="h-3 w-32 bg-[#F2F4F7] rounded animate-pulse mb-3" />
            <div className="h-2 w-full bg-[#F2F4F7] rounded animate-pulse mb-2" />
            <div className="h-2 w-3/4 bg-[#F2F4F7] rounded animate-pulse" />
          </div>
        )}

        {preview && !previewLoading && (
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-[#101828]">Leave preview</h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Working days', value: String(preview.workingDays) },
                { label: 'Paid days', value: String(preview.paidDays) },
                { label: 'Balance after', value: `${preview.balanceAfter} days` },
              ].map(item => (
                <div key={item.label} className="bg-[#F9FAFB] rounded-[6px] px-3 py-2">
                  <div className="text-[11px] text-[#667085] uppercase tracking-[0.04em]">{item.label}</div>
                  <div className="text-base font-semibold font-mono text-[#101828] mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>

            {preview.conflictWarning && (
              <div className="flex items-start gap-2.5 p-3 bg-[#FFFAEB] border border-[#FEC84B] rounded-[6px]">
                <AlertTriangle size={16} className="text-[#B54708] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm text-[#B54708]">
                  {preview.teammateAbsenceCount} teammate(s) are already off during this period. The team conflict threshold may be exceeded.
                </span>
              </div>
            )}

            {preview.excludedDates.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px]">
                <CalendarX size={16} className="text-[#475467] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div className="text-sm text-[#475467]">
                  <span className="font-medium">Excluded dates:</span>{' '}
                  {preview.excludedDates.map(ed => `${formatDate(ed.date)} (${ed.reason})`).join(', ')}
                </div>
              </div>
            )}

            {preview.unpaidDays > 0 && (
              <div className="p-4 bg-[#FEF3F2] border border-[#FDA29B] rounded-[6px] flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[#B42318] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-[#B42318]">
                      {preview.unpaidDays} of {preview.workingDays} days exceed your paid leave.
                    </p>
                    {preview.salarySet ? (
                      <p className="text-sm text-[#B42318] mt-0.5">
                        Estimated deduction: {formatMoney(preview.estimatedDeduction)}. Final payroll may differ.
                      </p>
                    ) : (
                      <p className="text-sm text-[#B42318] mt-0.5">Salary not set. Contact HR to see estimated deduction.</p>
                    )}
                  </div>
                </div>

                {preview.deductionBreakdown.length > 0 && preview.salarySet && (
                  <div className="ml-6">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-[#667085] font-medium pb-1">Month</th>
                          <th className="text-right text-[#667085] font-medium pb-1">Unpaid days</th>
                          <th className="text-right text-[#667085] font-medium pb-1">Deduction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.deductionBreakdown.map(entry => (
                          <tr key={entry.month}>
                            <td className="text-[#475467] py-0.5">{entry.month}</td>
                            <td className="text-right font-mono text-[#475467] py-0.5">{entry.unpaidDays}</td>
                            <td className="text-right font-mono text-[#B42318] py-0.5">{formatMoney(entry.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer ml-6">
                  <input
                    type="checkbox"
                    id="acknowledgeUnpaid"
                    {...register('acknowledgeUnpaid')}
                    className="mt-0.5 accent-[#0B6E6E]"
                  />
                  <span className="text-sm text-[#B42318]">
                    I understand that {preview.unpaidDays} day(s) will be unpaid and acknowledge the estimated salary deduction.
                  </span>
                </label>
              </div>
            )}

            {preview.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px]">
                <Info size={15} className="text-[#475467] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm text-[#475467]">{w}</span>
              </div>
            ))}
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-[#FEF3F2] border border-[#FDA29B] rounded-[6px] text-sm text-[#B42318]">
            {submitError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            id="submit-leave-btn"
            disabled={submitMutation.isPending}
            className="h-10 px-5 bg-[#0B6E6E] text-white text-sm font-medium rounded-[6px] hover:bg-[#095A5A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit request'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/employee/dashboard')}
            className="h-10 px-5 bg-white border border-[#D0D5DD] text-[#344054] text-sm font-medium rounded-[6px] hover:bg-[#F9FAFB] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
