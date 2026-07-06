const DEFAULT_REQUIRED = ['김민지', '박준호', '이서연'];
const DEFAULT_OPTIONAL = ['최현우', '정다은', '한지훈'];

let selectedCandidate = null;
let requiredParticipants = [];
let optionalParticipants = [];
let requestedNames = new Set();

// ─── DOM refs ───
const backBtn = document.getElementById('back-btn');
const candidateCard = document.getElementById('candidate-card');
const reasonList = document.getElementById('reason-list');
const requiredList = document.getElementById('required-list');
const optionalList = document.getElementById('optional-list');
const unresolvedSection = document.getElementById('unresolved-section');
const unresolvedInfo = document.getElementById('unresolved-info');
const noDataSection = document.getElementById('no-data-section');
const submitBtn = document.getElementById('submit-btn');
const ctaHint = document.getElementById('cta-hint');
const toast = document.getElementById('toast');

// ─── Navigation ───
backBtn.addEventListener('click', () => {
  window.location.href = 'results.html';
});

document.getElementById('go-back-btn').addEventListener('click', () => {
  window.location.href = 'results.html';
});

// ─── Load data ───
function loadData() {
  try {
    const raw = sessionStorage.getItem('selectedTime');
    selectedCandidate = raw ? JSON.parse(raw) : null;
  } catch { selectedCandidate = null; }

  try {
    const raw = sessionStorage.getItem('participantRoles');
    if (raw) {
      const roles = JSON.parse(raw);
      requiredParticipants = roles.requiredParticipants || DEFAULT_REQUIRED;
      optionalParticipants = roles.optionalParticipants || DEFAULT_OPTIONAL;
    } else {
      requiredParticipants = DEFAULT_REQUIRED;
      optionalParticipants = DEFAULT_OPTIONAL;
    }
  } catch {
    requiredParticipants = DEFAULT_REQUIRED;
    optionalParticipants = DEFAULT_OPTIONAL;
  }
}

// ─── Normalize candidate ───
function normalizeCandidate(candidate, reqCount, optCount) {
  const status = candidate.status || '추천';
  const rt = typeof candidate.requiredTotal === 'number' ? candidate.requiredTotal : reqCount;
  const ot = typeof candidate.optionalTotal === 'number' ? candidate.optionalTotal : optCount;

  let ra;
  if (typeof candidate.requiredAvailable === 'number') {
    ra = candidate.requiredAvailable;
  } else {
    ra = status === '추천' ? rt : Math.max(rt - 1, 0);
  }
  let oa;
  if (typeof candidate.optionalAvailable === 'number') {
    oa = candidate.optionalAvailable;
  } else {
    oa = status === '추천' ? ot : Math.max(ot - 1, 0);
  }
  const ruc = typeof candidate.requiredUnresolvedCount === 'number' ? candidate.requiredUnresolvedCount : 0;
  const ouc = typeof candidate.optionalUnresolvedCount === 'number' ? candidate.optionalUnresolvedCount : 0;
  const uc = typeof candidate.unresolvedCount === 'number' ? candidate.unresolvedCount : (ruc + ouc);

  return { ...candidate, requiredAvailable: ra, requiredTotal: rt, optionalAvailable: oa, optionalTotal: ot, requiredUnresolvedCount: ruc, optionalUnresolvedCount: ouc, unresolvedCount: uc };
}

// ─── Participant status helpers ───
function getParticipantStatus(name, index, isRequired) {
  const { requiredAvailable, requiredUnresolvedCount, optionalAvailable, optionalUnresolvedCount } = selectedCandidate;

  if (isRequired) {
    if (index < requiredAvailable) return { status: '가능', desc: '이 시간에 참석 가능해요.' };
    if (requiredUnresolvedCount > 0 && index === requiredAvailable) return { status: '확인 필요', desc: '비공개 일정이 있어 참석 여부 확인이 필요해요.' };
    return { status: '불가능', desc: '이 시간에는 참석이 어려워요.' };
  }

  if (index < optionalAvailable) return { status: '가능', desc: '이 시간에 참석 가능해요.' };
  if (optionalUnresolvedCount > 0 && index === optionalAvailable) return { status: '확인 필요', desc: '선택 참석자의 일정 확인이 필요하지만, 회의 확정 조건에는 영향이 없어요.' };
  return { status: '불가능', desc: '참석은 어렵지만 회의 확정 조건에는 영향이 없어요.' };
}

