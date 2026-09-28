import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../../lib/api';

interface DayAttendance {
  date: string;
  activeLeaveCount: number;
  allowedAbsent: number;
  thresholdExceeded: boolean;
  absentEmployeeNames: string[];
}

interface TeamCalendarResponse {
  teamId: number;
  teamName: string;
  teamSize: number;
  maxAbsentPercent: number;
  fromDate: string;
  toDate: string;
  days: DayAttendance[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function TeamCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayAttendance | null>(null);

  const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = getDaysInMonth(year, month);
  const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: cal, isLoading } = useQuery({
    queryKey: ['team-calendar', year, month],
    queryFn: () => api.get<TeamCalendarResponse>(`/manager/team-calendar?from=${fromDate}&to=${toDate}`),
  });

  const monthLabel = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Create a map of day date -> DayAttendance
  const dayMap = new Map<string, DayAttendance>();
  cal?.days.forEach(d => dayMap.set(d.date, d));

  const totalExceededDays = cal?.days.filter(d => d.thresholdExceeded).length ?? 0;
  const totalAbsentInstances = cal?.days.reduce((acc, d) => acc + d.activeLeaveCount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Team Calendar</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Attendance overview and absence threshold monitoring for {cal?.teamName ? `${cal.teamName} Team` : 'your team'}.
          </p>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-3 bg-white border border-[#D0D5DD] rounded-[8px] p-1 shadow-sm">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#475467] hover:bg-[#F9FAFB] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span className="text-sm font-semibold text-[#101828] min-w-[140px] text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#475467] hover:bg-[#F9FAFB] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#667085] uppercase tracking-wide">
            <Users size={14} /> Team Size
          </div>
          <div className="mt-2 text-2xl font-semibold text-[#101828] font-mono">
            {cal?.teamSize ?? '--'}
          </div>
          <div className="mt-1 text-xs text-[#667085]">Active team members</div>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#667085] uppercase tracking-wide">
            <CalendarIcon size={14} /> Absence Limit
          </div>
          <div className="mt-2 text-2xl font-semibold text-[#101828] font-mono">
            {cal?.days[0]?.allowedAbsent ?? (cal?.maxAbsentPercent ? Math.floor((cal.teamSize * cal.maxAbsentPercent) / 100) : '--')}
          </div>
          <div className="mt-1 text-xs text-[#667085]">Max {cal?.maxAbsentPercent ?? 25}% absent/day</div>
        </div>

        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#667085] uppercase tracking-wide">
            Total Leave Days
          </div>
          <div className="mt-2 text-2xl font-semibold text-[#101828] font-mono">
            {totalAbsentInstances}
          </div>
          <div className="mt-1 text-xs text-[#667085]">Recorded across month</div>
        </div>

        <div className={`bg-white border rounded-[10px] p-4 ${totalExceededDays > 0 ? 'border-[#FEC84B] bg-[#FFFAEB]' : 'border-[#E4E7EC]'}`}>
          <div className="flex items-center gap-2 text-xs font-medium text-[#667085] uppercase tracking-wide">
            <AlertTriangle size={14} className={totalExceededDays > 0 ? 'text-[#B54708]' : 'text-[#667085]'} /> Conflict Days
          </div>
          <div className={`mt-2 text-2xl font-semibold font-mono ${totalExceededDays > 0 ? 'text-[#B54708]' : 'text-[#101828]'}`}>
            {totalExceededDays}
          </div>
          <div className="mt-1 text-xs text-[#667085]">Exceeded threshold</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[#667085]">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-white border border-[#D0D5DD]" />
          <span>Full attendance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#ECFDF3] border border-[#A6F4C5]" />
          <span>Within threshold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#FFFAEB] border border-[#F79009]" />
          <span>Threshold exceeded (conflict)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#F2F4F7] border border-[#E4E7EC]" />
          <span>Weekend</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-[#E4E7EC] rounded-[10px] overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-[#0B6E6E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[#E4E7EC] bg-[#FAFAFA]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div key={d} className={`px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-[#98A2B3]' : 'text-[#475467]'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 auto-rows-fr bg-[#E4E7EC] gap-[1px]">
              {/* Padding before month starts */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`pad-${i}`} className="bg-[#F9FAFB] min-h-[100px] p-2" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayData = dayMap.get(dateStr);
                const dayOfWeek = new Date(year, month, dayNum).getDay();
                const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                const hasAbsences = (dayData?.activeLeaveCount ?? 0) > 0;
                const isExceeded = dayData?.thresholdExceeded ?? false;
                const isSelected = selectedDay?.date === dateStr;

                let cellBg = weekend ? 'bg-[#F9FAFB]' : 'bg-white';
                if (!weekend && isExceeded) cellBg = 'bg-[#FFFAEB] hover:bg-[#FEF0C7]';
                else if (!weekend && hasAbsences) cellBg = 'bg-[#F6FEF9] hover:bg-[#ECFDF3]';
                else if (!weekend) cellBg = 'bg-white hover:bg-[#F9FAFB]';

                return (
                  <div
                    key={dateStr}
                    onClick={() => dayData && setSelectedDay(dayData)}
                    className={`${cellBg} min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer relative ${
                      isSelected ? 'ring-2 ring-[#0B6E6E] z-10' : ''
                    } ${isExceeded ? 'border-2 border-[#F79009]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-medium ${weekend ? 'text-[#98A2B3]' : 'text-[#101828]'}`}>
                        {dayNum}
                      </span>
                      {isExceeded && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#B54708] bg-[#FEF0C7] px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> EXCEEDED
                        </span>
                      )}
                    </div>

                    {/* Absence pill */}
                    <div className="mt-1 flex flex-col gap-1">
                      {hasAbsences && (
                        <div>
                          <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                            isExceeded
                              ? 'bg-[#FEE4E2] text-[#B42318]'
                              : 'bg-[#D1FADF] text-[#067647]'
                          }`}>
                            {dayData?.activeLeaveCount} absent (max {dayData?.allowedAbsent})
                          </div>
                          <div className="mt-1 flex flex-col gap-0.5">
                            {dayData?.absentEmployeeNames.slice(0, 2).map((name, idx) => (
                              <div key={idx} className="text-[10px] text-[#475467] truncate" title={name}>
                                • {name}
                              </div>
                            ))}
                            {(dayData?.absentEmployeeNames.length ?? 0) > 2 && (
                              <div className="text-[10px] text-[#667085] font-medium">
                                +{(dayData?.absentEmployeeNames.length ?? 0) - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Drawer / Details Panel */}
      {selectedDay && (
        <div className="bg-white border border-[#E4E7EC] rounded-[10px] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">
                Attendance Details for {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-xs text-[#667085] mt-0.5">
                {selectedDay.activeLeaveCount} active leave request(s) on this date (allowed limit: {selectedDay.allowedAbsent})
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-[#667085] hover:text-[#101828]"
            >
              Close
            </button>
          </div>

          <div className="mt-4">
            {selectedDay.absentEmployeeNames.length === 0 ? (
              <p className="text-sm text-[#475467]">All team members are scheduled to work. No absences recorded.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDay.absentEmployeeNames.map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-[8px] border border-[#F2F4F7]">
                    <span className="text-sm font-medium text-[#101828]">{name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#EFF8FF] text-[#175CD3] rounded font-medium">On Leave</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
