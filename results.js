let timeCandidates = [];

function optSummary(total, avail) {
  if (total === 0) return '선택 참석자 없음';
  return `선택 참석자 ${total}명 중 ${avail}명 가능`;
}

function optReasonAll(total) {
  if (total === 0) return '선택 참석자 없이 필수 참석자 기준으로 판단했어요.';
  return `선택 참석자 ${total}명도 참석 가능해요.`;
}

function optReasonPartial(total, avail) {
  if (total === 0) return '선택 참석자가 없어요.';
  return `선택 참석자 ${total}명 중 ${avail}명이 참석 가능해요.`;
}

function buildTimeCandidates(requiredTotal, optionalTotal) {
  const ra = Math.max;
  const reqAvail1 = requiredTotal;
  const reqAvail2 = ra(requiredTotal - 1, 0);
  const optAvailFull = optionalTotal;
  const optAvailHalf = optionalTotal > 0 ? ra(optionalTotal - 1, 0) : 0;

  return [
    {
      id: 'candidate-1',
      label: '가장 추천',
      date: '화요일',
      time: '10:00 - 11:00',
      status: '추천',
      requiredSummary: `필수 참석자 ${requiredTotal}명 전원 가능`,
      optionalSummary: optSummary(optionalTotal, optAvailFull),
      unresolvedSummary: '확인 필요 없음',
      reason: [
        `필수 참석자 ${requiredTotal}명이 모두 가능해요.`,
        optReasonAll(optionalTotal),
        '확인 필요자가 없어 바로 확정할 수 있어요.'
      ],
      requiredAvailable: reqAvail1,
      requiredTotal,
      optionalAvailable: optAvailFull,
      optionalTotal,
      unresolvedCount: 0
    },
    {
      id: 'candidate-2',
      label: '대안',
      date: '수요일',
      time: '11:00 - 12:00',
      status: '추천',
      requiredSummary: `필수 참석자 ${requiredTotal}명 전원 가능`,
      optionalSummary: optSummary(optionalTotal, optAvailHalf),
      unresolvedSummary: '확인 필요 없음',
      reason: [
        `필수 참석자 ${requiredTotal}명이 모두 가능해요.`,
        optReasonPartial(optionalTotal, optAvailHalf),
        '확인 필요자가 없어 바로 확정할 수 있어요.'
      ],
      requiredAvailable: reqAvail1,
      requiredTotal,
      optionalAvailable: optAvailHalf,
      optionalTotal,
      unresolvedCount: 0
    },
    {
      id: 'candidate-3',
      label: '대안',
      date: '수요일',
      time: '16:00 - 17:00',
      status: '확인 필요',
      requiredSummary: `필수 참석자 ${requiredTotal}명 중 ${reqAvail2}명 가능`,
      optionalSummary: optSummary(optionalTotal, optAvailFull),
      unresolvedSummary: `확인 필요 ${requiredTotal > 0 ? 1 : 0}명`,
      reason: [
        `필수 참석자 ${reqAvail2}명이 가능하지만, 1명의 확인이 필요해요.`,
        optReasonAll(optionalTotal),
        '확인 후 확정 가능성이 있어요.'
      ],
      requiredAvailable: reqAvail2,
      requiredTotal,
      optionalAvailable: optAvailFull,
      optionalTotal,
      unresolvedCount: requiredTotal > 0 ? 1 : 0
    },
    {
      id: 'candidate-4',
      label: '대안',
      date: '목요일',
      time: '15:00 - 16:00',
      status: '확인 필요',
      requiredSummary: `필수 참석자 ${requiredTotal}명 전원 가능`,
      optionalSummary: optSummary(optionalTotal, optAvailHalf),
      unresolvedSummary: `확인 필요 ${optionalTotal > 0 ? 1 : 1}명`,
      reason: [
        `필수 참석자 ${requiredTotal}명이 모두 가능해요.`,
        optionalTotal > 0
          ? `선택 참석자 ${optionalTotal}명 중 1명의 일정 확인이 필요해요.`
          : '선택 참석자가 없어요.',
        '확인 후 확정 가능성이 있어요.'
      ],
      requiredAvailable: reqAvail1,
      requiredTotal,
      optionalAvailable: optAvailHalf,
      optionalTotal,
      unresolvedCount: optionalTotal > 0 ? 1 : 1
    },
    {
      id: 'candidate-5',
      label: '비추천',
      date: '금요일',
      time: '14:00 - 15:00',
      status: '비추천',
      requiredSummary: `필수 참석자 ${requiredTotal}명 중 ${reqAvail2}명 가능`,
      optionalSummary: optSummary(optionalTotal, optAvailHalf),
      unresolvedSummary: '확인 필요 없음',
      reason: [
        '필수 참석자 중 참석이 어려운 사람이 있어요.',
        '회의 성립 조건을 만족하지 못해 우선순위가 낮아요.'
      ],
      requiredAvailable: reqAvail2,
      requiredTotal,
      optionalAvailable: optAvailHalf,
      optionalTotal,
      unresolvedCount: 0
    }
  ];
}

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
      <span class="rs-summary-value">${draft.displayPeriod || draft.period}</span>
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
      const data = {
        selectedCandidateId: candidate.id,
        date: candidate.date,
        time: candidate.time,
        status: candidate.status,
        requiredSummary: candidate.requiredSummary,
        optionalSummary: candidate.optionalSummary,
        unresolvedSummary: candidate.unresolvedSummary,
        reason: candidate.reason
      };
      sessionStorage.setItem('selectedTime', JSON.stringify(data));
      window.location.href = 'detail.html';
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
    unresolvedSummary: recommend.unresolvedSummary,
    reason: recommend.reason
  };

  sessionStorage.setItem('selectedTime', JSON.stringify(data));
  console.log('선택된 후보:', data);
  showToast('추천 시간을 선택했어요');
  setTimeout(() => {
    window.location.href = 'detail.html';
  }, 400);
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
  const requiredTotal = roles.requiredParticipants.length;
  const optionalTotal = roles.optionalParticipants.length;
  timeCandidates = buildTimeCandidates(requiredTotal, optionalTotal);
  renderCandidates('전체');
}

init();
