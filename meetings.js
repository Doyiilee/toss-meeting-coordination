function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast-visible');
  setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 2000);
}

function clearPreviousSession() {
  const keys = ['meetingDraft', 'participantsDraft', 'participantRoles', 'selectedTime', 'finalCandidate'];
  keys.forEach(key => sessionStorage.removeItem(key));
}

const selectedParticipants = new Set();
const participantRole = new Map();
const participantReason = new Map();
let selectedDuration = 60;
const calendarYear = 2026;
const calendarMonth = 6;
const defaultStartDate = '2026.07.14';
const defaultEndDate = '2026.07.20';
let startDate = null;
let endDate = null;
let currentStep = 1;
let selectedCandidateId = null;

function resetSelectedParticipants() {
  selectedParticipants.clear();
  participantRole.clear();
  participantReason.clear();
  document.querySelectorAll('.participant-chip').forEach(chip => {
    chip.classList.remove('chip-selected');
  });
  renderSelectedParticipants();
}

function renderSelectedParticipants() {
  const list = document.getElementById('selected-participants');
  const empty = document.getElementById('empty-participants');
  list.querySelectorAll('.selected-participant-item').forEach(item => item.remove());

  if (selectedParticipants.size === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  selectedParticipants.forEach(name => {
    const item = document.createElement('span');
    item.className = 'selected-participant-item';
    item.textContent = name;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-participant';
    removeButton.setAttribute('aria-label', `${name} 제거`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      selectedParticipants.delete(name);
      participantRole.delete(name);
      participantReason.delete(name);
      document.querySelector(`.participant-chip[data-participant="${name}"]`)?.classList.remove('chip-selected');
      renderSelectedParticipants();
    });

    item.appendChild(removeButton);
    list.appendChild(item);
  });
}

function openMeetingDrawer() {
  clearPreviousSession();
  resetSelectedParticipants();
  renderCalendarRange();
  goToStep(1);
  const drawer = document.getElementById('meeting-drawer');
  const backdrop = document.getElementById('meeting-drawer-backdrop');

  drawer.classList.add('drawer-visible');
  backdrop.classList.add('drawer-visible');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  setTimeout(() => document.getElementById('meeting-title-input').focus(), 80);
}

function closeMeetingDrawer() {
  const drawer = document.getElementById('meeting-drawer');
  const backdrop = document.getElementById('meeting-drawer-backdrop');

  drawer.classList.remove('drawer-visible');
  backdrop.classList.remove('drawer-visible');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
}

function validateStep1() {
  const title = document.getElementById('meeting-title-input').value.trim();
  if (!title) {
    showToast('회의명을 입력해주세요.');
    return false;
  }
  if (!startDate || !endDate) {
    showToast('회의 후보 탐색 기간을 선택해주세요.');
    return false;
  }
  if (selectedParticipants.size < 2) {
    showToast('참석자를 최소 2명 이상 추가해주세요.');
    return false;
  }
  return true;
}

function validateStep2() {
  let hasRequired = false;
  selectedParticipants.forEach(name => {
    if ((participantRole.get(name) || 'required') === 'required') {
      hasRequired = true;
    }
  });
  if (!hasRequired) {
    showToast('필수 참석자를 최소 1명 이상 지정해주세요.');
    return false;
  }
  return true;
}

function goToStep(step) {
  document.querySelectorAll('.drawer-step-content').forEach(el => {
    el.hidden = el.dataset.step !== String(step);
  });

  const steps = document.querySelectorAll('.drawer-step');
  steps.forEach((el, i) => {
    const num = i + 1;
    el.classList.remove('drawer-step-active', 'drawer-step-completed');
    const span = el.querySelector('span');
    if (num < step) {
      el.classList.add('drawer-step-completed');
      span.textContent = '✓';
    } else if (num === step) {
      el.classList.add('drawer-step-active');
      span.textContent = String(num);
    } else {
      span.textContent = String(num);
    }
  });

  const title = document.getElementById('meeting-drawer-title');
  const desc = document.querySelector('.drawer-description');

  if (step === 1) {
    title.textContent = '회의 조건을 입력하세요';
    desc.textContent = '참석자와 조건을 설정하면 가능한 회의 시간을 추천해요.';
  } else if (step === 2) {
    title.textContent = '참석자 조건을 설정하세요';
    desc.textContent = '각 참석자의 역할을 필수 또는 선택으로 지정해주세요.';
  } else if (step === 3) {
    title.textContent = '후보 시간을 추천했어요';
    desc.textContent = '필수 참석자와 선택 참석자의 일정을 비교해 추천하는 후보예요.';
  }

  document.getElementById('drawer-prev-step').hidden = step === 1;
  document.getElementById('meeting-drawer-cancel').hidden = step !== 1;
  document.getElementById('drawer-next-step').hidden = step !== 1;
  document.getElementById('drawer-submit').hidden = step !== 2;
  document.getElementById('drawer-confirm-step').hidden = step !== 3;

  if (step === 2) {
    renderParticipantRoles();
    updateRoleSummary();
  } else if (step === 3) {
    document.querySelector('.drawer-body').scrollTop = 0;
    renderCandidates();
  }

  currentStep = step;
}

function renderParticipantRoles() {
  const list = document.getElementById('role-card-list');
  list.innerHTML = '';

  if (selectedParticipants.size === 0) {
    list.innerHTML = '<p class="role-card-list-empty">선택된 참석자가 없어요.</p>';
    return;
  }

  selectedParticipants.forEach(name => {
    const role = participantRole.get(name) || 'required';
    const reason = participantReason.get(name) || '직접 추가';

    const card = document.createElement('div');
    card.className = 'role-card';
    card.dataset.participant = name;

    card.innerHTML = `
      <div class="role-card-info">
        <span class="role-card-name">${name}</span>
        <span class="role-card-reason">${reason}</span>
      </div>
      <div class="role-segmented" role="group" aria-label="${name} 역할">
        <button type="button" class="role-option ${role === 'required' ? 'role-option-active' : ''}" data-role="required">필수</button>
        <button type="button" class="role-option ${role === 'optional' ? 'role-option-active' : ''}" data-role="optional">선택</button>
      </div>
    `;

    list.appendChild(card);
  });
}

function updateRoleSummary() {
  let required = 0;
  let optional = 0;

  selectedParticipants.forEach(name => {
    const role = participantRole.get(name) || 'required';
    if (role === 'required') required++;
    else optional++;
  });

  document.getElementById('required-count').textContent = required;
  document.getElementById('optional-count').textContent = optional;
}

function addDays(dateStr, days) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatCalendarDate(date);
}

function getDayOfWeek(dateStr) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[parseDate(dateStr).getDay()];
}

function formatTimeRange(startHour, startMin, duration) {
  const startStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
  const totalMin = startHour * 60 + startMin + duration;
  const endHour = Math.floor(totalMin / 60);
  const endMin = totalMin % 60;
  const endStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  return `${startStr} - ${endStr}`;
}

function getCandidateData(candidateId) {
  const card = document.querySelector(`.drawer-candidate-card[data-candidate-id="${candidateId}"]`);
  if (!card) return null;
  return {
    id: candidateId,
    date: card.dataset.date,
    dayOfWeek: card.dataset.dayOfWeek,
    timeRange: card.dataset.timeRange,
    duration: selectedDuration,
  };
}

