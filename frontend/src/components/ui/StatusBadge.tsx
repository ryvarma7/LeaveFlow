import type { LeaveStatus } from '../../types/api';

const STATUS_CONFIG: Record<LeaveStatus, { label: string; dotColor: string; bg: string; text: string }> = {
  PENDING_MANAGER: { label: 'Pending Manager', dotColor: '#B54708', bg: '#FFFAEB', text: '#B54708' },
  PENDING_HR: { label: 'Pending HR', dotColor: '#B54708', bg: '#FFFAEB', text: '#B54708' },
  APPROVED: { label: 'Approved', dotColor: '#067647', bg: '#ECFDF3', text: '#067647' },
  REJECTED: { label: 'Rejected', dotColor: '#B42318', bg: '#FEF3F2', text: '#B42318' },
  CANCELLED: { label: 'Cancelled', dotColor: '#475467', bg: '#F2F4F7', text: '#475467' },
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.dotColor }}
      />
      {cfg.label}
    </span>
  );
}

export function EscalationBadge({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border"
      style={{ borderColor: '#F79009', color: '#B54708', backgroundColor: '#FFFAEB' }}
    >
      Escalated L{level}
    </span>
  );
}
