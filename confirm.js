const DEFAULT_REQUIRED = ['김민지', '박준호', '이서연'];
const DEFAULT_OPTIONAL = ['최현우', '정다은', '한지훈'];

let meetingDraft = null;
let participantRoles = null;
let candidate = null;

// ─── DOM refs ───
const confirmedCard = document.getElementById('confirmed-card');
const conditionCard = document.getElementById('condition-card');
const requiredList = document.getElementById('required-list');
const optionalList = document.getElementById('optional-list');
const noDataSection = document.getElementById('no-data-section');

// ─── Load data ───
function loadData() {
  try {
    const raw = sessionStorage.getItem('meetingDraft');
    meetingDraft = raw ? JSON.parse(raw) : null;
  } catch { meetingDraft = null; }

  try {
    const raw = sessionStorage.getItem('participantRoles');
    participantRoles = raw ? JSON.parse(raw) : null;
  } catch { participantRoles = null; }

  try {
    const raw = sessionStorage.getItem('finalCandidate');
    if (raw) {
      candidate = JSON.parse(raw);
    } else {
      const fallback = sessionStorage.getItem('selectedTime');
      candidate = fallback ? JSON.parse(fallback) : null;
    }
  } catch { candidate = null; }
}

function getRequiredParticipants() {
  if (participantRoles && participantRoles.requiredParticipants) {
    return participantRoles.requiredParticipants;
  }
  return DEFAULT_REQUIRED;
}

function getOptionalParticipants() {
  if (participantRoles && participantRoles.optionalParticipants) {
    return participantRoles.optionalParticipants;
  }
  return DEFAULT_OPTIONAL;
}

// ─── Participant status (candidate-1 logic) ───
function getStatus(name, index, isRequired) {
  if (isRequired) return { status: '가능', label: '가능' };
  return index === 0
    ? { status: '불가능', label: '불가능' }
    : { status: '가능', label: '가능' };
}

function getChipClass(status) {
  if (status === '가능') return 'cf-chip-available';
  if (status === '확인 완료') return 'cf-chip-resolved';
  return 'cf-chip-impossible';
}

// ─── Render confirmed card ───
function renderConfirmedCard() {
  const required = getRequiredParticipants();
  const optional = getOptionalParticipants();
  const totalReq = required.length;
  const totalOpt = optional.length;

  confirmedCard.innerHTML = `
    <div class="cf-confirmed-name">${meetingDraft?.meetingTitle || '회의'}</div>
    <div class="cf-confirmed-row">
      <span class="cf-confirmed-label">요일</span>
      <span class="cf-confirmed-value">${candidate.date}</span>
    </div>
    <div class="cf-confirmed-row">
      <span class="cf-confirmed-label">시간</span>
      <span class="cf-confirmed-value">${candidate.time}</span>
    </div>
    <div class="cf-confirmed-row">
      <span class="cf-confirmed-label">회의 길이</span>
      <span class="cf-confirmed-value">${meetingDraft?.duration || '-'}</span>
    </div>
    <div class="cf-confirmed-row">
      <span class="cf-confirmed-label">기간</span>
      <span class="cf-confirmed-value">${meetingDraft?.period || '-'}</span>
    </div>
    <span class="cf-confirmed-badge">확정 완료</span>
  `;
}

// ─── Render condition card ───
function renderConditionCard() {
  const required = getRequiredParticipants();
  const optional = getOptionalParticipants();

  conditionCard.innerHTML = `
    <p class="cf-condition-line">필수 참석자 ${required.length}명이 모두 가능한 시간으로 확정했어요.</p>
    <p class="cf-condition-line">선택 참석자 ${optional.length}명 중 일부 참석 가능성을 함께 고려했어요.</p>
    <p class="cf-condition-line">확인 필요자가 없어 추가 확인 없이 확정할 수 있어요.</p>
  `;
}

// ─── Render participant lists ───
function renderParticipantChips(container, names, isRequired) {
  if (names.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = names.map((name, index) => {
    const st = getStatus(name, index, isRequired);
    const chipClass = getChipClass(st.status);
    return `
      <div class="cf-participant-chip">
        <span class="cf-chip-name">${name}</span>
        <span class="cf-chip-status ${chipClass}">${st.label}</span>
      </div>
    `;
  }).join('');
}

// ─── Render actions ───
function initActions() {
  document.getElementById('invite-btn').addEventListener('click', () => {
    console.log('초대 발송 클릭');
    showToast('현재 MVP에서는 실제 발송하지 않아요.');
  });
  document.getElementById('prepare-btn').addEventListener('click', () => {
    console.log('준비하기 클릭');
    showToast('현재 MVP에서는 실제 기능을 지원하지 않아요.');
  });
  document.getElementById('share-btn').addEventListener('click', () => {
    console.log('공유하기 클릭');
    showToast('현재 MVP에서는 실제 공유하지 않아요.');
  });
}

// ─── Navigation ───
document.getElementById('home-btn-header').addEventListener('click', () => {
  window.location.href = 'index.html';
});
document.getElementById('home-btn').addEventListener('click', () => {
  window.location.href = 'index.html';
});
document.getElementById('back-to-results-btn').addEventListener('click', () => {
  window.location.href = 'results.html';
});
document.getElementById('go-back-btn').addEventListener('click', () => {
  window.location.href = 'results.html';
});

// ─── Toast ───
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('cf-toast-visible');
  setTimeout(() => {
    toast.classList.remove('cf-toast-visible');
  }, 2000);
}

// ─── Init ───
function init() {
  loadData();

  if (!candidate || !meetingDraft) {
    document.querySelectorAll('.cf-confirmed-card, .cf-section, .cf-hero, .cf-bottom-cta').forEach(el => {
      el.style.display = 'none';
    });
    noDataSection.style.display = 'block';
    return;
  }

  noDataSection.style.display = 'none';

  renderConfirmedCard();
  renderConditionCard();

  const required = getRequiredParticipants();
  const optional = getOptionalParticipants();
  renderParticipantChips(requiredList, required, true);
  renderParticipantChips(optionalList, optional, false);
  initActions();
}

init();
