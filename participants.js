const DEFAULT_ROLES = {
  '김민지': '필수',
  '박준호': '필수',
  '이서연': '필수',
  '최현우': '필수',
  '정다은': '필수',
  '한지훈': '필수'
};

let roles = {};

// ─── DOM refs ───
const backBtn = document.getElementById('back-btn');
const summaryCard = document.getElementById('summary-card');
const participantList = document.getElementById('participant-list');
const noDataSection = document.getElementById('no-data-section');
const conditionSection = document.getElementById('condition-section');
const requiredCount = document.getElementById('required-count');
const optionalCount = document.getElementById('optional-count');
const conditionRule1 = document.getElementById('condition-rule-1');
const conditionRule2 = document.getElementById('condition-rule-2');
const conditionRule3 = document.getElementById('condition-rule-3');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');

// ─── Navigation ───
backBtn.addEventListener('click', () => {
  window.location.href = 'create.html';
});

document.getElementById('go-back-btn').addEventListener('click', () => {
  window.location.href = 'create.html';
});

// ─── Load data ───
function loadMeetingDraft() {
  try {
    const raw = sessionStorage.getItem('meetingDraft');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function meetingMeta() {
  const draft = loadMeetingDraft();
  return (draft && draft.participantMeta) ? draft.participantMeta : {};
}

const DRAFT_VERSION = 2;

function saveRolesDraft() {
  const data = { version: DRAFT_VERSION, roles: roles };
  sessionStorage.setItem('participantsDraft', JSON.stringify(data));
}

function loadRolesDraft() {
  try {
    const raw = sessionStorage.getItem('participantsDraft');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === DRAFT_VERSION && parsed.roles) {
      return parsed.roles;
    }
    return null;
  } catch { return null; }
}

function initRoles(participants) {
  roles = {};
  const saved = loadRolesDraft();
  participants.forEach(name => {
    if (saved && saved[name] !== undefined) {
      roles[name] = saved[name];
    } else {
      roles[name] = DEFAULT_ROLES[name] || '필수';
    }
  });
}

// ─── Render summary ───
function renderSummary(draft) {
  summaryCard.innerHTML = `
    <div class="pa-summary-row">
      <span class="pa-summary-label">회의명</span>
      <span class="pa-summary-value">${draft.meetingTitle}</span>
    </div>
    <div class="pa-summary-row">
      <span class="pa-summary-label">기간</span>
      <span class="pa-summary-value">${draft.displayPeriod || draft.period}</span>
    </div>
    <div class="pa-summary-row">
      <span class="pa-summary-label">회의 길이</span>
      <span class="pa-summary-value">${draft.duration}</span>
    </div>
    <div class="pa-summary-row">
      <span class="pa-summary-label">참석자</span>
      <span class="pa-summary-value">${draft.participants.length}명</span>
    </div>
  `;
}

// ─── Render participant list ───
function renderParticipantList(participants) {
  const meta = meetingMeta();

  participantList.innerHTML = participants.map(name => {
    const role = roles[name];
    const requiredActive = role === '필수' ? 'pa-seg-btn-active' : '';
    const optionalActive = role === '선택' ? 'pa-seg-btn-active' : '';
    const desc = role === '필수'
      ? '이 사람이 가능해야 회의 후보로 추천돼요.'
      : '가능하면 포함하지만, 회의 확정 조건에는 포함하지 않아요.';
    const m = meta[name] || {};
    const detail = m.team && m.role ? `${m.team} · ${m.role}` : '';
    return `
      <div class="pa-participant-card" data-name="${name}">
        <div class="pa-participant-name">${name}</div>
        ${detail ? `<p class="pa-participant-detail">${detail}</p>` : ''}
        <div class="pa-segmented">
          <button class="pa-seg-btn ${requiredActive}" data-role="필수" type="button">필수</button>
          <button class="pa-seg-btn ${optionalActive}" data-role="선택" type="button">선택</button>
        </div>
        <p class="pa-participant-desc">${desc}</p>
      </div>
    `;
  }).join('');

  participantList.querySelectorAll('.pa-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.pa-participant-card');
      const name = card.dataset.name;
      const newRole = btn.dataset.role;
      if (roles[name] === newRole) return;
      roles[name] = newRole;
      saveRolesDraft();
      renderParticipantList(Object.keys(roles));
      updateCondition();
    });
  });
}

// ─── Update condition summary ───
function updateCondition() {
  const names = Object.keys(roles);
  const required = names.filter(n => roles[n] === '필수');
  const optional = names.filter(n => roles[n] === '선택');

  requiredCount.textContent = `필수 ${required.length}명`;
  optionalCount.textContent = `선택 ${optional.length}명`;

  conditionRule1.textContent = `필수 참석자 ${required.length}명이 모두 가능한 시간을 우선 추천해요.`;
  if (optional.length === 0) {
    conditionRule2.textContent = '선택 참석자는 아직 없어요. 필요하면 일부 참석자를 선택으로 바꿀 수 있어요.';
  } else {
    conditionRule2.textContent = `선택 참석자 ${optional.length}명은 가능 인원 수를 기준으로 함께 고려해요.`;
  }
  conditionRule3.textContent = '확인 필요자가 있으면 확정 전 별도로 표시돼요.';
}

// ─── Toast ───
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('pa-toast-visible');
  setTimeout(() => {
    toast.classList.remove('pa-toast-visible');
  }, 2000);
}

// ─── Validation & Submit ───
submitBtn.addEventListener('click', () => {
  const existingError = document.querySelector('.pa-validation-error');
  if (existingError) existingError.remove();

  const required = Object.keys(roles).filter(n => roles[n] === '필수');
  const total = Object.keys(roles).length;

  let errorMsg = '';
  if (required.length === 0) {
    errorMsg = '필수 참석자를 1명 이상 선택해주세요.';
  } else if (total < 2) {
    errorMsg = '참석자가 2명 이상 필요해요.';
  }

  if (errorMsg) {
    const el = document.createElement('p');
    el.className = 'pa-validation-error';
    el.textContent = errorMsg;
    submitBtn.parentNode.insertBefore(el, submitBtn);
    return;
  }

  const optional = Object.keys(roles).filter(n => roles[n] === '선택');

  const data = {
    requiredParticipants: required,
    optionalParticipants: optional,
    meetingRules: {
      requiredRule: '필수 참석자 전원 가능',
      optionalRule: '선택 참석자는 가능 인원 수 기준 참고',
      unresolvedRule: '확인 필요자는 확정 전 표시'
    }
  };

  sessionStorage.setItem('participantRoles', JSON.stringify(data));
  saveRolesDraft();
  console.log('참석자 조건 저장:', data);
  showToast('참석자 조건을 저장했어요');
  setTimeout(() => {
    window.location.href = 'results.html';
  }, 400);
});

// ─── Init ───
function init() {
  const draft = loadMeetingDraft();

  if (!draft || !draft.participants || draft.participants.length === 0) {
    summaryCard.style.display = 'none';
    participantList.style.display = 'none';
    conditionSection.style.display = 'none';
    noDataSection.style.display = 'block';
    submitBtn.style.display = 'none';
    return;
  }

  summaryCard.style.display = 'block';
  participantList.style.display = 'flex';
  conditionSection.style.display = 'block';
  noDataSection.style.display = 'none';
  submitBtn.style.display = 'flex';

  renderSummary(draft);
  initRoles(draft.participants);
  renderParticipantList(Object.keys(roles));
  updateCondition();
}

init();