function renderCandidates() {
  const container = document.getElementById('drawer-candidate-list');
  container.innerHTML = '';

  let requiredTotal = 0;
  let optionalTotal = 0;
  selectedParticipants.forEach(name => {
    if ((participantRole.get(name) || 'required') === 'required') requiredTotal++;
    else optionalTotal++;
  });

  const baseDate = startDate || defaultStartDate;
  const duration = selectedDuration;

  const candidates = [
    {
      id: 'candidate-1',
      badge: '가장 추천',
      badgeClass: 'badge-blue',
      dayOffset: 0,
      startHour: 10,
      startMin: 0,
      statusText: '확정 가능',
      statusClass: 'green',
      requiredNum: requiredTotal,
      requiredDen: requiredTotal,
      optionalNum: Math.max(optionalTotal - 1, 0),
      optionalDen: optionalTotal,
      needCheck: optionalTotal > 0 ? '선택 참석자 1명' : '없음',
      desc: '필수 참석자가 모두 가능해 바로 확정할 수 있어요.',
    },
    {
      id: 'candidate-2',
      badge: '대안',
      badgeClass: 'badge-green',
      dayOffset: 1,
      startHour: 14,
      startMin: 0,
      statusText: '확정 가능',
      statusClass: 'green',
      requiredNum: requiredTotal,
      requiredDen: requiredTotal,
      optionalNum: optionalTotal,
      optionalDen: optionalTotal,
      needCheck: '없음',
      desc: '모든 참석자가 가능한 안정적인 후보예요.',
    },
    {
      id: 'candidate-3',
      badge: '확인 필요',
      badgeClass: 'badge-yellow',
      dayOffset: 2,
      startHour: 13,
      startMin: 0,
      statusText: '확인 후 확정',
      statusClass: 'yellow',
      requiredNum: Math.max(requiredTotal - 1, 0),
      requiredDen: requiredTotal,
      optionalNum: optionalTotal,
      optionalDen: optionalTotal,
      needCheck: requiredTotal > 0 ? '필수 참석자 1명' : '없음',
      desc: requiredTotal > 0 ? '필수 참석자 1명의 확인이 필요해 바로 확정할 수 없어요.' : '',
    },
  ];

  candidates.forEach(candidate => {
    const dateStr = addDays(baseDate, candidate.dayOffset);
    const dayOfWeek = getDayOfWeek(dateStr);
    const timeStr = formatTimeRange(candidate.startHour, candidate.startMin, duration);
    const selected = selectedCandidateId === candidate.id;

    let optionalText;
    if (optionalTotal > 0) {
      optionalText = `${candidate.optionalNum}/${candidate.optionalDen} 가능`;
    } else {
      optionalText = '선택 참석자 없음';
    }

    const card = document.createElement('div');
    card.className = `drawer-candidate-card${selected ? ' selected' : ''}`;
    card.dataset.candidateId = candidate.id;
    card.dataset.date = dateStr;
    card.dataset.dayOfWeek = dayOfWeek;
    card.dataset.timeRange = timeStr;

    card.innerHTML = `
      <div class="drawer-candidate-head">
        <span class="badge ${candidate.badgeClass}">${candidate.badge}</span>
        ${selected ? '<span class="drawer-candidate-selected-mark">선택됨</span>' : ''}
      </div>
      <h4 class="drawer-candidate-time">${dateStr} (${dayOfWeek})<br />${timeStr}</h4>
      <div class="drawer-candidate-metrics">
        <div class="drawer-candidate-metric drawer-candidate-metric-required">
          <span>필수 참석자</span>
          <strong>${candidate.requiredNum}/${candidate.requiredDen} 가능</strong>
        </div>
        <div class="drawer-candidate-metric drawer-candidate-metric-optional">
          <span>선택 참석자</span>
          <strong>${optionalText}</strong>
        </div>
        <div class="drawer-candidate-metric">
          <span>확인 필요</span>
          <strong>${candidate.needCheck}</strong>
        </div>
      </div>
      <span class="candidate-status-pill ${candidate.statusClass}">${candidate.statusText}</span>
      <p class="candidate-status-desc">${candidate.desc}</p>
    `;

    container.appendChild(card);
  });
}

function renderConfirmedMeetings() {
  const section = document.querySelector('.confirmed-section');
  const table = section.querySelector('.confirmed-table');
  const meetings = JSON.parse(sessionStorage.getItem('confirmedMeetings') || '[]');

  document.querySelectorAll('.confirmed-row--new').forEach(el => el.remove());

  meetings.forEach((meeting, index) => {
    const allParticipants = [...meeting.requiredParticipants, ...meeting.optionalParticipants];
    const participantText = allParticipants.length > 0 ? `참석자 ${allParticipants.length}명` : '참석자 없음';

    const row = document.createElement('div');
    row.className = 'meeting-table-row confirmed-row--new';
    row.setAttribute('role', 'row');
    row.innerHTML = `
      <div class="meeting-table-cell table-index" role="cell"><span>${index + 2}</span></div>
      <div class="meeting-table-cell" role="cell"><span class="badge badge-green">확정 완료</span></div>
      <div class="meeting-table-cell table-title" role="cell">${meeting.title}</div>
      <div class="meeting-table-cell" role="cell">${meeting.date} (${meeting.dayOfWeek}) ${meeting.timeRange}</div>
      <div class="meeting-table-cell" role="cell">${participantText}</div>
      <div class="meeting-table-cell" role="cell">회의실 미정</div>
      <div class="meeting-table-cell status-green" role="cell">내 캘린더에 추가됐어요</div>
      <div class="meeting-table-cell table-action" role="cell">
        <button type="button" class="btn-secondary table-btn">회의 상세 보기</button>
      </div>
    `;

    row.querySelector('.btn-secondary').addEventListener('click', () => {
      openDetailDrawer(index);
    });

    table.appendChild(row);
  });
}

function openDetailDrawer(index) {
  const meetings = JSON.parse(sessionStorage.getItem('confirmedMeetings') || '[]');
  const meeting = meetings[index];
  if (!meeting) return;

  renderDetailContent(meeting);

  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');

  drawer.classList.add('visible');
  backdrop.classList.add('visible');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-drawer-open');
}

function closeDetailDrawer() {
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');

  drawer.classList.remove('visible');
  backdrop.classList.remove('visible');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('detail-drawer-open');
}

function openStaticConfirmedDetail() {
  const meeting = {
    title: '브랜드 캠페인 주간 회의',
    date: '2026.07.15',
    dayOfWeek: '수',
    timeRange: '14:00 - 15:00',
    duration: 60,
    candidateLabel: '확정 완료',
    requiredParticipants: ['이도이', '김민지', '박준호', '이연수'],
    optionalParticipants: ['정다은', '한지훈'],
  };

  renderDetailContent(meeting);

  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');

  drawer.classList.add('visible');
  backdrop.classList.add('visible');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-drawer-open');
}

function renderDetailContent(meeting) {
  document.getElementById('detail-drawer-title').textContent = meeting.title;

  const body = document.getElementById('detail-drawer-body');
  body.innerHTML = `
    <div class="detail-info-card">
      <div class="detail-info-row">
        <span>날짜</span>
        <strong>${meeting.date} (${meeting.dayOfWeek})</strong>
      </div>
      <div class="detail-info-row">
        <span>시간</span>
        <strong>${meeting.timeRange}</strong>
      </div>
      <div class="detail-info-row">
        <span>회의 길이</span>
        <strong>${meeting.duration}분</strong>
      </div>
      <div class="detail-info-row">
        <span>선택 후보</span>
        <strong>${meeting.candidateLabel}</strong>
      </div>
    </div>
    <div class="detail-participant-section">
      <div class="detail-participant-section-title">필수 참석자 ${meeting.requiredParticipants.length}명</div>
      <div class="detail-participant-list">
        ${meeting.requiredParticipants.length > 0
          ? meeting.requiredParticipants.map(name => `<div class="detail-participant-item">${name}</div>`).join('')
          : '<div class="detail-participant-empty">필수 참석자가 없어요.</div>'
        }
      </div>
    </div>
    <div class="detail-participant-section">
      <div class="detail-participant-section-title">선택 참석자 ${meeting.optionalParticipants.length}명</div>
      <div class="detail-participant-list">
        ${meeting.optionalParticipants.length > 0
          ? meeting.optionalParticipants.map(name => `<div class="detail-participant-item">${name}</div>`).join('')
          : '<div class="detail-participant-empty">선택 참석자가 없어요.</div>'
        }
      </div>
    </div>
  `;
}

/* ---- Timeline ---- */

/* ---- Schedule Popover Data ---- */

