/* Minimal interactivity for CareLink prototype
   - navigation (login)
   - referral form storage in localStorage (mock backend)
   - ambulance ETA simulation
   - simple consult mock
   - populate dashboard
*/

/* ----- Navigation / Login ----- */
function login(role) {
  // store role in session for demo (not secure, just for prototype)
  sessionStorage.setItem('carelink_role', role);
  if (role === 'worker') window.location.href = 'referral.html';
  if (role === 'hospital') window.location.href = 'dashboard.html';
  if (role === 'doctor') window.location.href = 'consult.html';
}

/* ----- Referral Form Handling ----- */
const referralForm = document.getElementById('referralForm');
if (referralForm) {
  // show drafts if any
  const nameIn = document.getElementById('name');
  const ageIn = document.getElementById('age');
  const symptomsIn = document.getElementById('symptoms');
  const hospitalIn = document.getElementById('hospital');

  // load draft if exists
  const draft = localStorage.getItem('carelink_draft');
  if (draft) {
    try {
      const d = JSON.parse(draft);
      if (d.name) nameIn.value = d.name;
      if (d.age) ageIn.value = d.age;
      if (d.symptoms) symptomsIn.value = d.symptoms;
      if (d.hospital) hospitalIn.value = d.hospital;
    } catch (e) { /* ignore */ }
  }

  referralForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const referral = {
      id: 'R' + Date.now().toString().slice(-6),
      name: nameIn.value.trim(),
      age: ageIn.value.trim(),
      symptoms: symptomsIn.value.trim(),
      hospital: hospitalIn.value.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // save into localStorage 'carelink_referrals'
    const arr = JSON.parse(localStorage.getItem('carelink_referrals') || '[]');
    arr.unshift(referral);
    localStorage.setItem('carelink_referrals', JSON.stringify(arr));

    // remove draft
    localStorage.removeItem('carelink_draft');

    // auto-assign an ambulance for demo
    localStorage.setItem('carelink_assignedAmb', JSON.stringify({
      ambulanceId: 'A102',
      hospital: referral.hospital,
      etaMins: 14,
      referralId: referral.id
    }));

    // feedback
    const msg = document.getElementById('message');
    msg.textContent = `Referral ${referral.id} sent successfully! Ambulance ${ 'A102' } assigned.`;
    msg.style.color = '#2e9d58';

    // refresh sent list
    renderSentList();

    // reset form
    referralForm.reset();
  });
}

function saveDraft() {
  const name = document.getElementById('name').value.trim();
  const age = document.getElementById('age').value.trim();
  const symptoms = document.getElementById('symptoms').value.trim();
  const hospital = document.getElementById('hospital').value.trim();
  const draft = { name, age, symptoms, hospital, savedAt: new Date().toISOString() };
  localStorage.setItem('carelink_draft', JSON.stringify(draft));
  const msg = document.getElementById('message');
  msg.textContent = 'Draft saved locally.';
  msg.style.color = '#374151';
}

/* render recently sent referrals on referral page */
function renderSentList() {
  const listEl = document.getElementById('sentList');
  if (!listEl) return;
  const arr = JSON.parse(localStorage.getItem('carelink_referrals') || '[]');
  if (!arr.length) {
    listEl.innerHTML = '<div class="muted">No referrals sent yet.</div>';
    return;
  }
  listEl.innerHTML = '';
  arr.slice(0,6).forEach(r => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.style.padding = '8px 10px';
    el.style.borderBottom = '1px dashed #eef7ee';
    el.innerHTML = `<strong>${r.id}</strong> — ${r.name} (${r.age}) → ${r.hospital} <div style="font-size:12px;color:#6b7280">Status: ${r.status} • ${new Date(r.timestamp).toLocaleString()}</div>`;
    listEl.appendChild(el);
  });
}

/* run render on referral page load */
if (document.readyState !== 'loading') renderSentList();
document.addEventListener('DOMContentLoaded', renderSentList);

/* ----- Ambulance Tracker Simulation ----- */
let etaInterval = null;

