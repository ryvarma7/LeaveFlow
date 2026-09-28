import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/format';
import type { UserProfile } from '../../types/api';

interface EmployeesResponse {
  content: UserProfile[];
  totalPages: number;
}

export default function Employees() {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-employees', page],
    queryFn: () => api.get<EmployeesResponse | UserProfile[]>(`/hr/employees?page=${page}&size=${PAGE_SIZE}`),
  });

  const items: UserProfile[] = Array.isArray(data) ? data : (data as EmployeesResponse)?.content ?? [];
  const totalPages = Array.isArray(data) ? Math.ceil(items.length / PAGE_SIZE) : (data as EmployeesResponse)?.totalPages ?? 1;

  const roleLabel: Record<string, string> = {
    EMPLOYEE: 'Employee',
    MANAGER: 'Manager',
    HR: 'HR Admin',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Employees</h1>
        <p className="mt-1 text-sm text-[#667085]">All active employees in the organisation.</p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-[#F2F4F7]">
                {['Employee', 'Code', 'Role', 'Team', 'Manager', 'Joined', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[#667085] uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows rows={8} />
              ) : isError ? (
                <tr><td colSpan={7}><div className="p-8 text-center text-sm text-[#B42318]">Failed to load employees.</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No employees found." /></td></tr>
              ) : (
                items.map(emp => (
                  <tr key={emp.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar name={emp.fullName} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-[#101828]">{emp.fullName}</div>
                          <div className="text-xs text-[#667085]">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-[#475467]">{emp.employeeCode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        emp.role === 'HR' ? 'bg-[#EFF8FF] text-[#1570EF]' :
                        emp.role === 'MANAGER' ? 'bg-[#F9FAFB] text-[#344054] border border-[#E4E7EC]' :
                        'bg-[#F2F4F7] text-[#475467]'
                      }`}>
                        {roleLabel[emp.role] ?? emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#475467]">{emp.teamName ?? '--'}</td>
                    <td className="px-4 py-3 text-sm text-[#475467]">{emp.managerName ?? '--'}</td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-[#475467]">{formatDate(emp.joinedDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        emp.active ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#475467]'
                      }`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
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
