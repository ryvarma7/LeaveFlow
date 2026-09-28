// Script to seed LOP (Loss of Pay / Unpaid) demo data and Payroll Adjustments
// for Employee, Manager, and HR roles across Current Month (2026-09) and Upcoming Month (2026-10).

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
    console.warn(`  [Skip / Error submitting ${body.startDate}]: ${err.detail || res.statusText}`);
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`  [Skip managerApprove ${id}]: ${err.detail || res.statusText}`);
    return null;
  }
  return res.json();
}

async function hrApprove(token, id, comment = 'HR Approved with salary deduction') {
  if (!id) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${id}/hr/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ expectedStatus: 'PENDING_HR', comment })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`  [Skip hrApprove ${id}]: ${err.detail || res.statusText}`);
    return null;
  }
  return res.json();
}

async function offerCoverage(token, requestId, coveringEmployeeId, sharePercent = 50, note = 'Please cover my critical responsibilities') {
  if (!requestId) return null;
  const res = await fetch(`${BASE_URL}/leave-requests/${requestId}/coverage/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ coveringEmployeeId, sharePercent, note })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`  [Skip offerCoverage req=${requestId} -> emp=${coveringEmployeeId}]: ${err.detail || res.statusText}`);
    return null;
  }
  return res.json();
}

async function acceptCoverage(token, assignmentId) {
  if (!assignmentId) return null;
  const res = await fetch(`${BASE_URL}/coverage/${assignmentId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn(`  [Skip acceptCoverage ${assignmentId}]: ${err.detail || res.statusText}`);
    return null;
  }
  return res.json().catch(() => ({}));
}

async function main() {
  console.log('Logging in all test accounts...');
  const hrHannah = await login('hannah@leaveflow.internal');
  const hrHarish = await login('harish@leaveflow.internal');
  const mgrMeera = await login('meera@leaveflow.internal');
  const arun = await login('arun@leaveflow.internal');
  const bala = await login('bala@leaveflow.internal');
  const chitra = await login('chitra@leaveflow.internal');
  const divya = await login('divya@leaveflow.internal');

  console.log('--- 1. Seeding EMPLOYEE LOP & Payroll Adjustments ---');
  // 1a. Bala: Sep 28-29 LOP (Approved / Confirmed Deduction)
  const balaSepLop = await submitLeave(bala.token, {
    leaveTypeId: 4,
    startDate: '2026-09-28',
    endDate: '2026-09-29',
    reason: 'Unpaid family emergency relocation',
    handoverNotes: 'Arun handling core microservices sprint'
  });
  if (balaSepLop) {
    console.log('  Created Bala Sep LOP:', balaSepLop.requestNumber);
    // Offer coverage to Arun before approving
    const covArun = await offerCoverage(mgrMeera.token, balaSepLop.id, arun.user.id, 50, 'Please cover Bala services');
    if (covArun) {
      await acceptCoverage(arun.token, covArun.id);
      console.log('  -> Arun accepted 50% coverage for Bala (+Coverage Allowance in Sep)');
    }
    await managerApprove(mgrMeera.token, balaSepLop.id, 'Manager approved unpaid days');
    await hrApprove(hrHarish.token, balaSepLop.id, 'HR Approved LOP with salary deduction');
    console.log('  -> Bala Sep LOP approved: Confirmed LOP Deduction in 2026-09');
  }

  // 1b. Chitra: Sep 29-30 LOP (Pending Manager / Projected Deduction)
  const chitraSepLop = await submitLeave(chitra.token, {
    leaveTypeId: 4,
    startDate: '2026-09-29',
    endDate: '2026-09-30',
    reason: 'Unpaid specialist technical bootcamp',
    handoverNotes: 'Divya covering test automation framework'
  });
  if (chitraSepLop) {
    console.log('  Created Chitra Sep LOP:', chitraSepLop.requestNumber);
    const covDivya = await offerCoverage(mgrMeera.token, chitraSepLop.id, divya.user.id, 50, 'Please monitor CI/CD pipelines');
    if (covDivya) {
      await acceptCoverage(divya.token, covDivya.id);
      console.log('  -> Divya accepted 50% coverage for Chitra (+Projected Coverage Allowance in Sep)');
    }
    console.log('  -> Chitra Sep LOP is Pending Manager: Projected LOP Deduction in 2026-09');
  }

  // 1c. Bala: Oct 06-07 LOP (Pending HR / Projected Deduction in Oct)
  const balaOctLop = await submitLeave(bala.token, {
    leaveTypeId: 4,
    startDate: '2026-10-06',
    endDate: '2026-10-07',
    reason: 'Unpaid personal certification exams',
    handoverNotes: 'Chitra monitoring deployment pipelines'
  });
  if (balaOctLop) {
    console.log('  Created Bala Oct LOP:', balaOctLop.requestNumber);
    const covChitra = await offerCoverage(mgrMeera.token, balaOctLop.id, chitra.user.id, 50, 'Please review Bala PRs');
    if (covChitra) {
      await acceptCoverage(chitra.token, covChitra.id);
      console.log('  -> Chitra accepted 50% coverage for Bala (+Projected Coverage Allowance in Oct)');
    }
    await managerApprove(mgrMeera.token, balaOctLop.id, 'Manager approved unpaid study days');
    console.log('  -> Bala Oct LOP is Pending HR: Projected LOP Deduction in 2026-10');
  }

  // 1d. Chitra: Oct 21-22 LOP (Approved / Confirmed Deduction in Oct)
  const chitraOctLop = await submitLeave(chitra.token, {
    leaveTypeId: 4,
    startDate: '2026-10-21',
    endDate: '2026-10-22',
    reason: 'Unpaid home renovation monitoring',
    handoverNotes: 'Tasks scheduled ahead of time'
  });
  if (chitraOctLop) {
    console.log('  Created Chitra Oct LOP:', chitraOctLop.requestNumber);
    await managerApprove(mgrMeera.token, chitraOctLop.id, 'Approved by manager');
    await hrApprove(hrHarish.token, chitraOctLop.id, 'HR Approved LOP with salary deduction');
    console.log('  -> Chitra Oct LOP approved: Confirmed LOP Deduction in 2026-10');
  }

  console.log('\n--- 2. Seeding MANAGER (Meera) LOP & Payroll Adjustments ---');
  // 2a. Meera: Sep 29-30 LOP (Approved / Confirmed Deduction in Sep)
  const meeraSepLop = await submitLeave(mgrMeera.token, {
    leaveTypeId: 4,
    startDate: '2026-09-29',
    endDate: '2026-09-30',
    reason: 'Executive unpaid research and writing retreat',
    handoverNotes: 'Team sprint plan locked, senior engineer acting lead'
  });
  if (meeraSepLop) {
    console.log('  Created Meera Sep LOP:', meeraSepLop.requestNumber);
    await hrApprove(hrHarish.token, meeraSepLop.id, 'HR Approved executive unpaid days');
    console.log('  -> Meera Sep LOP approved: Confirmed LOP Deduction in 2026-09 (~Rs 13,636.36)');
  }

  // 2b. Meera: Oct 06-07 LOP (Pending HR / Projected Deduction in Oct)
  const meeraOctLop = await submitLeave(mgrMeera.token, {
    leaveTypeId: 4,
    startDate: '2026-10-06',
    endDate: '2026-10-07',
    reason: 'Unpaid leadership summit attendance',
    handoverNotes: 'Delegated operational approvals to tech lead'
  });
  if (meeraOctLop) {
    console.log('  Created Meera Oct LOP:', meeraOctLop.requestNumber);
    console.log('  -> Meera Oct LOP is Pending HR: Projected LOP Deduction in 2026-10');
  }

  console.log('\n--- 3. Seeding HR (Hannah & Harish) LOP & Payroll Adjustments ---');
  // 3a. Hannah: Sep 29-30 LOP (Approved / Confirmed Deduction in Sep) + Harish Coverage
  const hannahSepLop = await submitLeave(hrHannah.token, {
    leaveTypeId: 4,
    startDate: '2026-09-29',
    endDate: '2026-09-30',
    reason: 'Personal unpaid leave for family relocation',
    handoverNotes: 'Harish handling ongoing HR operations and onboarding'
  });
  if (hannahSepLop) {
    console.log('  Created Hannah Sep LOP:', hannahSepLop.requestNumber);
    const covHarish = await offerCoverage(hrHannah.token, hannahSepLop.id, hrHarish.user.id, 100, 'Please oversee onboarding while I am away');
    if (covHarish) {
      await acceptCoverage(hrHarish.token, covHarish.id);
      console.log('  -> Harish accepted 100% coverage for Hannah (+Coverage Allowance in Sep)');
    }
    await hrApprove(hrHarish.token, hannahSepLop.id, 'HR Approved LOP with salary deduction');
    console.log('  -> Hannah Sep LOP approved: Confirmed LOP Deduction in 2026-09 (~Rs 10,909.09)');
  }

  // 3b. Harish: Oct 14-15 LOP (Pending HR / Projected Deduction in Oct) + Hannah Coverage
  const harishOctLop = await submitLeave(hrHarish.token, {
    leaveTypeId: 4,
    startDate: '2026-10-14',
    endDate: '2026-10-15',
    reason: 'Unpaid community volunteering project',
    handoverNotes: 'Hannah handling benefits and payroll inquiries'
  });
  if (harishOctLop) {
    console.log('  Created Harish Oct LOP:', harishOctLop.requestNumber);
    const covHannah = await offerCoverage(hrHarish.token, harishOctLop.id, hrHannah.user.id, 100, 'Please cover HR inquiries');
    if (covHannah) {
      await acceptCoverage(hrHannah.token, covHannah.id);
      console.log('  -> Hannah accepted 100% coverage for Harish (+Projected Coverage Allowance in Oct)');
    }
    console.log('  -> Harish Oct LOP is Pending HR: Projected LOP Deduction in 2026-10 (~Rs 11,363.64)');
  }

  console.log('\n✓ ALL LOP AND PAYROLL ADJUSTMENTS SEEDED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
