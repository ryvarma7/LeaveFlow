// Script to populate 5+ demo data items for each scenario across LeaveFlow
const BASE_URL = 'http://localhost:8080/api/v1';

async function login(email, password = 'Password@123') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.statusText}`);
  const data = await res.json();
  return { token: data.token, user: data };
}

async function submitLeave(token, body) {
  const payload = {
    ...body,
    acknowledgeUnpaid: true,
  };
  const res = await fetch(`${BASE_URL}/leave-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`[Skip overlapping / duplicate] ${err.detail || res.statusText}`);
    return null;
  }
  return res.json();
}

async function managerApprove(token, id, comment = 'Approved by Manager') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/manager/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ expectedStatus: 'PENDING_MANAGER', comment })
  });
  if (!res.ok) return null;
  return res.json();
}

async function managerReject(token, id, comment = 'Rejected by Manager due to delivery constraints') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/manager/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ expectedStatus: 'PENDING_MANAGER', comment })
  });
  if (!res.ok) return null;
  return res.json();
}

async function hrApprove(token, id, comment = 'Final HR approval granted') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/hr/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ expectedStatus: 'PENDING_HR', comment })
  });
  if (!res.ok) return null;
  return res.json();
}

async function hrReject(token, id, comment = 'Rejected by HR') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/hr/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ expectedStatus: 'PENDING_HR', comment })
  });
  if (!res.ok) return null;
  return res.json();
}

async function cancelLeave(token, id, comment = 'Cancelled by employee') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ comment })
  });
  if (!res.ok) return null;
  return res.json();
}

async function offerCoverage(token, requestId, coveringEmployeeId, sharePercent = 50, note = 'Please cover my core tasks') {
  if (!requestId) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${requestId}/coverage/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ coveringEmployeeId, sharePercent, note })
  });
  if (!res.ok) return null;
  return res.json();
}

