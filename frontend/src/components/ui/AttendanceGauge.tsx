import { AlertTriangle } from 'lucide-react';

interface AttendanceGaugeProps {
  teamSize: number;
  offToday: number;
  coverageGaps?: number;
  awaitingReview?: number;
  className?: string;
}

export function AttendanceGauge({
  teamSize,
  offToday,
  coverageGaps = 0,
  awaitingReview = 0,
  className = '',
}: AttendanceGaugeProps) {
  const presentCount = Math.max(0, teamSize - offToday);
  const attendanceRate = teamSize > 0 ? Math.round((presentCount / teamSize) * 100) : 100;

  // Status configuration
  let statusColor = '#0B6E6E'; // teal
  let statusBg = '#E6F4F4';
  let statusText = '#095A5A';
  let statusLabel = 'Optimal Capacity';

  if (teamSize > 0) {
    if (attendanceRate < 60 || coverageGaps > 0) {
      statusColor = '#F04438'; // red
      statusBg = '#FEF3F2';
      statusText = '#B42318';
      statusLabel = coverageGaps > 0 ? 'Coverage Gaps Alert' : 'Low Capacity Alert';
    } else if (attendanceRate < 80) {
      statusColor = '#F79009'; // amber
      statusBg = '#FFFAEB';
      statusText = '#B54708';
      statusLabel = 'Moderate Absence';
    }
  }

  // Ring geometry
  const radius = 46;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * attendanceRate) / 100;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Gauge and Status Summary */}
      <div className="flex items-center gap-5">
        {/* Radial Ring */}
        <div className="relative flex-shrink-0 w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 110 110">
            {/* Background Track */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              className="text-[#F2F4F7]"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Active Progress Ring */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={statusColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Percentage */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-[#101828] tracking-tight leading-none font-mono">
              {attendanceRate}%
            </span>
            <span className="text-[10px] text-[#667085] font-medium mt-0.5">Present</span>
          </div>
        </div>

        {/* Text and status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded"
              style={{ backgroundColor: statusBg, color: statusText }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
            <strong className="text-[#101828] font-semibold">{presentCount}</strong> of{' '}
            <strong className="text-[#101828] font-semibold">{teamSize}</strong> members active today.
          </p>
          {coverageGaps > 0 && (
            <p className="text-[11px] text-[#B42318] font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-[#B42318]" />
              <span>{coverageGaps} leave {coverageGaps === 1 ? 'request lacks' : 'requests lack'} coverage!</span>
            </p>
          )}
        </div>
      </div>

      {/* Mini Stat Pills */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F2F4F7]">
        <div className="bg-[#F9FAFB] rounded-lg p-2.5 text-center">
          <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">
            Present
          </span>
          <span className="text-base font-bold text-[#101828] font-mono tabular-nums">
            {presentCount}
          </span>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg p-2.5 text-center">
          <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">
            On Leave
          </span>
          <span className="text-base font-bold text-[#B54708] font-mono tabular-nums">
            {offToday}
          </span>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg p-2.5 text-center">
          <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">
            Awaiting
          </span>
          <span className="text-base font-bold text-[#0B6E6E] font-mono tabular-nums">
            {awaitingReview}
          </span>
        </div>
      </div>
    </div>
  );
}
