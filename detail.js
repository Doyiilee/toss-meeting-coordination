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
const unresolvedList = document.getElementById('unresolved-list');
const noDataSection = document.getElementById('no-data-section');
const submitBtn = document.getElementById('submit-btn');
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

// ─── Participant status helpers ───
function getParticipantStatus(name, index, isRequired) {
  const { requiredAvailable, optionalAvailable, status } = selectedCandidate;

  if (isRequired) {
    if (index < requiredAvailable) return { status: '가능', desc: '이 시간에 참석 가능해요.' };
    if (status === '확인 필요') return { status: '확인 필요', desc: '비공개 일정이 있어 참석 여부 확인이 필요해요.' };
    return { status: '불가능', desc: '이 시간에는 참석이 어려워요.' };
  }

  if (index < optionalAvailable) return { status: '가능', desc: '이 시간에 참석 가능해요.' };
  return { status: '불가능', desc: '이 시간에는 참석이 어려워요.' };
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

// ─── Render participant list ───
function renderParticipantSection(container, names, isRequired) {
  if (names.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = names.map((name, index) => {
    const isRequested = requestedNames.has(name);
    const ps = getParticipantStatus(name, index, isRequired);
    const finalStatus = (ps.status === '확인 필요' && isRequested) ? '응답 대기' : ps.status;
    const finalDesc = finalStatus === '응답 대기'
      ? '확인 요청을 보냈고 응답을 기다리고 있어요.'
      : ps.desc;
    const statusClass = getStatusBadgeClass(finalStatus);
    const roleClass = isRequired ? 'dt-role-required' : 'dt-role-optional';
    const roleText = isRequired ? '필수' : '선택';

    return `
      <div class="dt-participant-card">
        <span class="dt-role-badge ${roleClass}">${roleText}</span>
        <div class="dt-participant-info">
          <div class="dt-participant-name">${name}</div>
          <p class="dt-participant-desc">${finalDesc}</p>
        </div>
        <span class="dt-status-badge ${statusClass}">${finalStatus}</span>
      </div>
    `;
  }).join('');
}

// ─── Render unresolved section ───
function renderUnresolvedSection() {
  const allNames = [...requiredParticipants, ...optionalParticipants];
  const unresolved = [];

  allNames.forEach((name, index) => {
    const isRequired = index < requiredParticipants.length;
    const ps = getParticipantStatus(name, isRequired ? index : index - requiredParticipants.length, isRequired);
    if (ps.status === '확인 필요') {
      unresolved.push({ name, isRequired });
    }
  });

  if (unresolved.length === 0 && requestedNames.size === 0) {
    unresolvedSection.style.display = 'none';
    return;
  }

  unresolvedSection.style.display = 'block';

  const stillUnresolved = unresolved.filter(u => !requestedNames.has(u.name));

  unresolvedList.innerHTML = unresolved.map(u => {
    const isRequested = requestedNames.has(u.name);
    const status = isRequested ? '응답 대기' : '확인 필요';
    const statusClass = isRequested ? 'dt-status-waiting' : 'dt-status-unresolved';
    const desc = isRequested
      ? '확인 요청을 보냈고 응답을 기다리고 있어요.'
      : '캘린더만으로 참석 가능 여부를 알 수 없어요.';
    const disabled = isRequested ? 'disabled' : '';
    const btnText = isRequested ? '응답 대기 중' : '확인 요청 보내기';

    return `
      <div class="dt-participant-card">
        <div class="dt-participant-info">
          <div class="dt-participant-name">${u.name}</div>
          <p class="dt-participant-desc">${desc}</p>
        </div>
        <span class="dt-status-badge ${statusClass}">${status}</span>
      </div>
      <button class="dt-request-btn" data-name="${u.name}" ${disabled} type="button">${btnText}</button>
    `;
  }).join('');

  unresolvedList.querySelectorAll('.dt-request-btn').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      requestedNames.add(name);
      renderUnresolvedSection();
      renderParticipantSection(requiredList, requiredParticipants, true);
      renderParticipantSection(optionalList, optionalParticipants, false);
      updateBottomCTA();
      showToast('확인 요청을 보냈어요');
      console.log('확인 요청 보냄:', name);
    });
  });
}

// ─── Bottom CTA ───
function updateBottomCTA() {
  const status = selectedCandidate.status;

  if (status === '추천') {
    submitBtn.textContent = '이 시간으로 확정하기';
    submitBtn.className = 'dt-btn-primary';
    submitBtn.disabled = false;
  } else if (status === '확인 필요') {
    const stillUnresolved = [...requiredParticipants, ...optionalParticipants].some((name, index) => {
      const isRequired = index < requiredParticipants.length;
      const ps = getParticipantStatus(name, isRequired ? index : index - requiredParticipants.length, isRequired);
      return ps.status === '확인 필요' && !requestedNames.has(name);
    });

    if (stillUnresolved) {
      submitBtn.textContent = '확인 요청 후 확정하기';
      submitBtn.className = 'dt-btn-primary';
      submitBtn.disabled = false;
    } else {
      submitBtn.textContent = '응답 대기 중';
      submitBtn.className = 'dt-btn-primary dt-btn-disabled';
      submitBtn.disabled = true;
    }
  } else {
    submitBtn.textContent = '다른 시간 선택하기';
    submitBtn.className = 'dt-btn-primary dt-btn-secondary';
    submitBtn.disabled = false;
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
      confirmedAt: new Date().toISOString()
    };
    sessionStorage.setItem('finalCandidate', JSON.stringify(data));
    console.log('확정할 시간 저장:', data);
    showToast('확정할 시간을 저장했어요');
    setTimeout(() => {
      window.location.href = 'confirm.html';
    }, 400);
  } else if (status === '확인 필요') {
    const stillUnresolved = [...requiredParticipants, ...optionalParticipants].some((name, index) => {
      const isRequired = index < requiredParticipants.length;
      const ps = getParticipantStatus(name, isRequired ? index : index - requiredParticipants.length, isRequired);
      return ps.status === '확인 필요' && !requestedNames.has(name);
    });
    if (stillUnresolved) {
      showToast('확인 필요자에게 먼저 요청해주세요');
    }
  } else if (status === '비추천') {
    window.location.href = 'results.html';
  }
});

// ─── Init ───
function init() {
  loadData();

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
  renderUnresolvedSection();
  updateBottomCTA();
}

init();