const schedulePopoverData = [
  {
    id: 'unavailable-tue-09-12',
    type: 'unavailable',
    dateLabel: '14(화)',
    timeRange: '09:00 - 12:00',
    statusText: '참석자 일정과 겹치는 시간이에요',
    blockedLabel: '일정이 있는 참석자',
    blockedCount: 2,
    blockedMembers: [
      { name: '김현우', reason: '리더십 회의', time: '09:00 - 12:00' },
      { name: '박서연', reason: '프로젝트 회의', time: '09:00 - 12:00' },
    ],
    availableLabel: '가능한 참석자',
    availableCount: 4,
    availableMembers: ['이도이', '정민재', '최유진', '강태오'],
  },
  {
    id: 'available-thu-10-11',
    type: 'available',
    dateLabel: '16(목)',
    timeRange: '10:00 - 11:00',
    statusText: '모두가 가능한 시간이에요',
    availableLabel: '가능한 참석자',
    availableCount: 6,
    availableMembers: ['이도이', '김현우', '박서연', '정민재', '최유진', '강태오'],
    ctaLabel: '이 시간으로 회의 만들기',
    isRange: false,
  },
  {
    id: 'available-tue-13-15',
    type: 'available',
    dateLabel: '14(화)',
    timeRange: '13:00 - 15:00',
    statusText: '모두가 가능한 시간이에요',
    availableLabel: '가능한 참석자',
    availableCount: 6,
    availableMembers: ['이도이', '김현우', '박서연', '정민재', '최유진', '강태오'],
    meetingHint: '1시간 회의 후보 2개가 있어요.',
    ctaLabel: '이 구간에서 회의 만들기',
    isRange: true,
  },
];

let currentPopoverId = null;
let currentPopoverAnchor = null;
let isPopoverHover = false;

function getSchedulePopoverData(id) {
  const static = schedulePopoverData.find(d => d.id === id);
  if (static) return static;
  if (id && id.startsWith('conflict-')) {
    const parts = id.split('-');
    const dayIndex = Number(parts[1]);
    const hour = Number(parts[2]);
    if (!isNaN(dayIndex) && !isNaN(hour)) {
      return computeConflictPopoverData(dayIndex, hour);
    }
  }
  return null;
}

function getPopoverIdForSlot(dayIndex, hour) {
  if (dayIndex === 1 && hour === 13) return 'available-tue-13-15';
  if (dayIndex === 3 && hour === 10) return 'available-thu-10-11';
  return null;
}

function renderSchedulePopover(data) {
  const isUnavailable = data.type === 'unavailable';

  let html = '<div class="schedule-popover-header-section">';
  html += '<div class="schedule-popover-title-row">';
  html += `<strong class="schedule-popover-title">${data.dateLabel} ${data.timeRange}</strong>`;
  if (!isUnavailable) {
    html += '<button type="button" class="schedule-popover-close" aria-label="닫기">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +
      '<path d="M18 6L6 18" stroke="#171A1F" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M6 6L18 18" stroke="#171A1F" stroke-width="2" stroke-linecap="round"/>' +
      '</svg></button>';
  }
  html += '</div>';
  html += `<p class="schedule-popover-status schedule-popover-status--${data.type}">${data.statusText}</p>`;
  html += '</div>';

  const hasBlocked = data.blockedMembers && data.blockedMembers.length > 0;
  if (hasBlocked) {
    const countColor = isUnavailable ? 'red' : 'orange';
    html += '<div class="schedule-popover-section">';
    html += '<div class="schedule-popover-section-header">';
    html += `<span>${data.blockedLabel}</span>`;
    html += `<span class="schedule-popover-count"><strong class="schedule-popover-count-num schedule-popover-count-num--${countColor}">${data.blockedCount}</strong><span class="schedule-popover-count-label">명</span></span>`;
    html += '</div>';
    html += '<div class="schedule-popover-members">';
    data.blockedMembers.forEach(m => {
      html += `<div class="schedule-popover-member-row">
        <span class="schedule-popover-member-name">${m.name}</span>
        <span class="schedule-popover-member-reason">${m.reason}</span>
        <span class="schedule-popover-member-time">${m.time}</span>
      </div>`;
    });
    html += '</div></div>';
  }

  html += '<div class="schedule-popover-section">';
  html += '<div class="schedule-popover-section-header">';
  html += `<span>${data.availableLabel}</span>`;
  html += `<span class="schedule-popover-count"><strong class="schedule-popover-count-num schedule-popover-count-num--blue">${data.availableCount}</strong><span class="schedule-popover-count-label">명</span></span>`;
  html += '</div>';
  html += `<p class="schedule-popover-member-list">${data.availableMembers.join(' · ')}</p>`;
  html += '</div>';

  if (data.meetingHint) {
    html += `<p class="schedule-popover-hint">${data.meetingHint}</p>`;
  }

  if (data.ctaLabel) {
    const ctaClass = data.type === 'check-required' ? 'schedule-popover-cta--secondary' : 'schedule-popover-cta--primary';
    html += `<button type="button" class="schedule-popover-cta ${ctaClass}">${data.ctaLabel}</button>`;
  }

  return html;
}

function positionSchedulePopover(popoverEl, anchorEl) {
  popoverEl.style.left = '0';
  popoverEl.style.top = '0';

  const popoverW = popoverEl.offsetWidth || 280;
  const popoverH = popoverEl.offsetHeight;
  const rect = anchorEl.getBoundingClientRect();
  const gap = 10;

  let left = rect.left + rect.width / 2 - popoverW / 2;
  let top = rect.top - popoverH - gap;

  if (top < 10) {
    top = rect.bottom + gap;
  }

  if (left < 10) left = 10;
  if (left + popoverW > window.innerWidth - 10) left = window.innerWidth - popoverW - 10;

  popoverEl.style.left = `${left}px`;
  popoverEl.style.top = `${top}px`;
}

function openSchedulePopover(id, anchorEl, isHover) {
  closeSchedulePopover();
  hideTimelineTooltip();
  const data = getSchedulePopoverData(id);
  if (!data) return;

  const el = document.getElementById('schedule-popover');
  el.innerHTML = renderSchedulePopover(data);
  el.className = `schedule-popover schedule-popover--${data.type}`;
  el.dataset.currentId = id;

  el.style.visibility = 'hidden';
  el.classList.add('visible');
  positionSchedulePopover(el, anchorEl);

  requestAnimationFrame(() => {
    el.style.visibility = '';
  });

  currentPopoverId = id;
  currentPopoverAnchor = anchorEl;
  isPopoverHover = isHover || false;
}

function closeSchedulePopover() {
  const el = document.getElementById('schedule-popover');
  el.classList.remove('visible');
  currentPopoverId = null;
  currentPopoverAnchor = null;
  isPopoverHover = false;
}

function handleSchedulePopoverCTA(ctaEl) {
  if (!currentPopoverId) return;
  const data = getSchedulePopoverData(currentPopoverId);
  if (!data) return;

  closeSchedulePopover();

  if (data.type === 'available') {
    const slotMap = {
      'available-thu-10-11': { dayIndex: 3, hour: 10 },
      'available-tue-13-15': { dayIndex: 1, hour: 13 },
    };
    const info = slotMap[currentPopoverId];
    if (info) {
      const slot = getTimelineSlot(info.dayIndex, info.hour);
      if (slot) openTimelineModal(slot);
    }
  }
}

function bindSchedulePopoverEvents() {
  const popover = document.getElementById('schedule-popover');

  popover.addEventListener('click', (e) => {
    if (e.target.closest('.schedule-popover-close')) {
      closeSchedulePopover();
      return;
    }
    const cta = e.target.closest('.schedule-popover-cta');
    if (cta) {
      e.preventDefault();
      handleSchedulePopoverCTA(cta);
    }
  });

  document.addEventListener('click', (e) => {
    const el = document.getElementById('schedule-popover');
    if (!el.classList.contains('visible') || isPopoverHover) return;
    if (el.contains(e.target)) return;
    if (currentPopoverAnchor && currentPopoverAnchor.contains(e.target)) return;
    closeSchedulePopover();
  });
}

const cellPopoverMap = {
  '1-9': 'unavailable-tue-09-12',
  '1-10': 'unavailable-tue-09-12',
  '1-11': 'unavailable-tue-09-12',
};

const teamMembers = [
  { name: '이도이', role: '주니어 브랜드 마케터', required: true },
  { name: '김현우', role: '마케팅팀 팀장', required: true },
  { name: '박서연', role: '캠페인 PM', required: true },
  { name: '정민재', role: '퍼포먼스 마케터', required: true },
  { name: '최유진', role: '콘텐츠 마케터', required: false },
  { name: '강태오', role: '제휴/영업 마케터', required: false },
];

