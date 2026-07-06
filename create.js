const DEFAULT_PARTICIPANTS = [
  '김민지', '박준호', '이서연', '최현우', '정다은', '한지훈'
];

const PERIOD_OPTIONS = ['이번 주', '다음 주', '직접 선택'];
const DURATION_OPTIONS = ['30분', '1시간', '1시간 30분'];

let selectedPeriod = '다음 주';
let selectedDuration = '1시간';
let participants = [...DEFAULT_PARTICIPANTS];

// ─── DOM refs ───
const backBtn = document.getElementById('back-btn');
const meetingTitleInput = document.getElementById('meeting-title');
const periodGroup = document.getElementById('period-group');
const durationGroup = document.getElementById('duration-group');
const participantInput = document.getElementById('participant-input');
const addParticipantBtn = document.getElementById('add-participant-btn');
const participantChips = document.getElementById('participant-chips');
const participantError = document.getElementById('participant-error');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');

// ─── Navigation ───
backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

function saveDraft() {
  const data = {
    meetingTitle: meetingTitleInput.value.trim(),
    period: selectedPeriod,
    duration: selectedDuration,
    participants: participants
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

// ─── Period selection ───
periodGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  periodGroup.querySelectorAll('.chip').forEach(el => el.classList.remove('chip-active'));
  btn.classList.add('chip-active');
  selectedPeriod = btn.dataset.value;
  saveDraft();
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

// ─── Participant render ───
function renderParticipants() {
  participantChips.innerHTML = participants.map(name => `
    <span class="participant-chip">
      ${name}
      <button class="participant-chip-remove" data-name="${name}" type="button">&times;</button>
    </span>
  `).join('');

  participantChips.querySelectorAll('.participant-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      participants = participants.filter(p => p !== name);
      renderParticipants();
      saveDraft();
    });
  });
}

// ─── IME composition tracking ───
let isComposing = false;

participantInput.addEventListener('compositionstart', () => {
  isComposing = true;
});

participantInput.addEventListener('compositionend', () => {
  isComposing = false;
});

// ─── Add participant ───
function addParticipant(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  if (participants.includes(trimmed)) {
    participantError.textContent = `"${trimmed}" 님은 이미 추가되어 있습니다.`;
    return;
  }

  participantError.textContent = '';
  participants.push(trimmed);
  renderParticipants();
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
  } else if (participants.length < 2) {
    errorMsg = '참석자를 2명 이상 추가해주세요.';
  }

  // Remove previous inline validation error
  const existingError = document.querySelector('.validation-error');
  if (existingError) existingError.remove();

  if (errorMsg) {
    const el = document.createElement('p');
    el.className = 'validation-error';
    el.textContent = errorMsg;
    submitBtn.parentNode.insertBefore(el, submitBtn);
    return;
  }

  const data = {
    meetingTitle: title,
    period: selectedPeriod,
    duration: selectedDuration,
    participants: participants
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
    participants = draft.participants.length > 0
      ? [...draft.participants]
      : [...DEFAULT_PARTICIPANTS];
    updateActiveChip(periodGroup, selectedPeriod);
    updateActiveChip(durationGroup, selectedDuration);
  }
  renderParticipants();
}

init();