function assignAmbulance() {
  // read assigned ambulance from localStorage or create one
  let assigned = JSON.parse(localStorage.getItem('carelink_assignedAmb') || 'null');
  if (!assigned) {
    assigned = { ambulanceId: 'A102', hospital: 'District Hospital', etaMins: 14, referralId: null };
    localStorage.setItem('carelink_assignedAmb', JSON.stringify(assigned));
  }

  // display
  document.getElementById('ambId').textContent = assigned.ambulanceId;
  document.getElementById('ambHospital').textContent = assigned.hospital;
  startEtaCountdown(assigned.etaMins);
  // also increase ambulances stat for dashboard
  incrementAmbCount();
}

function resetAmbulance() {
  localStorage.removeItem('carelink_assignedAmb');
  clearInterval(etaInterval);
  const eta = document.getElementById('eta');
  if (eta) eta.textContent = '--';
  document.getElementById('ambId').textContent = '—';
  document.getElementById('ambHospital').textContent = '—';
}

/* countdown routine (seconds compressed for demo) */
function startEtaCountdown(minutes) {
  // for demo, each "minute" = 2 seconds
  let time = minutes;
  const etaEl = document.getElementById('eta');
  if (!etaEl) return;
  etaEl.textContent = time + ' min';
  clearInterval(etaInterval);
  etaInterval = setInterval(() => {
    time--;
    if (time <= 0) {
      clearInterval(etaInterval);
      etaEl.textContent = 'Arrived';
      // mark referral as completed if matching referral exists
      completeAssignedReferral();
      incrementDoneCount();
    } else {
      etaEl.textContent = time + ' min';
    }
  }, 2000);
}

/* mark assigned referral with status completed (mock) */
function completeAssignedReferral() {
  const assigned = JSON.parse(localStorage.getItem('carelink_assignedAmb') || 'null');
  if (!assigned || !assigned.referralId) return;
  const arr = JSON.parse(localStorage.getItem('carelink_referrals') || '[]');
  const idx = arr.findIndex(r => r.id === assigned.referralId);
  if (idx !== -1) {
    arr[idx].status = 'completed';
    localStorage.setItem('carelink_referrals', JSON.stringify(arr));
  }
  localStorage.removeItem('carelink_assignedAmb');
}

/* ----- Doctor Consult (mock) ----- */
function startConsult() {
  const notes = document.getElementById('consultNotes').value.trim();
  const msg = document.getElementById('consultMsg');
  msg.style.color = '#2e9d58';
  msg.textContent = 'Consult started (mock). Notes saved.';
  // save to session for demo
  sessionStorage.setItem('lastConsultNotes', notes || 'No notes');
}
function endConsult() {
  const msg = document.getElementById('consultMsg');
  msg.style.color = '#374151';
  msg.textContent = 'Consult ended.';
}

/* ----- Dashboard population ----- */
function populateDashboard() {
  const referrals = JSON.parse(localStorage.getItem('carelink_referrals') || '[]');
  // active = not completed
  const active = referrals.filter(r => r.status !== 'completed').length;
  document.getElementById('statReferrals').textContent = active;
  // ambulances on route (if assigned)
  const assigned = JSON.parse(localStorage.getItem('carelink_assignedAmb') || 'null');
  document.getElementById('statAmb').textContent = assigned ? 1 : 0;
  // completed cases (count of completed)
  const done = referrals.filter(r => r.status === 'completed').length;
  document.getElementById('statDone').textContent = done;

  // incoming referrals list
  const incoming = document.getElementById('incoming');
  if (incoming) {
    incoming.innerHTML = '';
    if (!referrals.length) incoming.innerHTML = '<div class="muted">No referrals yet.</div>';
    referrals.slice(0,8).forEach(r => {
      const el = document.createElement('div');
      el.style.borderBottom = '1px dashed #eef7ee';
      el.style.padding = '8px 6px';
      el.innerHTML = `<strong>${r.id}</strong> • ${r.name} (${r.age}) → ${r.hospital} <div style="font-size:12px;color:#6b7280">Status: ${r.status}</div>`;
      incoming.appendChild(el);
    });
  }
}

/* small helpers to update counts */
function incrementAmbCount() {
  const el = document.getElementById('statAmb');
  if (!el) return;
  el.textContent = parseInt(el.textContent || '0') + 1;
}
function incrementDoneCount() {
  const el = document.getElementById('statDone');
  if (!el) return;
  el.textContent = parseInt(el.textContent || '0') + 1;
}

/* init dashboard on load */
document.addEventListener('DOMContentLoaded', () => {
  populateDashboard();
});