const memberSchedules = [
  { name: '이도이', events: [
    { dayIndex: 0, startHour: 9, endHour: 12, reason: '개인 업무' },
    { dayIndex: 0, startHour: 13, endHour: 16, reason: '프로젝트 준비' },
    { dayIndex: 2, startHour: 9, endHour: 11, reason: '데일리 스크럼' },
    { dayIndex: 3, startHour: 13, endHour: 16, reason: '프로젝트 회의' },
    { dayIndex: 4, startHour: 9, endHour: 10, reason: '주간 정리' },
    { dayIndex: 4, startHour: 10, endHour: 11, reason: '프로젝트 정리' },
    { dayIndex: 4, startHour: 13, endHour: 14, reason: '프로젝트 리뷰' },
    { dayIndex: 4, startHour: 14, endHour: 15, reason: '프로젝트 마무리' },
  ]},
  { name: '김현우', events: [
    { dayIndex: 0, startHour: 9, endHour: 12, reason: '리더십 회의' },
    { dayIndex: 0, startHour: 13, endHour: 14, reason: '점심 미팅' },
    { dayIndex: 0, startHour: 15, endHour: 16, reason: '팀장 미팅' },
    { dayIndex: 1, startHour: 9, endHour: 10, reason: '주간 팀 리뷰' },
    { dayIndex: 2, startHour: 9, endHour: 12, reason: '마케팅 전략 회의' },
    { dayIndex: 2, startHour: 14, endHour: 15, reason: '내부 보고' },
    { dayIndex: 2, startHour: 15, endHour: 16, reason: '전략 회의' },
    { dayIndex: 3, startHour: 13, endHour: 14, reason: '점심 미팅' },
    { dayIndex: 3, startHour: 14, endHour: 15, reason: '외부 미팅' },
    { dayIndex: 4, startHour: 9, endHour: 10, reason: '주간 리더십 회의' },
  ]},
  { name: '박서연', events: [
    { dayIndex: 0, startHour: 13, endHour: 17, reason: '캠페인 기획 회의' },
    { dayIndex: 1, startHour: 9, endHour: 10, reason: '주간 리뷰' },
    { dayIndex: 3, startHour: 13, endHour: 14, reason: '디자인 리뷰' },
    { dayIndex: 4, startHour: 9, endHour: 11, reason: '스프린트 플래닝' },
    { dayIndex: 4, startHour: 13, endHour: 14, reason: '스프린트 회고' },
  ]},
  { name: '정민재', events: [
    { dayIndex: 0, startHour: 9, endHour: 10, reason: '광고 성과 체크' },
    { dayIndex: 1, startHour: 9, endHour: 10, reason: '주간 성과 분석' },
    { dayIndex: 1, startHour: 10, endHour: 11, reason: '캠페인 분석' },
    { dayIndex: 1, startHour: 16, endHour: 17, reason: '매체사 미팅' },
    { dayIndex: 2, startHour: 14, endHour: 16, reason: '퍼포먼스 리뷰' },
    { dayIndex: 3, startHour: 15, endHour: 16, reason: '데이터 분석' },
    { dayIndex: 4, startHour: 11, endHour: 12, reason: '보고서 작성' },
  ]},
  { name: '최유진', events: [
    { dayIndex: 0, startHour: 10, endHour: 12, reason: '콘텐츠 기획' },
    { dayIndex: 2, startHour: 9, endHour: 10, reason: '콘텐츠 기획' },
    { dayIndex: 2, startHour: 10, endHour: 12, reason: '콘텐츠 제작 회의' },
    { dayIndex: 2, startHour: 16, endHour: 17, reason: '콘텐츠 마감' },
    { dayIndex: 3, startHour: 9, endHour: 10, reason: '브랜드 회의' },
    { dayIndex: 4, startHour: 10, endHour: 11, reason: '소셜 미디어 점검' },
    { dayIndex: 4, startHour: 11, endHour: 12, reason: '주간 보고' },
  ]},
  { name: '강태오', events: [
    { dayIndex: 0, startHour: 14, endHour: 15, reason: '제휴사 미팅' },
    { dayIndex: 1, startHour: 10, endHour: 11, reason: '파트너 협의' },
    { dayIndex: 1, startHour: 16, endHour: 17, reason: '파트너사 보고' },
    { dayIndex: 2, startHour: 15, endHour: 17, reason: '외부 미팅' },
    { dayIndex: 3, startHour: 9, endHour: 10, reason: '제휴 검토' },
    { dayIndex: 3, startHour: 14, endHour: 15, reason: '파트너사 방문' },
    { dayIndex: 4, startHour: 13, endHour: 14, reason: '영업 보고' },
    { dayIndex: 4, startHour: 14, endHour: 15, reason: '클라이언트 미팅' },
  ]},
];

const days = ['13(월)', '14(화)', '15(수)', '16(목)', '17(금)'];

function computeConflictPopoverData(dayIndex, hour) {
  const dayLabel = days[dayIndex] || '';
  const timeRange = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;

  const blockedMembers = [];
  const availableMembers = [];

  memberSchedules.forEach(member => {
    const event = member.events.find(e =>
      e.dayIndex === dayIndex &&
      e.startHour < hour + 1 &&
      e.endHour > hour
    );
    if (event) {
      const eventStart = `${String(event.startHour).padStart(2, '0')}:00`;
      const eventEnd = `${String(event.endHour).padStart(2, '0')}:00`;
      blockedMembers.push({ name: member.name, reason: event.reason, time: `${eventStart} - ${eventEnd}` });
    } else {
      availableMembers.push(member.name);
    }
  });

  return {
    type: 'unavailable',
    dateLabel: dayLabel,
    timeRange: timeRange,
    statusText: '참석자 일정과 겹치는 시간이에요',
    blockedLabel: '일정이 있는 참석자',
    blockedCount: blockedMembers.length,
    blockedMembers: blockedMembers,
    availableLabel: '가능한 참석자',
    availableCount: availableMembers.length,
    availableMembers: availableMembers,
  };
}

const timelineSlots = [
  {
    dayIndex: 1,
    hour: 13,
    type: 'best',
    status: '전원 가능',
    dayName: '화',
    dayNum: 14,
    timeLabel: '13:00 - 15:00',
    candidateCount: 2,
    available: ['이도이', '김현우', '박서연', '정민재', '최유진', '강태오'],
    checkNeeded: [],
    unavailable: [],
    tooltipTitle: '화 13:00 - 15:00',
    tooltipNote: '클릭해서 회의 만들기',
  },
  {
    dayIndex: 3,
    hour: 10,
    type: 'best',
    status: '전원 가능',
    dayName: '목',
    dayNum: 16,
    timeLabel: '10:00 - 11:00',
    candidateCount: 1,
    available: ['이도이', '김현우', '박서연', '정민재', '최유진', '강태오'],
    checkNeeded: [],
    unavailable: [],
    tooltipTitle: '목 10:00 - 11:00',
    tooltipNote: '클릭해서 회의 만들기',
  },
  {
    dayIndex: 1,
    hour: 14,
    type: 'unavailable',
    status: '비추천',
    dayName: '화',
    dayNum: 14,
    timeLabel: '14:00 - 15:00',
    available: [],
    checkNeeded: [],
    unavailable: [
      { name: '정민재', reason: '매체사 미팅' },
      { name: '강태오', reason: '외근' },
    ],
    tooltipTitle: '화 14:00 - 15:00',
    tooltipNote: '필수 참석자 일부가 불가능한 시간이에요',
  },
];

function getTimelineSlot(dayIndex, hour) {
  return timelineSlots.find(s => s.dayIndex === dayIndex && s.hour === hour) || null;
}