function getStatusBadgeClass(status) {
  if (status === '가능') return 'dt-status-available';
  if (status === '확인 필요') return 'dt-status-unresolved';
  if (status === '불가능') return 'dt-status-impossible';
  if (status === '응답 대기') return 'dt-status-waiting';
  return '';
}

// ─── Toast ───
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('dt-toast-visible');
  setTimeout(() => {
    toast.classList.remove('dt-toast-visible');
  }, 2000);
}

// ─── Render candidate card ───
function renderCandidateCard() {
  const status = selectedCandidate.status;
  let badgeClass = 'dt-badge-recommend';
  if (status === '확인 필요') badgeClass = 'dt-badge-unresolved';
  else if (status === '비추천') badgeClass = 'dt-badge-low';

  candidateCard.innerHTML = `
    <div class="dt-candidate-time">${selectedCandidate.date} ${selectedCandidate.time}</div>
    <span class="dt-candidate-badge ${badgeClass}">${status}</span>
    <p class="dt-candidate-summary">${selectedCandidate.requiredSummary}</p>
    <p class="dt-candidate-summary">${selectedCandidate.optionalSummary}</p>
    <p class="dt-candidate-summary">${selectedCandidate.unresolvedSummary}</p>
  `;
}

// ─── Render reasons ───
function renderReasons() {
  reasonList.innerHTML = selectedCandidate.reason.map(r =>
    `<p class="dt-reason-item">${r}</p>`
  ).join('');
}

