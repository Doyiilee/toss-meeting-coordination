const RECOMMENDED_PARTICIPANTS = [
  { name: '김민지', team: '마케팅팀 리드', role: '의사결정권자' },
  { name: '박준호', team: '브랜드마케팅팀', role: '캠페인 PM' },
  { name: '이서연', team: '퍼포먼스마케팅팀', role: '광고 운영' },
  { name: '최현우', team: '콘텐츠팀', role: '콘텐츠 담당' },
  { name: '정다은', team: '데이터분석팀', role: '성과 분석' },
  { name: '한지훈', team: '디자인팀', role: '크리에이티브' }
];

function formatShortDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${m}.${day}`;
}

function getThisWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const off = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + off);
  return d;
}

function getWeekRangeLabel(period, customStartDate, customEndDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === '이번 주') {
    const mon = getThisWeekMonday(today);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `${formatShortDate(mon)} - ${formatShortDate(sun)}`;
  }

  if (period === '다음 주') {
    const mon = getThisWeekMonday(today);
    mon.setDate(mon.getDate() + 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `${formatShortDate(mon)} - ${formatShortDate(sun)}`;
  }

  if (period === '직접 선택' && customStartDate && customEndDate) {
    const s = new Date(customStartDate + 'T00:00:00');
    const e = new Date(customEndDate + 'T00:00:00');
    return `${formatShortDate(s)} - ${formatShortDate(e)}`;
  }

  return '';
}

const MOCK_CONTACTS = {
  이도이: { team: '프로덕트디자인팀', role: 'UX 디자이너' },
  김도윤: { team: '브랜드마케팅팀', role: '캠페인 담당' },
  박서연: { team: '데이터분석팀', role: '성과 분석' },
  최유진: { team: '콘텐츠팀', role: '콘텐츠 기획' },
  장민호: { team: '마케팅전략팀', role: '전략 담당' },
  윤하늘: { team: '디자인팀', role: '크리에이티브' }
};

const FALLBACK_CONTACT_PROFILES = [
  { team: '마케팅팀', role: '실무자' },
  { team: '브랜드마케팅팀', role: '캠페인 담당' },
  { team: '퍼포먼스마케팅팀', role: '광고 운영' },
  { team: '콘텐츠팀', role: '콘텐츠 담당' },
  { team: '데이터분석팀', role: '성과 분석' },
  { team: '디자인팀', role: '크리에이티브' },
  { team: '프로덕트디자인팀', role: 'UX 디자이너' }
];

function getStableProfileByName(name) {
  const normalizedName = name.trim();
  if (MOCK_CONTACTS[normalizedName]) {
    return MOCK_CONTACTS[normalizedName];
  }
  const hash = Array.from(normalizedName).reduce((sum, char) => {
    return sum + char.charCodeAt(0);
  }, 0);
  return FALLBACK_CONTACT_PROFILES[hash % FALLBACK_CONTACT_PROFILES.length];
}

const PERIOD_OPTIONS = ['이번 주', '다음 주', '직접 선택'];
const DURATION_OPTIONS = ['30분', '1시간', '1시간 30분'];

let selectedPeriod = '다음 주';
let selectedDuration = '1시간';
let participants = [];
let participantMeta = {};
let customStartDate = '';
let customEndDate = '';

// ─── DOM refs ───
const backBtn = document.getElementById('back-btn');
const meetingTitleInput = document.getElementById('meeting-title');
const periodGroup = document.getElementById('period-group');
const durationGroup = document.getElementById('duration-group');
const participantInput = document.getElementById('participant-input');
const addParticipantBtn = document.getElementById('add-participant-btn');
const participantError = document.getElementById('participant-error');
const selectedChips = document.getElementById('selected-chips');
const selectedEmpty = document.getElementById('selected-empty');
const selectedCount = document.getElementById('selected-count');
const recommendedList = document.getElementById('recommended-list');
const addAllBtn = document.getElementById('add-all-btn');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');
const customPeriodSection = document.getElementById('custom-period-section');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// ─── Navigation ───
backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

function saveDraft() {
  const data = {
    meetingTitle: meetingTitleInput.value.trim(),
    period: selectedPeriod,
    duration: selectedDuration,
    participants: participants,
    participantMeta: participantMeta,
    customStartDate: customStartDate,
    customEndDate: customEndDate
  };
  sessionStorage.setItem('meetingDraft', JSON.stringify(data));
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem('meetingDraft');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function updateActiveChip(group, value) {
  group.querySelectorAll('.chip').forEach(el => {
    el.classList.toggle('chip-active', el.dataset.value === value);
  });
}

function toggleCustomPeriod() {
  const isCustom = selectedPeriod === '직접 선택';
  customPeriodSection.style.display = isCustom ? 'block' : 'none';
  const err = document.querySelector('.validation-error');
  if (err) err.remove();
}

// ─── Period selection ───
periodGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  periodGroup.querySelectorAll('.chip').forEach(el => el.classList.remove('chip-active'));
  btn.classList.add('chip-active');
  selectedPeriod = btn.dataset.value;
  if (selectedPeriod !== '직접 선택') {
    customStartDate = '';
    customEndDate = '';
  }
  saveDraft();
  toggleCustomPeriod();
});

// ─── Duration selection ───
durationGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  durationGroup.querySelectorAll('.chip').forEach(el => el.classList.remove('chip-active'));
  btn.classList.add('chip-active');
  selectedDuration = btn.dataset.value;
  saveDraft();
});

// ─── Selected participants render ───
function renderSelectedSection() {
  const hasParticipants = participants.length > 0;
  selectedEmpty.style.display = hasParticipants ? 'none' : 'block';
  selectedChips.style.display = hasParticipants ? 'flex' : 'none';
  selectedCount.textContent = participants.length;

  selectedChips.innerHTML = participants.map(name => {
    const meta = participantMeta[name] || {};
    const metaText = meta.team && meta.role ? `${meta.team} · ${meta.role}` : '';
    return `
      <span class="participant-chip">
        <span class="participant-chip-info">
          <span class="participant-chip-name">${name}</span>
          ${metaText ? `<span class="participant-chip-meta">${metaText}</span>` : ''}
        </span>
        <button class="participant-chip-remove" data-name="${name}" type="button">&times;</button>
      </span>
    `;
  }).join('');

  selectedChips.querySelectorAll('.participant-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      participants = participants.filter(p => p !== name);
      delete participantMeta[name];
      renderSelectedSection();
      renderRecommended();
      saveDraft();
    });
  });
}

// ─── Recommended participants render ───
function renderRecommended() {
  recommendedList.innerHTML = RECOMMENDED_PARTICIPANTS.map(p => {
    const isAdded = participants.includes(p.name);
    return `
      <div class="recommended-card">
        <div class="recommended-card-info">
          <strong class="recommended-card-name">${p.name}</strong>
          <p class="recommended-card-detail">${p.team} · ${p.role}</p>
        </div>
        <button class="recommended-add-btn" data-name="${p.name}" ${isAdded ? 'disabled' : ''} type="button">${isAdded ? '추가됨' : '추가'}</button>
      </div>
    `;
  }).join('');

  recommendedList.querySelectorAll('.recommended-add-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const rec = RECOMMENDED_PARTICIPANTS.find(r => r.name === name);
      if (!rec) return;
      participants.push(rec.name);
      participantMeta[rec.name] = { team: rec.team, role: rec.role };
      renderSelectedSection();
      renderRecommended();
      saveDraft();
    });
  });
}

// ─── Add all recommended ───
addAllBtn.addEventListener('click', () => {
  let added = 0;
  RECOMMENDED_PARTICIPANTS.forEach(rec => {
    if (!participants.includes(rec.name)) {
      participants.push(rec.name);
      participantMeta[rec.name] = { team: rec.team, role: rec.role };
      added++;
    }
  });
  if (added > 0) {
    renderSelectedSection();
    renderRecommended();
    saveDraft();
    showToast(`추천 참석자 ${added}명을 추가했어요`);
  } else {
    showToast('모든 추천 참석자가 이미 추가되어 있어요');
  }
});

// ─── IME composition tracking ───
let isComposing = false;

participantInput.addEventListener('compositionstart', () => {
  isComposing = true;
});

participantInput.addEventListener('compositionend', () => {
  isComposing = false;
});

// ─── Add participant manually ───
function addParticipant(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  if (participants.includes(trimmed)) {
    participantError.textContent = `"${trimmed}" 님은 이미 추가되어 있습니다.`;
    return;
  }

  participantError.textContent = '';
  participants.push(trimmed);
  if (!participantMeta[trimmed]) {
    const profile = getStableProfileByName(trimmed);
    participantMeta[trimmed] = { team: profile.team, role: profile.role };
  }
  renderSelectedSection();
  renderRecommended();
  participantInput.value = '';
  saveDraft();
}

addParticipantBtn.addEventListener('click', () => {
  addParticipant(participantInput.value);
});

participantInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!isComposing && !e.isComposing) {
      addParticipant(participantInput.value);
    }
  }
});

// ─── Custom date input changes ───
startDateInput.addEventListener('change', () => {
  customStartDate = startDateInput.value;
  saveDraft();
  const err = document.querySelector('.validation-error');
  if (err) err.remove();
});

endDateInput.addEventListener('change', () => {
  customEndDate = endDateInput.value;
  saveDraft();
  const err = document.querySelector('.validation-error');
  if (err) err.remove();
});

// ─── Toast ───
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('toast-visible');
  setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 2000);
}

// ─── Title input clears validation error ───
meetingTitleInput.addEventListener('input', () => {
  const error = document.querySelector('.validation-error');
  if (error) error.remove();
});

// ─── Validation & Submit ───
submitBtn.addEventListener('click', () => {
  const title = meetingTitleInput.value.trim();
  let errorMsg = '';

  if (!title) {
    errorMsg = '회의명을 입력해주세요.';
  } else if (selectedPeriod === '직접 선택') {
    if (!customStartDate) {
      errorMsg = '시작일을 선택해주세요.';
    } else if (!customEndDate) {
      errorMsg = '종료일을 선택해주세요.';
    } else if (customEndDate < customStartDate) {
      errorMsg = '종료일은 시작일 이후로 선택해주세요.';
    } else if (participants.length < 2) {
      errorMsg = '참석자를 2명 이상 추가해주세요.';
    }
  } else if (participants.length < 2) {
    errorMsg = '참석자를 2명 이상 추가해주세요.';
  }

  const existingError = document.querySelector('.validation-error');
  if (existingError) existingError.remove();

  if (errorMsg) {
    const el = document.createElement('p');
    el.className = 'validation-error';
    el.textContent = errorMsg;
    submitBtn.parentNode.insertBefore(el, submitBtn);
    return;
  }

  let displayPeriod = selectedPeriod;
  if (selectedPeriod === '직접 선택' && customStartDate && customEndDate) {
    const fmt = (d) => d.replace(/-/g, '.');
    displayPeriod = `${fmt(customStartDate)} - ${fmt(customEndDate)}`;
  }

  const searchRangeLabel = getWeekRangeLabel(selectedPeriod, customStartDate, customEndDate);

  const data = {
    meetingTitle: title,
    period: selectedPeriod,
    displayPeriod: displayPeriod,
    searchRangeLabel: searchRangeLabel,
    duration: selectedDuration,
    participants: participants,
    participantMeta: participantMeta,
    customStartDate: customStartDate,
    customEndDate: customEndDate
  };

  sessionStorage.setItem('meetingDraft', JSON.stringify(data));
  console.log('저장된 데이터:', data);
  showToast('회의 조건을 저장했어요');
  setTimeout(() => {
    window.location.href = 'participants.html';
  }, 400);
});

// ─── Init ───
function init() {
  const draft = loadDraft();
  if (draft && draft.participants) {
    meetingTitleInput.value = draft.meetingTitle || '';
    selectedPeriod = draft.period || '다음 주';
    selectedDuration = draft.duration || '1시간';
    participants = [...draft.participants];
    participantMeta = draft.participantMeta ? { ...draft.participantMeta } : {};
    customStartDate = draft.customStartDate || '';
    customEndDate = draft.customEndDate || '';
    startDateInput.value = customStartDate;
    endDateInput.value = customEndDate;
    updateActiveChip(periodGroup, selectedPeriod);
    updateActiveChip(durationGroup, selectedDuration);
    toggleCustomPeriod();
  } else {
    participants = [];
    participantMeta = {};
  }
  renderSelectedSection();
  renderRecommended();
}

init();