function renderTimeline() {
  const grid = document.getElementById('timeline-grid');
  grid.innerHTML = '';

  const days = ['13(월)', '14(화)', '15(수)', '16(목)', '17(금)'];
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const emptyLabel = document.createElement('div');
  emptyLabel.className = 'timeline-hour-label';
  emptyLabel.style.gridColumn = '1';
  emptyLabel.style.gridRow = '1';
  grid.appendChild(emptyLabel);

  days.forEach((day, dayIndex) => {
    const header = document.createElement('div');
    header.className = 'timeline-day-header';
    header.textContent = day;
    header.style.gridColumn = String(dayIndex + 2);
    header.style.gridRow = '1';
    grid.appendChild(header);
  });

  const getSlotDuration = (slot) => {
    const [start, end] = slot.timeLabel.split(' - ');
    const startHour = Number(start.split(':')[0]);
    const endHour = Number(end.split(':')[0]);
    return Math.max(1, endHour - startHour);
  };

  hours.forEach((hour, hourIndex) => {
    const currentHour = hourIndex + 9;
    const gridRow = hourIndex + 2;

    const label = document.createElement('div');
    label.className = 'timeline-hour-label';
    label.textContent = hour;
    label.style.gridColumn = '1';
    label.style.gridRow = String(gridRow);
    grid.appendChild(label);

    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const cell = document.createElement('div');
      cell.className = 'timeline-cell';
      cell.dataset.day = dayIndex;
      cell.dataset.hour = currentHour;
      cell.style.gridColumn = String(dayIndex + 2);
      cell.style.gridRow = String(gridRow);

      const slot = getTimelineSlot(dayIndex, currentHour);
      const cellKey = `${dayIndex}-${currentHour}`;
      const cellPopoverId = cellPopoverMap[cellKey];

      if (cellPopoverId) {
        cell.dataset.popoverId = cellPopoverId;
        cell.classList.add('timeline-cell-unavailable');
        cell.addEventListener('mouseenter', (e) => openSchedulePopover(cellPopoverId, e.currentTarget, true));
        cell.addEventListener('mouseleave', () => {
          if (isPopoverHover) closeSchedulePopover();
        });
      } else if (slot) {
        cell.classList.add(`timeline-cell-${slot.type}`);

        if (slot.type === 'unavailable' || (dayIndex === 3 && currentHour === 13)) {
          cell.classList.add('timeline-cell-conflict-high');
        }

        cell.addEventListener('mouseenter', (e) => showTimelineTooltip(e, slot));
        cell.addEventListener('mouseleave', hideTimelineTooltip);
      } else {
        const highConflict = (currentHour === 13 && (dayIndex === 3 || dayIndex === 4))
          || (currentHour === 14 && dayIndex === 0)
          || (currentHour === 15 && dayIndex === 2);
        const lowConflict = (currentHour === 9 && dayIndex < 3)
          || (currentHour === 10 && dayIndex === 0)
          || (currentHour === 14 && (dayIndex === 2 || dayIndex === 3));

        if (highConflict) {
          cell.classList.add('timeline-cell-conflict-high');
          const conflictId = `conflict-${dayIndex}-${currentHour}`;
          cell.dataset.popoverId = conflictId;
          cell.addEventListener('mouseenter', (e) => openSchedulePopover(conflictId, e.currentTarget, true));
          cell.addEventListener('mouseleave', () => {
            if (isPopoverHover) closeSchedulePopover();
          });
        } else if (lowConflict) {
          cell.classList.add('timeline-cell-conflict-low');
          const conflictId = `conflict-${dayIndex}-${currentHour}`;
          cell.dataset.popoverId = conflictId;
          cell.addEventListener('mouseenter', (e) => openSchedulePopover(conflictId, e.currentTarget, true));
          cell.addEventListener('mouseleave', () => {
            if (isPopoverHover) closeSchedulePopover();
          });
        }
      }

      grid.appendChild(cell);
    }
  });

  timelineSlots
    .filter(slot => slot.type !== 'unavailable')
    .forEach(slot => {
      const block = document.createElement('button');
      const duration = getSlotDuration(slot);
      block.type = 'button';
      block.className = `timeline-availability-block timeline-availability-block-duration-${duration} timeline-cell-${slot.type}`;
      block.dataset.day = slot.dayIndex;
      block.dataset.hour = slot.hour;
      block.style.gridColumn = String(slot.dayIndex + 2);
      block.style.gridRow = `${slot.hour - 9 + 2} / span ${duration}`;

      block.innerHTML = `
        <span class="timeline-cell-time">${slot.timeLabel}</span>
        <span class="timeline-cell-badge">${slot.status}</span>
      `;

      const popoverId = getPopoverIdForSlot(slot.dayIndex, slot.hour);
      if (popoverId) {
        block.dataset.popoverId = popoverId;
        block.addEventListener('mouseenter', (e) => {
          if (!document.getElementById('schedule-popover').classList.contains('visible')) {
            showTimelineTooltip(e, slot);
          }
        });
        block.addEventListener('mouseleave', () => {
          if (!document.getElementById('schedule-popover').classList.contains('visible')) {
            hideTimelineTooltip();
          }
        });
        block.addEventListener('click', (e) => {
          e.stopPropagation();
          openSchedulePopover(popoverId, block);
        });
      } else {
        block.addEventListener('mouseenter', (e) => showTimelineTooltip(e, slot));
        block.addEventListener('mouseleave', hideTimelineTooltip);
        block.addEventListener('click', () => openTimelineModal(slot));
      }

      grid.appendChild(block);
    });
}

function showTimelineTooltip(event, slot) {
  const tooltip = document.getElementById('timeline-tooltip');

  let html = `<div class="timeline-tooltip-title">${slot.tooltipTitle}</div>`;

  if (slot.type === 'unavailable') {
    html += '<div class="timeline-tooltip-row"><span class="tt-label">상태</span><span>회의를 잡기 어려워요</span></div>';
  }

  if (slot.available.length > 0) {
    html += `<div class="timeline-tooltip-row"><span class="tt-label">가능</span><span>${slot.available.join(' · ')}</span></div>`;
  }

  if (slot.checkNeeded.length > 0) {
    const checkHtml = slot.checkNeeded.map(p => `${p.name} - ${p.reason}`).join('<br>');
    html += `<div class="timeline-tooltip-row"><span class="tt-label tt-label-check">확인 필요</span><span>${checkHtml}</span></div>`;
  }

  if (slot.unavailable.length > 0) {
    const unavailableHtml = slot.unavailable.map(p => `${p.name} - ${p.reason}`).join('<br>');
    html += `<div class="timeline-tooltip-row"><span class="tt-label tt-label-unavailable">불가</span><span>${unavailableHtml}</span></div>`;
  }

  const noteClass = slot.type === 'unavailable' ? 'timeline-tooltip-note timeline-tooltip-note-muted' : 'timeline-tooltip-note';
  html += `<div class="${noteClass}">${slot.tooltipNote}</div>`;

  tooltip.innerHTML = html;
  tooltip.classList.add('visible');
  tooltip.style.left = '0';
  tooltip.style.top = '0';

  const tooltipH = tooltip.offsetHeight;
  const tooltipW = 250;

  const rect = event.target.getBoundingClientRect();

  let left = rect.left + rect.width / 2 - tooltipW / 2;
  let top = rect.top - tooltipH - 8;

  if (top < 8) {
    top = rect.bottom + 8;
    if (top + tooltipH > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - tooltipH - 8);
    }
  }

  if (left < 8) left = 8;
  if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTimelineTooltip() {
  document.getElementById('timeline-tooltip').classList.remove('visible');
}

const TIMELINE_DEFAULT_TITLE = '8월 캠페인 타깃·메시지 리서치 공유 및 방향 결정 회의';

function getMemberStatus(slot, name) {
  if (slot.available.includes(name)) return { className: 'slot-available', text: '가능' };
  if (slot.checkNeeded.some(p => p.name === name)) return { className: 'slot-check', text: '확인 필요' };
  if (slot.unavailable.some(p => p.name === name)) return { className: 'slot-unavailable', text: '불가' };
  return null;
}

function buildStatusHtml(slot, requiredMembers, optionalMembers) {
  const reqAvailable = requiredMembers.filter(n => slot.available.includes(n));
  const reqCheck = requiredMembers.filter(n => slot.checkNeeded.some(c => c.name === n));
  const reqUnavailable = requiredMembers.filter(n => slot.unavailable.some(u => u.name === n));
  const optAvailable = optionalMembers.filter(n => slot.available.includes(n));

  let lines = '';

  if (requiredMembers.length > 0) {
    if (reqCheck.length === 0 && reqUnavailable.length === 0) {
      lines += `<span>필수 참석자 <strong class="highlight">${requiredMembers.length}명 모두 가능</strong></span>`;
    } else {
      lines += `<span>필수 참석자 <strong class="highlight">${reqAvailable.length}/${requiredMembers.length}명 가능</strong></span>`;
    }
  }

  if (optionalMembers.length > 0) {
    lines += `<span>선택 참석자 <strong class="highlight">${optAvailable.length}/${optionalMembers.length}명 가능</strong></span>`;
  }

  slot.checkNeeded.forEach(c => {
    lines += `<span class="text-warning">${c.name}님은 확인이 필요해요</span>`;
  });

  slot.unavailable.forEach(u => {
    lines += `<span class="text-danger">${u.name}님은 ${u.reason}으로 참석이 어려워요</span>`;
  });

  return lines;
}

