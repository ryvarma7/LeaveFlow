// ─── API Types ────────────────────────────────────────────────────────────────

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR';

export interface UserProfile {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  teamName: string | null;
  managerId: number | null;
  managerName: string | null;
  monthlySalary: number;
  joinedDate: string;
  active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  id: number;
  employeeCode: string;
  email: string;
  fullName: string;
  role: Role;
  teamName: string | null;
}

export type LeaveStatus = 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveSummary {
  id: number;
  requestNumber: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  teamName: string | null;
  leaveTypeId: number;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  paidDays: number;
  unpaidDays: number;
  status: LeaveStatus;
  escalationLevel: number;
  escalated: boolean;
  coverageStatus: 'NONE' | 'PARTIAL' | 'FULL';
  conflictFlag: boolean;
  stageDeadlineAt: string | null;
  createdAt: string;
}

export interface LeaveEvent {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorName: string;
  comments: string | null;
  seq: number;
  createdAt: string;
}

export interface DeductionEntry {
  month: string;
  unpaidDays: number;
  dailyRate: number;
  amount: number;
}

export interface LeaveDetail extends LeaveSummary {
  estimatedDeduction: number;
  deductionBreakdown: DeductionEntry[];
  handoverNotes: string | null;
  reason: string | null;
  stageEnteredAt: string | null;
  escalatedAt: string | null;
  allowedActions: string[];
  timeline: LeaveEvent[];
  coverageAssignments: CoverageAssignment[];
  updatedAt: string;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  annualEntitlement: number;
  paid: boolean;
  maxConsecutiveDays: number | null;
  backdateDays: number;
}

export interface LeaveBalance {
  id: number;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  year: number;
  entitled: number;
  carried: number;
  adjustment: number;
  pending: number;
  used: number;
  available: number;
}

export interface LeavePreviewRequest {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
}

export interface ExcludedDate {
  date: string;
  reason: string;
}

export interface LeavePreviewResponse {
  workingDays: number;
  workingDayList: string[];
  excludedDates: ExcludedDate[];
  paidDays: number;
  unpaidDays: number;
  estimatedDeduction: number;
  deductionBreakdown: DeductionEntry[];
  salarySet: boolean;
  balanceBefore: number;
  balanceAfter: number;
  conflictWarning: boolean;
  teammateAbsenceCount: number;
  warnings: string[];
}

export interface LeaveSubmitRequest {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  handoverNotes?: string;
  acknowledgeUnpaid: boolean;
}

export interface CoverageAssignment {
  id: number;
  requestId: number;
  requestNumber: string;
  requesterName: string;
  startDate: string;
  endDate: string;
  coveringEmployeeId: number;
  coveringEmployeeName: string;
  offeredById: number;
  offeredByName: string;
  sharePercent: number;
  coveredDays: number;
  status: 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
  note: string | null;
  declineReason: string | null;
  allowanceAmount: number;
  respondedAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  role: Role;
  availableAnnualLeave: number;
  availableSickLeave: number;
  availableCasualLeave: number;
  pendingRequestsCount: number;
  waitingCoverageOffersCount: number;
  awaitingDecisionCount: number | null;
  escalatedToManagerCount: number | null;
  teamOffTodayCount: number | null;
  teamSize: number | null;
  coverageGapsCount: number | null;
  awaitingHrCount: number | null;
  totalEscalatedCount: number | null;
  employeesOnLeaveTodayCount: number | null;
  requestsThisMonthCount: number | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  referenceId: number | null;
  read: boolean;
  createdAt: string;
}

export interface PayrollAdjustmentItem {
  type: string;
  referenceNumber: string;
  description: string;
  status: 'CONFIRMED' | 'PROJECTED';
  days: number;
  dailyRate: number;
  amount: number;
}

export interface PayrollStatement {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  teamName: string | null;
  month: string;
  baseSalary: number;
  confirmedLopDeduction: number;
  projectedLopDeduction: number;
  confirmedCoverageAllowance: number;
  projectedCoverageAllowance: number;
  netAdjustmentConfirmed: number;
  netAdjustmentProjected: number;
  estimatedNetSalary: number;
  items: PayrollAdjustmentItem[];
}

export interface ApiError {
  code: string;
  status: number;
  detail: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
  [key: string]: unknown;
}

export interface Team {
  id: number;
  name: string;
  maxAbsentPercent: number;
}

export interface CoverageSuggestion {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  coveredDaysLast90Days: number;
  leaveDaysThisYear: number;
  eligible: boolean;
  eligibilityReason: string;
}

export interface CoverageInbox {
  incomingOffers: CoverageAssignment[];
  activeCommitments: CoverageAssignment[];
  monthlyLoadDays: number;
  monthlyCapDays: number;
}
