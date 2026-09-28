import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { PayrollStatement } from '../../types/api';

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

export default function PayImpact() {
  const months = monthOptions();
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const { data: stmt, isLoading, isError } = useQuery({
    queryKey: ['payroll-adjustments', selectedMonth],
    queryFn: () => api.get<PayrollStatement>(`/me/payroll/adjustments?month=${selectedMonth}`),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Pay Impact</h1>
        <p className="mt-1 text-sm text-[#667085]">Estimated payroll adjustments from leave and coverage. Final payroll may differ.</p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[#344054]" htmlFor="month-select">Month</label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="h-9 px-3 border border-[#D0D5DD] rounded-[6px] text-sm text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2"
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
          <table className="w-full"><tbody><SkeletonRows rows={4} /></tbody></table>
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-sm text-[#B42318]">Failed to load payroll data.</div>
      ) : !stmt ? (
        <EmptyState title="No payroll data for this month." />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
              <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Base salary</p>
              <p className="text-xl font-semibold font-mono text-[#101828] mt-1">{formatMoney(stmt.baseSalary)}</p>
            </div>
            <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
              <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Estimated net adjustment</p>
              <p className={`text-xl font-semibold font-mono mt-1 ${stmt.netAdjustmentConfirmed + stmt.netAdjustmentProjected >= 0 ? 'text-[#067647]' : 'text-[#B42318]'}`}>
                {formatMoney(stmt.netAdjustmentConfirmed + stmt.netAdjustmentProjected)}
              </p>
              <p className="text-xs text-[#667085] mt-0.5">Estimated. Final payroll may differ.</p>
            </div>
            <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
              <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Leave deduction</p>
              <p className="text-lg font-semibold font-mono text-[#B42318] mt-1">
                -{formatMoney(stmt.confirmedLopDeduction + stmt.projectedLopDeduction)}
              </p>
              <div className="flex gap-2 mt-1 text-xs text-[#667085]">
                <span>Confirmed: {formatMoney(stmt.confirmedLopDeduction)}</span>
                <span>Projected: {formatMoney(stmt.projectedLopDeduction)}</span>
              </div>
            </div>
            <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
              <p className="text-xs text-[#667085] uppercase tracking-[0.04em]">Coverage allowance</p>
              <p className="text-lg font-semibold font-mono text-[#0B6E6E] mt-1">
                +{formatMoney(stmt.confirmedCoverageAllowance + stmt.projectedCoverageAllowance)}
              </p>
              <div className="flex gap-2 mt-1 text-xs text-[#667085]">
                <span>Confirmed: {formatMoney(stmt.confirmedCoverageAllowance)}</span>
                <span>Projected: {formatMoney(stmt.projectedCoverageAllowance)}</span>
              </div>
            </div>
          </div>

          {/* Item breakdown */}
          <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7]">
              <h2 className="text-sm font-semibold text-[#101828]">Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    {['Description', 'Days', 'Status', 'Amount'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stmt.items.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState title="No adjustments this month." /></td></tr>
                  ) : (
                    stmt.items.map((item, i) => (
                      <tr key={i} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#101828]">{item.description}</p>
                          <p className="text-xs text-[#667085] font-mono">{item.referenceNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">{item.days}</td>
                        <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                        <td className={`px-4 py-3 text-sm font-mono tabular-nums text-right font-semibold ${item.type === 'LOP' ? 'text-[#B42318]' : 'text-[#0B6E6E]'}`}>
                          {item.type === 'LOP' ? '-' : '+'}{formatMoney(Math.abs(item.amount))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