async function acceptCoverage(token, assignmentId) {
  if (!assignmentId) return;
  await fetch(`${BASE_URL}/coverage/${assignmentId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
}

async function declineCoverage(token, assignmentId, reason = 'Too much project load this week') {
  if (!assignmentId) return;
  await fetch(`${BASE_URL}/coverage/${assignmentId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function main() {
  console.log('Logging in all test users...');
  const hr = await login('hannah@leaveflow.internal');
  const mgr = await login('meera@leaveflow.internal');
  const arun = await login('arun@leaveflow.internal');
  const bala = await login('bala@leaveflow.internal');
  const chitra = await login('chitra@leaveflow.internal');
  const divya = await login('divya@leaveflow.internal');

  console.log('✓ All users logged in');

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 1: 5 PENDING_MANAGER requests (Manager Approval Queue)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 1: 5 PENDING_MANAGER Requests ---');
  const pm1 = await submitLeave(arun.token, {
    leaveTypeId: 1, startDate: '2026-10-05', endDate: '2026-10-06',
    reason: 'Family vacation to Goa', handoverNotes: 'Tasks assigned to Bala'
  });
  if (pm1) console.log('  1. Arun Annual Leave:', pm1.requestNumber);

  const pm2 = await submitLeave(bala.token, {
    leaveTypeId: 3, startDate: '2026-10-07', endDate: '2026-10-08',
    reason: 'Personal errands and bank work', handoverNotes: 'Urgent issues reachable via Slack'
  });
  if (pm2) console.log('  2. Bala Casual Leave:', pm2.requestNumber);

  const pm3 = await submitLeave(chitra.token, {
    leaveTypeId: 2, startDate: '2026-10-09', endDate: '2026-10-09',
    reason: 'Medical treatment and doctor appointments', handoverNotes: 'Sprint board updated'
  });
  if (pm3) console.log('  3. Chitra Sick Leave:', pm3.requestNumber);

  const pm4 = await submitLeave(divya.token, {
    leaveTypeId: 1, startDate: '2026-10-19', endDate: '2026-10-20',
    reason: 'Attending college reunion', handoverNotes: 'Documentation in Confluence'
  });
  if (pm4) console.log('  4. Divya Annual Leave:', pm4.requestNumber);

  const pm5 = await submitLeave(arun.token, {
    leaveTypeId: 3, startDate: '2026-12-14', endDate: '2026-12-15',
    reason: 'Home renovation and relocation', handoverNotes: 'On-call coverage given to Chitra'
  });
  if (pm5) console.log('  5. Arun Casual Leave:', pm5.requestNumber);

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 2: 5 PENDING_HR requests (HR Approval Queue)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 2: 5 PENDING_HR Requests (Manager Approved) ---');
  const phr1 = await submitLeave(arun.token, {
    leaveTypeId: 1, startDate: '2026-10-12', endDate: '2026-10-13',
    reason: 'Annual wedding festival in hometown', handoverNotes: 'Feature branch merged and deployed'
  });
  if (phr1) {
    await managerApprove(mgr.token, phr1.id, 'Approved. Team sprint capacity accounted for.');
    console.log('  1. Arun Annual Leave (Pending HR):', phr1.requestNumber);
  }

  const phr2 = await submitLeave(bala.token, {
    leaveTypeId: 1, startDate: '2026-10-14', endDate: '2026-10-15',
    reason: 'Winter break with family', handoverNotes: 'Pull requests reviewed and approved'
  });
  if (phr2) {
    await managerApprove(mgr.token, phr2.id, 'Approved by manager.');
    console.log('  2. Bala Annual Leave (Pending HR):', phr2.requestNumber);
  }

  const phr3 = await submitLeave(chitra.token, {
    leaveTypeId: 2, startDate: '2026-10-16', endDate: '2026-10-16',
    reason: 'Dental surgery and recovery period', handoverNotes: 'Support tickets handed over to Bala'
  });
  if (phr3) {
    await managerApprove(mgr.token, phr3.id, 'Get well soon Chitra. Approved.');
    console.log('  3. Chitra Sick Leave (Pending HR):', phr3.requestNumber);
  }

  const phr4 = await submitLeave(divya.token, {
    leaveTypeId: 1, startDate: '2026-10-21', endDate: '2026-10-22',
    reason: 'Year-end hiking and trek expedition', handoverNotes: 'Staging environment handover completed'
  });
  if (phr4) {
    await managerApprove(mgr.token, phr4.id, 'Approved. Have a great trek!');
    console.log('  4. Divya Annual Leave (Pending HR):', phr4.requestNumber);
  }

  const phr5 = await submitLeave(mgr.token, {
    leaveTypeId: 1, startDate: '2026-11-04', endDate: '2026-11-05',
    reason: 'Management leadership offsite', handoverNotes: 'Delegated team reviews to senior engineer'
  });
  if (phr5) {
    console.log('  5. Meera Manager Direct to HR:', phr5.requestNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 3: 5 APPROVED requests (Full cycle approved + Calendar Conflict cluster)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 3: 5 APPROVED Requests (with Calendar & Conflicts) ---');
  // Clustered overlapping dates on Oct 26-27 for Engineering team to demonstrate absence threshold exceed (>25%)
  const app1 = await submitLeave(arun.token, {
    leaveTypeId: 1, startDate: '2026-10-26', endDate: '2026-10-27',
    reason: 'Diwali celebration with extended family', handoverNotes: 'Deployment window frozen'
  });
  if (app1) {
    await managerApprove(mgr.token, app1.id, 'Approved');
    await hrApprove(hr.token, app1.id, 'Approved by HR');
    console.log('  1. Arun Approved:', app1.requestNumber);
  }

  const app2 = await submitLeave(bala.token, {
    leaveTypeId: 1, startDate: '2026-10-26', endDate: '2026-10-27',
    reason: 'Diwali trip to parent home', handoverNotes: 'CI/CD pipelines stable'
  });
  if (app2) {
    await managerApprove(mgr.token, app2.id, 'Approved');
    await hrApprove(hr.token, app2.id, 'Approved by HR');
    console.log('  2. Bala Approved (Conflict cluster):', app2.requestNumber);
  }

  const app3 = await submitLeave(chitra.token, {
    leaveTypeId: 3, startDate: '2026-10-26', endDate: '2026-10-27',
    reason: 'Diwali festival celebrations', handoverNotes: 'Automated tests configured'
  });
  if (app3) {
    await managerApprove(mgr.token, app3.id, 'Approved');
    await hrApprove(hr.token, app3.id, 'Approved by HR');
    console.log('  3. Chitra Approved (Conflict cluster - 3 on leave):', app3.requestNumber);
  }

  const app4 = await submitLeave(divya.token, {
    leaveTypeId: 1, startDate: '2026-10-26', endDate: '2026-10-27',
    reason: 'Post Diwali travel and relaxation', handoverNotes: 'Tasks on track'
  });
  if (app4) {
    await managerApprove(mgr.token, app4.id, 'Approved');
    await hrApprove(hr.token, app4.id, 'Approved by HR');
    console.log('  4. Divya Approved (Conflict cluster - 4 on leave):', app4.requestNumber);
  }

  const app5 = await submitLeave(mgr.token, {
    leaveTypeId: 1, startDate: '2026-11-25', endDate: '2026-11-26',
    reason: 'Short tech conference attendance', handoverNotes: 'Presentation slides shared'
  });
  if (app5) {
    await hrApprove(hr.token, app5.id, 'Approved by HR');
    console.log('  5. Meera (Manager) Approved:', app5.requestNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 4: 5 REJECTED requests (Manager & HR Rejections with comments)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 4: 5 REJECTED Requests ---');
  const rej1 = await submitLeave(arun.token, {
    leaveTypeId: 1, startDate: '2026-11-09', endDate: '2026-11-10',
    reason: 'Long weekend road trip', handoverNotes: 'None'
  });
  if (rej1) {
    await managerReject(mgr.token, rej1.id, 'Cannot approve: Production launch sprint freeze in progress.');
    console.log('  1. Arun Rejected by Manager:', rej1.requestNumber);
  }

  const rej2 = await submitLeave(bala.token, {
    leaveTypeId: 3, startDate: '2026-11-11', endDate: '2026-11-12',
    reason: 'Personal rest day', handoverNotes: 'None'
  });
  if (rej2) {
    await managerReject(mgr.token, rej2.id, 'High customer escalation volume scheduled for this day.');
    console.log('  2. Bala Rejected by Manager:', rej2.requestNumber);
  }

  const rej3 = await submitLeave(chitra.token, {
    leaveTypeId: 1, startDate: '2026-11-13', endDate: '2026-11-13',
    reason: 'Shopping trip', handoverNotes: 'None'
  });
  if (rej3) {
    await managerReject(mgr.token, rej3.id, 'Team capacity threshold exceeded for this week.');
    console.log('  3. Chitra Rejected by Manager:', rej3.requestNumber);
  }

  const rej4 = await submitLeave(divya.token, {
    leaveTypeId: 1, startDate: '2026-11-02', endDate: '2026-11-03',
    reason: 'Extended weekend getaway', handoverNotes: 'Tasks with Bala'
  });
  if (rej4) {
    await managerApprove(mgr.token, rej4.id, 'Manager approved.');
    await hrReject(hr.token, rej4.id, 'Policy violation: Annual leave must be requested at least 14 days in advance.');
    console.log('  4. Divya Rejected by HR:', rej4.requestNumber);
  }

  const rej5 = await submitLeave(mgr.token, {
    leaveTypeId: 2, startDate: '2026-12-11', endDate: '2026-12-11',
    reason: 'Wellness rest', handoverNotes: 'Handed over'
  });
  if (rej5) {
    await hrReject(hr.token, rej5.id, 'Rejected: Sick leave backdate documentation incomplete.');
    console.log('  5. Meera Rejected by HR:', rej5.requestNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 5: 5 CANCELLED requests (Cancelled by employee)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 5: 5 CANCELLED Requests ---');
  const can1 = await submitLeave(arun.token, {
    leaveTypeId: 1, startDate: '2026-11-16', endDate: '2026-11-17',
    reason: 'Planned family get-together', handoverNotes: 'Tasks with team'
  });
  if (can1) {
    await cancelLeave(arun.token, can1.id, 'Trip got postponed to next quarter');
    console.log('  1. Arun Cancelled:', can1.requestNumber);
  }

  const can2 = await submitLeave(bala.token, {
    leaveTypeId: 3, startDate: '2026-11-18', endDate: '2026-11-19',
    reason: 'Personal work', handoverNotes: 'None'
  });
  if (can2) {
    await cancelLeave(bala.token, can2.id, 'Appointment was rescheduled by doctor');
    console.log('  2. Bala Cancelled:', can2.requestNumber);
  }

  const can3 = await submitLeave(chitra.token, {
    leaveTypeId: 1, startDate: '2026-11-20', endDate: '2026-11-20',
    reason: 'Visiting hometown relatives', handoverNotes: 'None'
  });
  if (can3) {
    await cancelLeave(chitra.token, can3.id, 'Cancelled due to changing travel plans');
    console.log('  3. Chitra Cancelled:', can3.requestNumber);
  }

  const can4 = await submitLeave(divya.token, {
    leaveTypeId: 3, startDate: '2026-11-23', endDate: '2026-11-24',
    reason: 'Holiday shopping', handoverNotes: 'None'
  });
  if (can4) {
    await cancelLeave(divya.token, can4.id, 'Decided to work on sprint wrap-up instead');
    console.log('  4. Divya Cancelled:', can4.requestNumber);
  }

  const can5 = await submitLeave(mgr.token, {
    leaveTypeId: 1, startDate: '2026-12-18', endDate: '2026-12-18',
    reason: 'New year vacation preview', handoverNotes: 'None'
  });
  if (can5) {
    await cancelLeave(mgr.token, can5.id, 'Cancelled because executive review moved up');
    console.log('  5. Meera Cancelled:', can5.requestNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 6: 5 LOSS OF PAY (LOP) / Unpaid Leave requests (Financial Impact)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 6: 5 Loss of Pay / Unpaid Requests ---');
  // Unpaid leave type (ID 4) automatically incurs 100% loss of pay
  const lop1 = await submitLeave(arun.token, {
    leaveTypeId: 4, startDate: '2026-12-01', endDate: '2026-12-02',
    reason: 'Unpaid sabbatical days for personal research', handoverNotes: 'Research notes in Notion'
  });
  if (lop1) console.log('  1. Arun LOP (Pending Manager):', lop1.requestNumber);

  const lop2 = await submitLeave(bala.token, {
    leaveTypeId: 4, startDate: '2026-12-03', endDate: '2026-12-04',
    reason: 'Unpaid relocation leave', handoverNotes: 'Covered by Arun'
  });
  if (lop2) {
    await managerApprove(mgr.token, lop2.id, 'Manager approved unpaid days.');
    console.log('  2. Bala LOP (Pending HR):', lop2.requestNumber);
  }

  const lop3 = await submitLeave(chitra.token, {
    leaveTypeId: 4, startDate: '2026-12-07', endDate: '2026-12-08',
    reason: 'Unpaid family emergency extension', handoverNotes: 'All client deliverables shipped'
  });
  if (lop3) {
    await managerApprove(mgr.token, lop3.id, 'Approved');
    await hrApprove(hr.token, lop3.id, 'HR Approved with salary deduction');
    console.log('  3. Chitra LOP (Approved / Confirmed Deduction):', lop3.requestNumber);
  }

  const lop4 = await submitLeave(divya.token, {
    leaveTypeId: 4, startDate: '2026-12-09', endDate: '2026-12-10',
    reason: 'Unpaid exam preparation leave', handoverNotes: 'Module handoff done'
  });
  if (lop4) {
    await managerApprove(mgr.token, lop4.id, 'Approved');
    await hrApprove(hr.token, lop4.id, 'HR Approved with salary deduction');
    console.log('  4. Divya LOP (Approved / Confirmed Deduction):', lop4.requestNumber);
  }

  const lop5 = await submitLeave(bala.token, {
    leaveTypeId: 4, startDate: '2026-12-16', endDate: '2026-12-17',
    reason: 'Unpaid training course outside company', handoverNotes: 'Handed over'
  });
  if (lop5) {
    await managerApprove(mgr.token, lop5.id, 'Approved');
    console.log('  5. Bala LOP (Pending HR):', lop5.requestNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 7: Work Coverage Offers & Active Commitments (Coverage Inbox)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Seeding Scenario 7: Coverage Offers & Active Commitments ---');
  if (pm1) {
    const cov1 = await offerCoverage(mgr.token, pm1.id, bala.user.id, 50, 'Please cover Arun backend APIs');
    if (cov1) console.log('  1. Offered 50% coverage of Arun leave to Bala (OFFERED in Bala Inbox)');

    const cov2 = await offerCoverage(mgr.token, pm1.id, chitra.user.id, 50, 'Please handle Arun PR reviews');
    if (cov2) {
      await acceptCoverage(chitra.token, cov2.id);
      console.log('  2. Offered 50% coverage of Arun leave to Chitra (ACCEPTED with Allowance)');
    }
  }

  if (pm2) {
    const cov3 = await offerCoverage(mgr.token, pm2.id, arun.user.id, 100, 'Please manage database migrations in Bala absence');
    if (cov3) console.log('  3. Offered 100% coverage of Bala leave to Arun (OFFERED in Arun Inbox)');
  }

  if (pm3) {
    const cov4 = await offerCoverage(mgr.token, pm3.id, divya.user.id, 100, 'Please monitor customer support queue');
    if (cov4) {
      await acceptCoverage(divya.token, cov4.id);
      console.log('  4. Offered 100% coverage of Chitra leave to Divya (ACCEPTED with Allowance)');
    }
  }

  if (pm4) {
    const cov5 = await offerCoverage(mgr.token, pm4.id, arun.user.id, 50, 'Divya frontend task coverage');
    if (cov5) console.log('  5. Offered 50% coverage of Divya leave to Arun (OFFERED in Arun Inbox)');

    const cov6 = await offerCoverage(mgr.token, pm4.id, bala.user.id, 50, 'Divya testing tasks');
    if (cov6) {
      await declineCoverage(bala.token, cov6.id, 'Heavy sprint commitments');
      console.log('  6. Offered 50% coverage of Divya leave to Bala (DECLINED)');
    }
  }

  console.log('\n======================================================');
  console.log('✓ ALL DEMO SCENARIOS SEEDED SUCCESSFULLY!');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