// ─── Render participant list (with inline request button) ───
function renderParticipantSection(container, names, isRequired) {
  if (names.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = names.map((name, index) => {
    const isRequested = requestedNames.has(name);
    const ps = getParticipantStatus(name, index, isRequired);
    const finalStatus = (ps.status === '확인 필요' && isRequested) ? '응답 대기' : ps.status;
    const finalDesc = getDesc(finalStatus, ps, isRequired, isRequested);
    const statusClass = getStatusBadgeClass(finalStatus);
    const roleClass = isRequired ? 'dt-role-required' : 'dt-role-optional';
    const roleText = isRequired ? '필수' : '선택';

    const showRequestBtn = ps.status === '확인 필요' && !isRequested;

    return `
      <div class="dt-participant-card">
        <span class="dt-role-badge ${roleClass}">${roleText}</span>
        <div class="dt-participant-info">
          <div class="dt-participant-name">${name}</div>
          <p class="dt-participant-desc">${finalDesc}</p>
          ${showRequestBtn ? `<button class="dt-inline-request-btn" data-name="${name}" type="button">${isRequired ? '확인 요청' : '선택 확인 요청'}</button>` : ''}
          ${finalStatus === '응답 대기' ? `<p class="dt-requested-msg">${isRequired ? '확인 요청을 보냈어요' : '선택 확인 요청을 보냈어요'}</p>` : ''}
        </div>
        <span class="dt-status-badge ${statusClass}">${finalStatus}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.dt-inline-request-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      requestedNames.add(name);
      renderParticipantSection(requiredList, requiredParticipants, true);
      renderParticipantSection(optionalList, optionalParticipants, false);
      renderUnresolvedInfo();
      updateBottomCTA();
      showToast('확인 요청을 보냈어요');
      console.log('확인 요청 보냄:', name);
    });
  });
}

function getDesc(finalStatus, ps, isRequired, isRequested) {
  if (finalStatus === '응답 대기') {
    return isRequired
      ? '확인 요청을 보냈고 응답을 기다리고 있어요.'
      : '선택 참석자에게 확인 요청을 보냈어요. 회의 확정은 계속 진행할 수 있어요.';
  }
  return ps.desc;
}

// ─── Render unresolved info box (no participant cards) ───
function renderUnresolvedInfo() {
  const allNames = [...requiredParticipants, ...optionalParticipants];
  const unresolved = [];

  allNames.forEach((name, index) => {
    if (requestedNames.has(name)) return;
    const isRequired = index < requiredParticipants.length;
    const ps = getParticipantStatus(name, isRequired ? index : index - requiredParticipants.length, isRequired);
    if (ps.status === '확인 필요') {
      unresolved.push({ name, isRequired });
    }
  });

  const hasRequiredUnresolved = unresolved.some(u => u.isRequired);
  const onlyOptionalUnresolved = unresolved.length > 0 && !hasRequiredUnresolved;

  if (unresolved.length === 0) {
    unresolvedSection.style.display = 'none';
    return;
  }

  unresolvedSection.style.display = 'block';

  if (hasRequiredUnresolved) {
    const count = unresolved.filter(u => u.isRequired).length;
    unresolvedInfo.innerHTML = `
      <p class="dt-unresolved-info-text">필수 참석자 ${count}명의 참석 여부 확인이 필요해요. 해당 참석자 카드에서 확인 요청을 보낼 수 있어요.</p>
    `;
  } else {
    const count = unresolved.length;
    unresolvedInfo.innerHTML = `
      <p class="dt-unresolved-info-text">선택 참석자 ${count}명은 확인이 필요하지만, 회의 확정 조건에는 영향이 없어요.</p>
    `;
  }
}

// ─── Bottom CTA ───
function updateBottomCTA() {
  const status = selectedCandidate.status;

  if (status === '추천') {
    submitBtn.textContent = '이 시간으로 확정하기';
    submitBtn.className = 'dt-btn-primary';
    submitBtn.disabled = false;
    ctaHint.style.display = 'none';
  } else if (status === '확인 필요') {
    const hasUnrequested = requiredParticipants.some((name, index) => {
      const ps = getParticipantStatus(name, index, true);
      return ps.status === '확인 필요' && !requestedNames.has(name);
    });

    if (hasUnrequested) {
      submitBtn.textContent = '필수 참석자 확인이 필요해요';
      submitBtn.className = 'dt-btn-primary dt-btn-disabled';
      submitBtn.disabled = true;
      ctaHint.textContent = '필수 참석자에게 확인 요청을 보낸 뒤 응답을 기다려주세요.';
      ctaHint.style.display = 'block';
    } else {
      submitBtn.textContent = '응답 대기 중';
      submitBtn.className = 'dt-btn-primary dt-btn-disabled';
      submitBtn.disabled = true;
      ctaHint.textContent = '필수 참석자에게 확인 요청을 보낸 뒤 응답을 기다려주세요.';
      ctaHint.style.display = 'block';
    }
  } else {
    submitBtn.textContent = '다른 시간 선택하기';
    submitBtn.className = 'dt-btn-primary dt-btn-secondary';
    submitBtn.disabled = false;
    ctaHint.style.display = 'none';
  }
}

submitBtn.addEventListener('click', () => {
  if (submitBtn.disabled) return;

  const status = selectedCandidate.status;

  if (status === '추천') {
    const data = {
      selectedCandidateId: selectedCandidate.selectedCandidateId,
      date: selectedCandidate.date,
      time: selectedCandidate.time,
      status: selectedCandidate.status,
      requiredAvailable: selectedCandidate.requiredAvailable,
      optionalAvailable: selectedCandidate.optionalAvailable,
      requiredTotal: selectedCandidate.requiredTotal,
      optionalTotal: selectedCandidate.optionalTotal,
      requiredUnresolvedCount: selectedCandidate.requiredUnresolvedCount,
      optionalUnresolvedCount: selectedCandidate.optionalUnresolvedCount,
      confirmedAt: new Date().toISOString()
    };
    sessionStorage.setItem('finalCandidate', JSON.stringify(data));
    console.log('확정할 시간 저장:', data);
    showToast('확정할 시간을 저장했어요');
    setTimeout(() => {
      window.location.href = 'confirm.html';
    }, 400);
  } else if (status === '비추천') {
    window.location.href = 'results.html';
  }
});

// ─── Init ───
function init() {
  loadData();

  if (selectedCandidate) {
    selectedCandidate = normalizeCandidate(selectedCandidate, requiredParticipants.length, optionalParticipants.length);
  }

  if (!selectedCandidate) {
    document.querySelectorAll('.dt-section, .dt-candidate-card, .dt-hero, .dt-bottom-cta').forEach(el => {
      el.style.display = 'none';
    });
    noDataSection.style.display = 'block';
    return;
  }

  noDataSection.style.display = 'none';

  renderCandidateCard();
  renderReasons();
  renderParticipantSection(requiredList, requiredParticipants, true);
  renderParticipantSection(optionalList, optionalParticipants, false);
  const optionalEmptyMsg = document.getElementById('optional-empty-msg');
  const optionalDesc = document.getElementById('optional-desc');
  if (optionalParticipants.length === 0) {
    optionalEmptyMsg.style.display = 'block';
    optionalDesc.style.display = 'none';
  } else {
    optionalEmptyMsg.style.display = 'none';
    optionalDesc.style.display = 'block';
  }
  renderUnresolvedInfo();
  updateBottomCTA();
}

init();