function updateTimelineModalStatus(slot) {
  const container = document.getElementById('timeline-modal-status');
  if (!container) return;

  const requiredMembers = [];
  const optionalMembers = [];
  document.querySelectorAll('.timeline-modal-member').forEach(el => {
    const name = el.dataset.member;
    const group = el.querySelector('.role-toggle-group');
    const isRequired = group.dataset.required === 'true';
    if (isRequired) requiredMembers.push(name);
    else optionalMembers.push(name);
  });

  container.innerHTML = `
    <div class="timeline-modal-status-header">
      <span class="timeline-modal-status-badge ${slot.type}">${slot.status}</span>
    </div>
    <div class="timeline-modal-status-details">
      ${buildStatusHtml(slot, requiredMembers, optionalMembers)}
    </div>
  `;
}

function buildQuickSlotDesc(slot) {
  return '선택한 참석자 모두 참석 가능한 시간이에요.';
}

function renderQuickSlots() {
  const container = document.getElementById('quick-slot-cards');
  if (!container) return;

  const quickSlots = timelineSlots.filter(s => s.type !== 'unavailable');

  container.innerHTML = quickSlots.map(slot => `
    <button type="button" class="quick-slot-card quick-slot-${slot.type}" data-day-index="${slot.dayIndex}" data-hour="${slot.hour}">
      <span class="quick-slot-badge quick-slot-badge-${slot.type}">${slot.status}</span>
      <strong class="quick-slot-time">${slot.dayNum}(${slot.dayName}) ${slot.timeLabel}</strong>
      <span class="quick-slot-desc">${buildQuickSlotDesc(slot)}</span>
      <span class="quick-slot-count">1시간 회의 후보 ${slot.candidateCount || 1}개가 있어요.</span>
      <span class="quick-slot-cta">이 구간에서 회의 만들기</span>
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.quick-slot-card');
    if (!card) return;
    const slot = getTimelineSlot(Number(card.dataset.dayIndex), Number(card.dataset.hour));
    if (slot) openTimelineModal(slot);
  });
}

function openTimelineModal(slot) {
  const backdrop = document.getElementById('timeline-modal-backdrop');
  const modal = document.getElementById('timeline-modal');
  const body = document.getElementById('timeline-modal-body');
  const confirmBtn = document.getElementById('timeline-modal-confirm');

  const dateStr = `2026.07.${String(slot.dayNum).padStart(2, '0')} (${slot.dayName}) ${slot.timeLabel}`;

  const initialRequired = [];
  const initialOptional = [];
  teamMembers.forEach(m => {
    if (m.required) initialRequired.push(m.name);
    else initialOptional.push(m.name);
  });

  let membersHtml = teamMembers.map(m => {
    const isRequired = m.required;
    const status = getMemberStatus(slot, m.name);
    const coreMembers = ['이도이', '김현우', '박서연'];
    return `<div class="timeline-modal-member" data-member="${m.name}">
      <span class="member-name">${m.name}</span>
      ${coreMembers.includes(m.name) ? '<span class="member-core-badge">기본 필수</span>' : ''}
      <span class="member-role">${m.role}</span>
      <div class="role-toggle-group" data-required="${isRequired}">
        <button type="button" class="role-toggle-btn${isRequired ? ' role-toggle-active' : ''}" data-role="required">필수</button>
        <button type="button" class="role-toggle-btn${!isRequired ? ' role-toggle-active' : ''}" data-role="optional">선택</button>
      </div>
      ${status ? `<span class="member-slot-status ${status.className}">${status.text}</span>` : ''}
    </div>`;
  }).join('');

  const initialStatusHtml = buildStatusHtml(slot, initialRequired, initialOptional);

  body.innerHTML = `
    <div class="timeline-modal-info">
      <div class="timeline-modal-info-row">
        <span>선택 시간</span>
        <strong>${dateStr}</strong>
      </div>
    </div>
    <div class="timeline-modal-input-group">
      <label class="timeline-modal-label" for="timeline-modal-title-input">회의명</label>
      <input type="text" class="timeline-modal-input" id="timeline-modal-title-input" value="${TIMELINE_DEFAULT_TITLE}" />
    </div>
    <p class="timeline-modal-desc">이도이가 조사한 고객 반응과 경쟁사 캠페인 분석을 바탕으로, 8월 캠페인의 핵심 타깃과 메시지 방향을 결정하는 회의예요.</p>
    <div class="timeline-modal-status" id="timeline-modal-status">
      <div class="timeline-modal-status-header">
        <span class="timeline-modal-status-badge ${slot.type}">${slot.status}</span>
      </div>
      <div class="timeline-modal-status-details">
        ${initialStatusHtml}
      </div>
    </div>
    <div class="timeline-modal-members-section">
      <div class="timeline-modal-members-title">참석자 조건 설정</div>
      <div class="timeline-modal-members" id="timeline-modal-members">
        ${membersHtml}
      </div>
    </div>
  `;

  confirmBtn.textContent = slot.type === 'best' ? '회의 요청 보내기' : '확인 요청 보내기';

  body.querySelectorAll('.role-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const group = this.closest('.role-toggle-group');
      group.querySelectorAll('.role-toggle-btn').forEach(b => b.classList.remove('role-toggle-active'));
      this.classList.add('role-toggle-active');
      group.dataset.required = this.dataset.role === 'required' ? 'true' : 'false';
      updateTimelineModalStatus(slot);
    });
  });

  modal.dataset.slotDayIndex = slot.dayIndex;
  modal.dataset.slotHour = slot.hour;

  backdrop.hidden = false;
  modal.hidden = false;
  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    modal.classList.add('visible');
    document.body.classList.add('timeline-modal-open');
  });

  setTimeout(() => document.getElementById('timeline-modal-title-input')?.focus(), 120);
}

function closeTimelineModal() {
  const backdrop = document.getElementById('timeline-modal-backdrop');
  const modal = document.getElementById('timeline-modal');

  backdrop.classList.remove('visible');
  modal.classList.remove('visible');
  document.body.classList.remove('timeline-modal-open');

  setTimeout(() => {
    backdrop.hidden = true;
    modal.hidden = true;
  }, 200);
}

function saveQuickMeetingDraft(slot, title, participants) {
  const [startTime, endTime] = slot.timeLabel.split(' - ');
  const draft = {
    title,
    date: `2026.07.${String(slot.dayNum).padStart(2, '0')}`,
    day: slot.dayName,
    startTime,
    endTime,
    source: 'timeline',
    participants: participants.map(p => ({
      name: p.name,
      role: p.role,
      required: p.required,
    })),
  };
  sessionStorage.setItem('quickMeetingDraft', JSON.stringify(draft));
}

function saveTimelinePendingMeeting(data) {
  const existing = JSON.parse(sessionStorage.getItem('timelinePendingMeetings') || '[]');
  existing.unshift(data);
  sessionStorage.setItem('timelinePendingMeetings', JSON.stringify(existing));
}

function createTimelinePendingCard(meeting) {
  const article = document.createElement('article');
  article.className = 'wide-card timeline-pending-card';

  const pendingCount = meeting.participants.filter(p => p.response === '미응답').length;
  const checkCount = meeting.participants.filter(p => p.response === '확인 필요').length;
  const declinedCount = meeting.participants.filter(p => p.response === '참석 불가').length;

  let primaryBadgeHtml;
  let secondaryInfo = '';

  if (meeting.meetingStatus === '가장 추천') {
    primaryBadgeHtml = '<span class="badge badge-blue">가장 추천</span>';
    secondaryInfo = `<span class="card-response-count">미응답 ${pendingCount}명</span>`;
  } else if (meeting.meetingStatus === '확인 필요') {
    primaryBadgeHtml = '<span class="badge badge-yellow">확인 필요</span>';
    if (declinedCount > 0) {
      secondaryInfo = `<span class="card-response-count">참석 불가 ${declinedCount}명</span>`;
    } else {
      secondaryInfo = `<span class="card-response-count">미응답 ${pendingCount}명</span>`;
    }
  } else {
    if (declinedCount > 0) {
      primaryBadgeHtml = `<span class="badge badge-red">참석 불가 ${declinedCount}명</span>`;
    } else {
      primaryBadgeHtml = `<span class="badge badge-yellow">미응답 ${pendingCount}명</span>`;
    }
  }

  article.innerHTML = `
    <div class="card-main-row">
      ${primaryBadgeHtml}
      ${secondaryInfo}
      <span class="badge badge-gray card-source-badge">빠른 회의</span>
    </div>
    <h4 class="card-title">${meeting.title}</h4>
    <p class="card-support">${meeting.date} (${meeting.day}) ${meeting.startTime} - ${meeting.endTime}</p>
    <div class="response-status-list" aria-label="참석자 응답 상태">
      <p class="response-list-title">참석자 응답 상태</p>
      ${meeting.participants.map(p => {
        let pillClass = 'response-pending';
        let pillText = '미응답';
        if (p.response === '확인 필요') {
          pillClass = 'response-pending';
          pillText = '확인 필요';
        } else if (p.response === '참석 불가') {
          pillClass = 'response-declined';
          pillText = '참석 불가';
        }
        return `<div class="response-row">
          <span>${p.name}</span>
          <strong class="response-pill ${pillClass}">${pillText}</strong>
        </div>`;
      }).join('')}
    </div>
    <button class="btn-secondary" data-toast="${meeting.meetingStatus === '가장 추천' ? '미응답자에게 알림을 보냈어요.' : '확인 필요한 참석자에게 요청을 보냈어요.'}">
      ${meeting.meetingStatus === '가장 추천' ? '미응답자에게 알림 보내기' : '확인 필요한 참석자에게 요청 보내기'}
    </button>
  `;

  article.querySelector('.btn-secondary').addEventListener('click', function () {
    showToast(this.dataset.toast);
  });

  return article;
}

function renderTimelinePendingMeetings() {
  const data = sessionStorage.getItem('timelinePendingMeetings');
  if (!data) return;

  const meetings = JSON.parse(data);
  const list = document.querySelector('.two-column .content-section:nth-child(2) .request-list');
  if (!list) return;

  list.querySelectorAll('.timeline-pending-card').forEach(el => el.remove());

  meetings.slice().reverse().forEach(meeting => {
    const card = createTimelinePendingCard(meeting);
    list.prepend(card);
  });
}

function initTimeline() {
  renderTimeline();
  renderQuickSlots();
  renderTimelinePendingMeetings();
  bindSchedulePopoverEvents();

  document.getElementById('timeline-modal-close').addEventListener('click', closeTimelineModal);
  document.getElementById('timeline-modal-cancel').addEventListener('click', closeTimelineModal);
  document.getElementById('timeline-modal-backdrop').addEventListener('click', closeTimelineModal);
  document.getElementById('timeline-modal-confirm').addEventListener('click', () => {
    const modal = document.getElementById('timeline-modal');
    const dayIndex = Number(modal.dataset.slotDayIndex);
    const hour = Number(modal.dataset.slotHour);
    const slot = getTimelineSlot(dayIndex, hour);
    if (!slot) return;

    const title = document.getElementById('timeline-modal-title-input').value.trim() || TIMELINE_DEFAULT_TITLE;

    const participants = [];
    document.querySelectorAll('.timeline-modal-member').forEach(el => {
      const name = el.dataset.member;
      const group = el.querySelector('.role-toggle-group');
      const required = group.dataset.required === 'true';
      const member = teamMembers.find(m => m.name === name);
      participants.push({
        name,
        role: member ? member.role : '',
        required,
      });
    });

    const meetingParticipants = participants.map(p => {
      const isCheck = slot.checkNeeded.some(c => c.name === p.name);
      const isUnavailable = slot.unavailable.some(u => u.name === p.name);
      let response = '미응답';
      if (isCheck) response = '확인 필요';
      if (isUnavailable) response = '참석 불가';
      return { ...p, response };
    });

    const meetingData = {
      id: 'timeline-' + Date.now(),
      title,
      date: `2026.07.${String(slot.dayNum).padStart(2, '0')}`,
      day: slot.dayName,
      startTime: slot.timeLabel.split(' - ')[0],
      endTime: slot.timeLabel.split(' - ')[1],
      source: 'timeline',
      status: 'pending',
      statusLabel: '미응답 ' + meetingParticipants.filter(p => p.response === '미응답').length + '명',
      meetingStatus: slot.status,
      participants: meetingParticipants,
    };

    saveQuickMeetingDraft(slot, title, participants);
    saveTimelinePendingMeeting(meetingData);

    const list = document.querySelector('.two-column .content-section:nth-child(2) .request-list');
    if (list) {
      list.prepend(createTimelinePendingCard(meetingData));
    }

    closeTimelineModal();
    showToast('회의 요청을 보냈어요.');
  });

  document.querySelectorAll('.timeline-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('주간 이동 기능은 다음 단계에서 연결할 예정이에요.');
    });
  });

  document.querySelectorAll('.timeline-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('주간 이동 기능은 다음 단계에서 연결할 예정이에요.');
    });
  });

  document.querySelector('.timeline-select')?.addEventListener('change', () => {
    showToast('팀원 필터 기능은 다음 단계에서 연결할 예정이에요.');
  });
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function getInclusiveDayCount(start, end) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(end) - parseDate(start)) / dayMs) + 1;
}

function renderCalendar() {
  const calendarGrid = document.getElementById('drawer-calendar-grid');
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const gridStartDate = new Date(calendarYear, calendarMonth, 1 - firstDayOfMonth.getDay());

  calendarGrid.innerHTML = '';

  for (let index = 0; index < 35; index += 1) {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);

    const dayButton = document.createElement('button');
    dayButton.type = 'button';
    dayButton.className = 'calendar-day';
    dayButton.dataset.date = formatCalendarDate(date);
    dayButton.textContent = String(date.getDate());
    dayButton.setAttribute('aria-label', `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 선택`);

    if (date.getMonth() !== calendarMonth) {
      dayButton.classList.add('calendar-muted');
      dayButton.disabled = true;
    }

    calendarGrid.appendChild(dayButton);
  }
}

function renderCalendarRange() {
  const rangeSpan = document.getElementById('selected-date-range');
  document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
    day.classList.remove('calendar-range', 'calendar-range-start', 'calendar-range-end');
  });

  if (!startDate) {
    rangeSpan.textContent = '선택된 기간: 아직 선택되지 않았어요.';
    return;
  }

  if (!endDate) {
    rangeSpan.textContent = `선택된 기간: ${startDate} - 종료일을 선택해주세요.`;
  } else {
    rangeSpan.textContent = `선택된 기간: ${startDate} - ${endDate}`;
  }

  document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
    const date = day.dataset.date;
    if (endDate) {
      if (date >= startDate && date <= endDate) {
        day.classList.add('calendar-range');
      }
      if (date === startDate) {
        day.classList.add('calendar-range-start');
      }
      if (date === endDate) {
        day.classList.add('calendar-range-end');
      }
    } else {
      if (date === startDate) {
        day.classList.add('calendar-range', 'calendar-range-start');
      }
    }
  });
}

function setCalendarRange(start, end) {
  startDate = start;
  endDate = end;
  renderCalendarRange();
}

function selectCalendarDate(date) {
  if (!startDate) {
    setCalendarRange(date, null);
    return;
  }

  if (startDate && !endDate) {
    if (date === startDate) {
      setCalendarRange(null, null);
      return;
    }
    if (date < startDate) {
      setCalendarRange(date, null);
      return;
    }
    const dayCount = getInclusiveDayCount(startDate, date);
    if (dayCount > 7) {
      showToast('회의 후보 탐색 기간은 최대 1주일까지만 설정할 수 있어요.');
      return;
    }
    setCalendarRange(startDate, date);
    return;
  }

  if (startDate && endDate) {
    if (date >= startDate && date <= endDate) {
      setCalendarRange(null, null);
      return;
    }
    setCalendarRange(date, null);
  }
}

function setDuration(value, showCustom = false) {
  selectedDuration = Math.max(15, Math.min(180, value));
  document.getElementById('selected-duration').textContent = `선택된 길이: ${selectedDuration}분`;
  document.getElementById('custom-duration-value').textContent = `${selectedDuration}분`;
  document.getElementById('duration-custom').hidden = !showCustom;
}

function setDurationOption(option) {
  document.querySelectorAll('.duration-option').forEach(btn => {
    btn.classList.toggle('duration-active', btn.dataset.duration === option);
  });

  if (option === 'custom') {
    setDuration(selectedDuration, true);
    return;
  }

  setDuration(Number(option), false);
}

function initNav() {
  document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'dashboard':
          window.location.href = 'index.html';
          break;
        case 'calendar':
          showToast('캘린더 화면은 다음 단계에서 연결할 예정이에요.');
          break;
        case 'meeting':
          window.location.href = 'meetings.html';
          break;
        case 'message':
          showToast('메시지 화면은 다음 단계에서 연결할 예정이에요.');
          break;
        case 'mail':
          showToast('메일 화면은 다음 단계에서 연결할 예정이에요.');
          break;
        case 'address':
          showToast('주소록 화면은 다음 단계에서 연결할 예정이에요.');
          break;
        default:
          showToast('해당 기능은 준비 중이에요.');
      }
    });
  });
}

function init() {
  initNav();

  document.querySelectorAll('.btn-new-meeting').forEach(btn => {
    btn.addEventListener('click', openMeetingDrawer);
  });

  document.getElementById('meeting-drawer-close').addEventListener('click', closeMeetingDrawer);
  document.getElementById('meeting-drawer-cancel').addEventListener('click', closeMeetingDrawer);
  document.getElementById('meeting-drawer-backdrop').addEventListener('click', closeMeetingDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (document.getElementById('schedule-popover').classList.contains('visible')) {
        closeSchedulePopover();
        return;
      }
      if (document.getElementById('timeline-modal').classList.contains('visible')) {
        closeTimelineModal();
        return;
      }
      if (document.body.classList.contains('detail-drawer-open')) {
        closeDetailDrawer();
        return;
      }
      if (document.body.classList.contains('drawer-open')) {
        closeMeetingDrawer();
      }
    }
  });

  document.getElementById('detail-drawer-close').addEventListener('click', closeDetailDrawer);
  document.getElementById('detail-drawer-close-btn').addEventListener('click', closeDetailDrawer);
  document.getElementById('detail-drawer-backdrop').addEventListener('click', closeDetailDrawer);
  document.getElementById('detail-drawer-calendar-btn').addEventListener('click', () => {
    showToast('캘린더에서 보기 기능은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('confirmed-static-detail-btn')?.addEventListener('click', openStaticConfirmedDetail);

  renderCalendar();
  document.getElementById('drawer-calendar-grid').addEventListener('click', event => {
    const dayButton = event.target.closest('.calendar-day[data-date]');
    if (!dayButton || dayButton.disabled) {
      return;
    }

    selectCalendarDate(dayButton.dataset.date);
  });

  document.querySelectorAll('.duration-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setDurationOption(btn.dataset.duration);
    });
  });

  document.getElementById('duration-minus').addEventListener('click', () => {
    setDuration(selectedDuration - 15, true);
  });

  document.getElementById('duration-plus').addEventListener('click', () => {
    setDuration(selectedDuration + 15, true);
  });

  document.querySelectorAll('.participant-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.participant;
      if (selectedParticipants.has(name)) {
        return;
      }
      selectedParticipants.add(name);
      participantRole.set(name, 'required');
      participantReason.set(name, chip.querySelector('.participant-reason')?.textContent || name);
      chip.classList.add('chip-selected');
      renderSelectedParticipants();
    });
  });

  const participantInput = document.getElementById('participant-input');
  let isParticipantComposing = false;

  participantInput.addEventListener('compositionstart', () => {
    isParticipantComposing = true;
  });

  participantInput.addEventListener('compositionend', () => {
    isParticipantComposing = false;
  });

  participantInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (event.isComposing || isParticipantComposing) return;
    event.preventDefault();

    const name = participantInput.value.trim();
    if (!name) return;

    if (selectedParticipants.has(name)) {
      showToast('이미 추가된 참석자예요.');
      return;
    }

    selectedParticipants.add(name);
    participantRole.set(name, 'required');
    participantReason.set(name, '직접 추가');
    renderSelectedParticipants();
    participantInput.value = '';
  });

  document.querySelectorAll('[data-toast]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(btn.dataset.toast);
    });
  });

  document.getElementById('drawer-next-step').addEventListener('click', () => {
    if (!validateStep1()) return;
    goToStep(2);
  });

  document.getElementById('drawer-prev-step').addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  document.getElementById('drawer-submit').addEventListener('click', () => {
    if (!validateStep2()) return;
    goToStep(3);
  });

  document.getElementById('role-card-list').addEventListener('click', (event) => {
    const option = event.target.closest('.role-option');
    if (!option) return;

    const card = option.closest('.role-card');
    if (!card) return;

    const name = card.dataset.participant;
    const newRole = option.dataset.role;

    card.querySelectorAll('.role-option').forEach(btn => {
      btn.classList.toggle('role-option-active', btn.dataset.role === newRole);
    });

    participantRole.set(name, newRole);
    updateRoleSummary();
  });

  document.getElementById('drawer-confirm-step').addEventListener('click', () => {
    if (!selectedCandidateId) {
      showToast('확정할 후보 시간을 선택해주세요.');
      return;
    }

    const card = document.querySelector(`.drawer-candidate-card[data-candidate-id="${selectedCandidateId}"]`);
    const badgeEl = card?.querySelector('.badge');
    const isCheckRequired = badgeEl && badgeEl.textContent === '확인 필요';

    if (isCheckRequired) {
      showToast('필수 참석자에게 확인 요청을 보냈어요.');
      return;
    }

    const title = document.getElementById('meeting-title-input').value.trim();
    const candidate = getCandidateData(selectedCandidateId);
    const candidateLabel = badgeEl ? badgeEl.textContent : '';

    const requiredParticipants = [];
    const optionalParticipants = [];
    selectedParticipants.forEach(name => {
      if ((participantRole.get(name) || 'required') === 'required') {
        requiredParticipants.push(name);
      } else {
        optionalParticipants.push(name);
      }
    });

    sessionStorage.setItem('selectedTime', JSON.stringify(candidate));

    const confirmedMeeting = {
      title,
      date: candidate.date,
      dayOfWeek: candidate.dayOfWeek,
      timeRange: candidate.timeRange,
      duration: candidate.duration,
      requiredParticipants,
      optionalParticipants,
      candidateLabel,
    };

    const existing = JSON.parse(sessionStorage.getItem('confirmedMeetings') || '[]');
    existing.unshift(confirmedMeeting);
    sessionStorage.setItem('confirmedMeetings', JSON.stringify(existing));

    renderConfirmedMeetings();
    showToast('회의 시간이 확정됐어요.');
    closeMeetingDrawer();
  });

  document.getElementById('drawer-candidate-list').addEventListener('click', (event) => {
    const card = event.target.closest('.drawer-candidate-card');
    if (!card) return;

    const id = card.dataset.candidateId;
    if (selectedCandidateId === id) return;

    document.querySelectorAll('.drawer-candidate-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCandidateId = id;

    const badge = card.querySelector('.badge');
    const confirmBtn = document.getElementById('drawer-confirm-step');
    confirmBtn.textContent = badge && badge.textContent === '확인 필요'
      ? '확인 요청 후 확정하기'
      : '선택한 시간으로 확정하기';
  });

  document.getElementById('notif-btn').addEventListener('click', () => {
    showToast('알림 기능은 준비 중이에요.');
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    showToast('설정 기능은 준비 중이에요.');
  });

  document.getElementById('sidebar-more-btn').addEventListener('click', () => {
    showToast('더보기 메뉴는 다음 단계에서 연결할 예정이에요.');
  });

  resetSelectedParticipants();
  renderCalendarRange();
  setDurationOption('60');
  renderConfirmedMeetings();
  initTimeline();
}

document.addEventListener('DOMContentLoaded', init);
