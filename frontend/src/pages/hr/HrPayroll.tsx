import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { PayrollStatement, Team } from '../../types/api';

function monthOptions(): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts;
}

function StatusPill({ status }: { status: 'CONFIRMED' | 'PROJECTED' }) {
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
      status === 'CONFIRMED' ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FFFAEB] text-[#B54708]'
    }`}>{status}</span>
  );
}

export default function HrPayroll() {
  const months = monthOptions();
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [teamFilter, setTeamFilter] = useState('');

  const { data: teams } = useQuery({
    queryKey: ['hr-teams'],
    queryFn: () => api.get<Team[]>('/hr/teams'),
  });

  const params = new URLSearchParams({ month: selectedMonth });
  if (teamFilter) params.set('teamId', teamFilter);

  const { data: statements, isLoading, isError } = useQuery({
    queryKey: ['hr-payroll', selectedMonth, teamFilter],
    queryFn: () => api.get<PayrollStatement[]>(`/hr/payroll/adjustments?${params}`),
  });

  const totalLop = statements?.reduce((s, st) => s + st.confirmedLopDeduction + st.projectedLopDeduction, 0) ?? 0;
  const totalAllowance = statements?.reduce((s, st) => s + st.confirmedCoverageAllowance + st.projectedCoverageAllowance, 0) ?? 0;
  const totalNet = totalAllowance - totalLop;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Payroll Adjustments</h1>
        <p className="mt-1 text-sm text-[#667085]">Leave deductions and coverage allowances by employee. Estimated deduction. Final payroll may differ.</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="h-9 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          className="h-9 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1"
        >
          <option value="">All teams</option>
          {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Totals row */}
      {statements && statements.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Total LOP deduction</p>
            <p className="text-xl font-semibold font-mono text-[#B42318] mt-1">-{formatMoney(totalLop)}</p>
          </div>
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Total coverage allowance</p>
            <p className="text-xl font-semibold font-mono text-[#0B6E6E] mt-1">+{formatMoney(totalAllowance)}</p>
          </div>
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
            <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Net adjustment</p>
            <p className={`text-xl font-semibold font-mono mt-1 ${totalNet >= 0 ? 'text-[#067647]' : 'text-[#B42318]'}`}>
              {totalNet >= 0 ? '+' : ''}{formatMoney(totalNet)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                {['Employee', 'Team', 'Base salary', 'LOP deduction', 'Coverage allowance', 'Net adjustment'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows rows={5} />
              ) : isError ? (
                <tr><td colSpan={6}><div className="p-8 text-center text-sm text-[#B42318]">Failed to load payroll data.</div></td></tr>
              ) : (statements?.length ?? 0) === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No payroll data for this period." /></td></tr>
              ) : (
                <>
                  {statements!.map(stmt => {
                    const lop = stmt.confirmedLopDeduction + stmt.projectedLopDeduction;
                    const allowance = stmt.confirmedCoverageAllowance + stmt.projectedCoverageAllowance;
                    const net = allowance - lop;
                    return (
                      <tr key={stmt.employeeId} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[#101828]">{stmt.employeeName}</div>
                          <div className="text-xs text-[#667085] font-mono">{stmt.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#475467]">{stmt.teamName ?? '--'}</td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">{formatMoney(stmt.baseSalary)}</td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#B42318]">
                          {lop > 0 ? `-${formatMoney(lop)}` : '--'}
                          <div className="flex gap-1.5 mt-0.5">
                            {stmt.confirmedLopDeduction > 0 && <StatusPill status="CONFIRMED" />}
                            {stmt.projectedLopDeduction > 0 && <StatusPill status="PROJECTED" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#0B6E6E]">
                          {allowance > 0 ? `+${formatMoney(allowance)}` : '--'}
                          <div className="flex gap-1.5 mt-0.5">
                            {stmt.confirmedCoverageAllowance > 0 && <StatusPill status="CONFIRMED" />}
                            {stmt.projectedCoverageAllowance > 0 && <StatusPill status="PROJECTED" />}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm font-mono tabular-nums font-semibold ${net >= 0 ? 'text-[#067647]' : 'text-[#B42318]'}`}>
                          {net === 0 ? '--' : `${net >= 0 ? '+' : ''}${formatMoney(net)}`}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
