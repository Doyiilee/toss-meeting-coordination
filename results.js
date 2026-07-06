const timeCandidates = [
  {
    id: 'candidate-1',
    label: '가장 추천',
    date: '화요일',
    time: '10:00 - 11:00',
    status: '추천',
    requiredSummary: '필수 참석자 전원 가능',
    optionalSummary: '선택 참석자 3명 중 2명 가능',
    unresolvedSummary: '확인 필요 없음',
    reason: [
      '필수 참석자 3명이 모두 가능해요.',
      '확인 필요자가 없어 바로 확정할 수 있어요.',
      '선택 참석자도 과반 이상 참석 가능해요.'
    ],
    requiredAvailable: 3,
    requiredTotal: 3,
    optionalAvailable: 2,
    optionalTotal: 3,
    unresolvedCount: 0
  },
  {
    id: 'candidate-2',
    label: '대안',
    date: '수요일',
    time: '16:00 - 17:00',
    status: '확인 필요',
    requiredSummary: '필수 참석자 3명 중 2명 가능',
    optionalSummary: '선택 참석자 3명 중 3명 가능',
    unresolvedSummary: '확인 필요 1명',
    reason: [
      '선택 참석자는 모두 가능해요.',
      '필수 참석자 1명의 비공개 일정 확인이 필요해요.',
      '확인 후 확정 가능성이 있어요.'
    ],
    requiredAvailable: 2,
    requiredTotal: 3,
    optionalAvailable: 3,
    optionalTotal: 3,
    unresolvedCount: 1
  },
  {
    id: 'candidate-3',
    label: '비추천',
    date: '목요일',
    time: '14:00 - 15:00',
    status: '비추천',
    requiredSummary: '필수 참석자 3명 중 1명 불가능',
    optionalSummary: '선택 참석자 3명 중 2명 가능',
    unresolvedSummary: '확인 필요 없음',
    reason: [
      '필수 참석자 중 참석이 어려운 사람이 있어요.',
      '회의 성립 조건을 만족하지 못해 우선순위가 낮아요.'
    ],
    requiredAvailable: 2,
    requiredTotal: 3,
    optionalAvailable: 2,
    optionalTotal: 3,
    unresolvedCount: 0
  }
];

let currentFilter = '전체';

// ─── DOM refs ───
const backBtn = document.getElementById('back-btn');
const summaryCard = document.getElementById('summary-card');
const noDataSection = document.getElementById('no-data-section');
const contentSection = document.getElementById('content-section');
const filterGroup = document.getElementById('filter-group');
const candidateList = document.getElementById('candidate-list');
const emptyFilter = document.getElementById('empty-filter');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');

// ─── Navigation ───
backBtn.addEventListener('click', () => {
  window.location.href = 'participants.html';
});

document.getElementById('go-back-btn').addEventListener('click', () => {
  window.location.href = 'create.html';
});

// ─── Load data ───
function loadDraft() {
  try {
    return sessionStorage.getItem('meetingDraft') ? JSON.parse(sessionStorage.getItem('meetingDraft')) : null;
  } catch { return null; }
}

function loadRoles() {
  try {
    return sessionStorage.getItem('participantRoles') ? JSON.parse(sessionStorage.getItem('participantRoles')) : null;
  } catch { return null; }
}

// ─── Render summary ───
function renderSummary(draft, roles) {
  summaryCard.innerHTML = `
    <div class="rs-summary-row">
      <span class="rs-summary-label">회의명</span>
      <span class="rs-summary-value">${draft.meetingTitle}</span>
    </div>
    <div class="rs-summary-row">
      <span class="rs-summary-label">기간</span>
      <span class="rs-summary-value">${draft.period}</span>
    </div>
    <div class="rs-summary-row">
      <span class="rs-summary-label">회의 시간</span>
      <span class="rs-summary-value">${draft.duration}</span>
    </div>
    <div class="rs-summary-row">
      <span class="rs-summary-label">필수 참석자</span>
      <span class="rs-summary-value">${roles.requiredParticipants.length}명</span>
    </div>
    <div class="rs-summary-row">
      <span class="rs-summary-label">선택 참석자</span>
      <span class="rs-summary-value">${roles.optionalParticipants.length}명</span>
    </div>
  `;
}

// ─── Status helpers ───
function getLabelBadgeClass(label) {
  if (label === '가장 추천') return 'rs-label-badge-recommend';
  if (label === '대안') return 'rs-label-badge-alternative';
  return 'rs-label-badge-low';
}

function getStatusBadgeClass(status) {
  if (status === '추천') return 'rs-status-badge-recommend';
  if (status === '확인 필요') return 'rs-status-badge-unresolved';
  return 'rs-status-badge-low';
}

function getCardBorderClass(status) {
  if (status === '추천') return 'rs-candidate-card-status-recommend';
  if (status === '확인 필요') return 'rs-candidate-card-status-unresolved';
  return '';
}

function getBtnText(status) {
  if (status === '추천') return '이 시간 선택하기';
  if (status === '확인 필요') return '확인 필요자 보기';
  return '낮은 우선순위';
}

// ─── Render candidates ───
function renderCandidates(filter) {
  const filtered = filter === '전체'
    ? timeCandidates
    : timeCandidates.filter(c => c.status === filter);

  if (filtered.length === 0) {
    candidateList.innerHTML = '';
    emptyFilter.style.display = 'block';
    return;
  }

  emptyFilter.style.display = 'none';

  candidateList.innerHTML = filtered.map(c => {
    const labelClass = getLabelBadgeClass(c.label);
    const statusClass = getStatusBadgeClass(c.status);
    const borderClass = getCardBorderClass(c.status);
    const btnText = getBtnText(c.status);

    return `
      <div class="rs-candidate-card ${borderClass}">
        <div class="rs-badge-row">
          <span class="rs-label-badge ${labelClass}">${c.label}</span>
          <span class="rs-status-badge ${statusClass}">${c.status}</span>
        </div>
        <div class="rs-candidate-time">${c.date} ${c.time}</div>
        <p class="rs-summary-line">${c.requiredSummary} · ${c.optionalSummary}</p>
        <p class="rs-summary-line">${c.unresolvedSummary}</p>
        <div class="rs-reason-list">
          ${c.reason.map(r => `<p class="rs-reason-item">${r}</p>`).join('')}
        </div>
        <button class="rs-candidate-btn" data-id="${c.id}" type="button">${btnText}</button>
      </div>
    `;
  }).join('');

  candidateList.querySelectorAll('.rs-candidate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const candidate = timeCandidates.find(c => c.id === id);
      console.log('후보 시간 선택 클릭:', candidate);
    });
  });
}

// ─── Filter ───
filterGroup.addEventListener('click', (e) => {
  const chip = e.target.closest('.rs-filter-chip');
  if (!chip) return;
  filterGroup.querySelectorAll('.rs-filter-chip').forEach(el => el.classList.remove('rs-filter-active'));
  chip.classList.add('rs-filter-active');
  currentFilter = chip.dataset.filter;
  renderCandidates(currentFilter);
});

// ─── Toast ───
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('rs-toast-visible');
  setTimeout(() => {
    toast.classList.remove('rs-toast-visible');
  }, 2000);
}

// ─── Bottom CTA ───
submitBtn.addEventListener('click', () => {
  const recommend = timeCandidates.find(c => c.id === 'candidate-1');
  if (!recommend) return;

  const data = {
    selectedCandidateId: recommend.id,
    date: recommend.date,
    time: recommend.time,
    status: recommend.status,
    requiredSummary: recommend.requiredSummary,
    optionalSummary: recommend.optionalSummary,
    unresolvedSummary: recommend.unresolvedSummary
  };

  sessionStorage.setItem('selectedTime', JSON.stringify(data));
  console.log('선택된 후보:', data);
  showToast('추천 시간을 선택했어요');
});

// ─── Init ───
function init() {
  const draft = loadDraft();
  const roles = loadRoles();

  if (!draft || !roles || !roles.requiredParticipants) {
    summaryCard.style.display = 'none';
    contentSection.style.display = 'none';
    submitBtn.style.display = 'none';
    noDataSection.style.display = 'block';
    return;
  }

  summaryCard.style.display = 'block';
  contentSection.style.display = 'block';
  noDataSection.style.display = 'none';
  submitBtn.style.display = 'flex';

  renderSummary(draft, roles);
  renderCandidates('전체');
}

init();
