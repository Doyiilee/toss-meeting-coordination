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

function renderRecommendedParticipants() {
  const container = document.querySelector('.recommended-chips');
  if (!container) return;
  container.innerHTML = '';
  teamMembers.forEach(member => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'participant-chip';
    chip.dataset.participant = member.name;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'participant-name';
    nameSpan.textContent = member.name;
    const reasonSpan = document.createElement('span');
    reasonSpan.className = 'participant-reason';
    reasonSpan.textContent = member.role;
    chip.appendChild(nameSpan);
    chip.appendChild(reasonSpan);
    container.appendChild(chip);
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

function getDateStrFromDayIndex(baseDate, dayIndex) {
  const baseDay = parseDate(baseDate).getDate();
  return addDays(baseDate, dayIndex - (baseDay - 13));
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

  const baseDate = startDate || defaultStartDate;

  const candidateStates = meetingCandidates.map(c => ({
    candidate: c,
    summary: getCandidateParticipantSummary(c),
  }));
  candidateStates.forEach(s => {
    s.displayState = getCandidateDisplayState(s.candidate, s.summary);
  });

  const displayAvailable = candidateStates.filter(s => s.displayState === 'available');

  candidateStates.forEach(({candidate, summary, displayState}) => {
    const dateStr = getDateStrFromDayIndex(baseDate, candidate.dayIndex);
    const dayOfWeek = getDayOfWeek(dateStr);
    const timeStr = `${formatHour(candidate.startTime)} - ${formatHour(candidate.endTime)}`;
    const selected = selectedCandidateId === candidate.id;

    const isAvailable = displayState === 'available';
    const isFirstAvailable = isAvailable && displayAvailable.length > 0 && displayAvailable[0].candidate === candidate;

    let badge, badgeClass, statusText, statusClass;
    let requiredNum, requiredDen, optionalNum, optionalDen, needCheck, desc;

    if (displayState === 'check-required') {
      badge = '확인 필요';
      badgeClass = 'badge-yellow';
      statusText = '확인 후 확정';
      statusClass = 'yellow';

      requiredNum = summary.requiredAvailableCount;
      requiredDen = summary.requiredTotal;
      optionalNum = summary.optionalAvailableCount;
      optionalDen = summary.optionalTotal;

      if (summary.hasRequiredCheck) {
        const firstId = summary.requiredCheckRequired[0];
        const firstName = getTeamMemberName(firstId);
        needCheck = `필수 참석자 ${summary.requiredCheckRequiredCount}명`;
        desc = `${firstName}님의 확인이 필요해 바로 확정할 수 없어요.`;
      } else if (summary.hasOptionalCheck) {
        needCheck = `선택 참석자 ${summary.optionalCheckRequiredCount}명`;
        desc = '선택 참석자 중 확인이 필요해 바로 확정할 수 없어요.';
      } else {
        needCheck = '일정 확인 필요';
        desc = '일부 참석자의 일정 확인이 필요해요.';
      }
    } else if (isFirstAvailable) {
      badge = '가장 추천';
      badgeClass = 'badge-blue';
      statusText = '확정 가능';
      statusClass = 'green';

      requiredNum = summary.requiredAvailableCount;
      requiredDen = summary.requiredTotal;
      optionalNum = summary.optionalAvailableCount;
      optionalDen = summary.optionalTotal;
      needCheck = '없음';
      desc = '필수 참석자가 모두 가능해 바로 확정할 수 있어요.';
    } else {
      badge = '대안';
      badgeClass = 'badge-green';
      statusText = '확정 가능';
      statusClass = 'green';

      requiredNum = summary.requiredAvailableCount;
      requiredDen = summary.requiredTotal;
      optionalNum = summary.optionalAvailableCount;
      optionalDen = summary.optionalTotal;
      needCheck = '없음';
      desc = '모든 참석자가 가능한 안정적인 후보예요.';
    }

    let optionalText;
    if (summary.optionalTotal > 0) {
      if (summary.optionalCheckRequiredCount > 0 && summary.optionalAvailableCount === 0) {
        optionalText = `${summary.optionalCheckRequiredCount}명 확인 필요`;
      } else {
        optionalText = `${optionalNum}/${optionalDen} 가능`;
      }
    } else {
      optionalText = '선택 참석자 없음';
    }

    const card = document.createElement('div');
    card.className = `drawer-candidate-card${selected ? ' selected' : ''}`;
    card.dataset.candidateId = candidate.id;
    card.dataset.date = dateStr;
    card.dataset.dayOfWeek = dayOfWeek;
    card.dataset.timeRange = timeStr;
    card.dataset.requiresCheck = displayState === 'check-required' ? 'true' : 'false';

    card.innerHTML = `
      <div class="drawer-candidate-head">
        <span class="badge ${badgeClass}">${badge}</span>
        ${selected ? '<span class="drawer-candidate-selected-mark">선택됨</span>' : ''}
      </div>
      <h4 class="drawer-candidate-time">${dateStr} (${dayOfWeek})<br />${timeStr}</h4>
      <div class="drawer-candidate-metrics">
        <div class="drawer-candidate-metric drawer-candidate-metric-required">
          <span>필수 참석자</span>
          <strong>${requiredNum}/${requiredDen} 가능</strong>
        </div>
        <div class="drawer-candidate-metric drawer-candidate-metric-optional">
          <span>선택 참석자</span>
          <strong>${optionalText}</strong>
        </div>
        <div class="drawer-candidate-metric">
          <span>확인 필요</span>
          <strong>${needCheck}</strong>
        </div>
      </div>
      <span class="candidate-status-pill ${statusClass}">${statusText}</span>
      <p class="candidate-status-desc">${desc}</p>
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

let schedulePopoverData = [
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
  const track = timelineSlots.find(s => s.dayIndex === dayIndex && s.hour === hour);
  if (!track || !track.candidateId) return null;
  const candidate = getCandidateById(track.candidateId);
  if (!candidate) return null;
  return getCandidatePopoverId(candidate);
}

function renderSchedulePopoverTitle(data, showClose) {
  let html = '<div class="schedule-popover-header-section">';
  html += '<div class="schedule-popover-title-row">';
  html += `<strong class="schedule-popover-title">${data.dateLabel} ${data.timeRange}</strong>`;
  if (showClose) {
    html += '<button type="button" class="schedule-popover-close" aria-label="닫기">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +
      '<path d="M18 6L6 18" stroke="#171A1F" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M6 6L18 18" stroke="#171A1F" stroke-width="2" stroke-linecap="round"/>' +
      '</svg></button>';
  }
  html += '</div>';
  html += `<p class="schedule-popover-status schedule-popover-status--${data.type}">${data.statusText}</p>`;
  html += '</div>';
  return html;
}

function renderScheduleAvailableSection(data) {
  let html = '<div class="schedule-popover-section">';
  html += '<div class="schedule-popover-section-header">';
  html += `<span>${data.availableLabel}</span>`;
  html += `<span class="schedule-popover-count"><strong class="schedule-popover-count-num schedule-popover-count-num--blue">${data.availableCount}</strong><span class="schedule-popover-count-label">명</span></span>`;
  html += '</div>';
  html += `<p class="schedule-popover-member-list">${data.availableMembers.join(' · ')}</p>`;
  html += '</div>';
  return html;
}

function renderUnavailableSchedulePopover(data) {
  let html = renderSchedulePopoverTitle(data, false);
  html += '<div class="schedule-popover-section">';
  html += '<div class="schedule-popover-section-header">';
  html += `<span>${data.blockedLabel}</span>`;
  html += `<span class="schedule-popover-count"><strong class="schedule-popover-count-num schedule-popover-count-num--red">${data.blockedCount}</strong><span class="schedule-popover-count-label">명</span></span>`;
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
  html += renderScheduleAvailableSection(data);
  return html;
}

function renderAvailableSchedulePopover(data) {
  let html = renderSchedulePopoverTitle(data, true);
  html += renderScheduleAvailableSection(data);

  if (data.meetingHint) {
    html += `<p class="schedule-popover-hint">${data.meetingHint}</p>`;
  }

  html += `<button type="button" class="schedule-popover-cta schedule-popover-cta--primary">${data.ctaLabel}</button>`;

  return html;
}

function renderCheckRequiredSchedulePopover(data) {
  let html = renderSchedulePopoverTitle(data, true);
  html += '<div class="schedule-popover-section">';
  html += '<div class="schedule-popover-section-header">';
  html += `<span>${data.blockedLabel}</span>`;
  html += `<span class="schedule-popover-count"><strong class="schedule-popover-count-num schedule-popover-count-num--orange">${data.blockedCount}</strong><span class="schedule-popover-count-label">명</span></span>`;
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
  html += renderScheduleAvailableSection(data);
  html += '<div class="schedule-popover-actions">';
  html += '<button type="button" class="schedule-popover-cta schedule-popover-cta--secondary" data-popover-action="request-check">확인 요청 보내기</button>';
  html += '<button type="button" class="schedule-popover-cta schedule-popover-cta--primary" data-popover-action="create-meeting">회의 만들기</button>';
  html += '</div>';
  return html;
}

function renderSchedulePopover(data) {
  if (data.type === 'unavailable') return renderUnavailableSchedulePopover(data);
  if (data.type === 'available') return renderAvailableSchedulePopover(data);
  if (data.type === 'check-required') return renderCheckRequiredSchedulePopover(data);
  return '';
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
  if (isHover && currentPopoverId && !isPopoverHover) return;
  closeSchedulePopover();
  hideTimelineTooltip();
  const data = getSchedulePopoverData(id);
  if (!data) return;

  const el = document.getElementById('schedule-popover');
  el.innerHTML = renderSchedulePopover(data);
  const typeClass = data.type === 'available'
    ? `schedule-popover--available-${data.isRange ? 'range' : 'one-hour'}`
    : `schedule-popover--${data.type}`;
  el.className = `schedule-popover schedule-popover--${data.type} ${typeClass}`;
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
  const action = ctaEl.dataset.popoverAction || 'create-meeting';

  closeSchedulePopover();

  if (action === 'request-check') {
    showToast('확인 요청을 보냈어요.');
    return;
  }

  if (data.type === 'available' || data.type === 'check-required') {
    const candidateId = data.candidateId;
    if (candidateId) {
      const candidate = getCandidateById(candidateId);
      if (candidate) {
        const slot = getTimelineSlot(candidate.dayIndex, candidate.startTime);
        if (slot) openTimelineModal(slot);
      }
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

function closeTeamFreeTimeDropdown() {
  const trigger = document.getElementById('team-free-time-trigger');
  const dropdown = document.getElementById('team-free-time-dropdown');
  if (!trigger || !dropdown) return;

  dropdown.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
}

function toggleTeamFreeTimeDropdown() {
  const trigger = document.getElementById('team-free-time-trigger');
  const dropdown = document.getElementById('team-free-time-dropdown');
  if (!trigger || !dropdown) return;

  const willOpen = dropdown.hidden;
  dropdown.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
}

function bindTeamFreeTimeDropdown() {
  const trigger = document.getElementById('team-free-time-trigger');
  const dropdown = document.getElementById('team-free-time-dropdown');
  const applyButton = document.getElementById('team-free-time-apply');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleTeamFreeTimeDropdown();
  });

  dropdown.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  applyButton?.addEventListener('click', () => {
    closeTeamFreeTimeDropdown();
  });

  document.addEventListener('click', () => {
    if (!dropdown.hidden) closeTeamFreeTimeDropdown();
  });
}

const cellPopoverMap = {};

const teamMembers = [
  { id: 'ddoyi', name: '이도이', role: '주니어 브랜드 마케터', department: '마케팅팀', required: true },
  { id: 'hyunwoo', name: '김현우', role: '마케팅팀 팀장', department: '마케팅팀', required: true },
  { id: 'seoyeon', name: '박서연', role: '캠페인 PM', department: '캠페인팀', required: true },
  { id: 'minjae', name: '정민재', role: '퍼포먼스 마케터', department: '퍼포먼스팀', required: true },
  { id: 'yujin', name: '최유진', role: '콘텐츠 마케터', department: '콘텐츠팀', required: false },
  { id: 'taeoh', name: '강태오', role: '제휴/영업 마케터', department: '제휴팀', required: false },
];

const memberSchedules = [
  { memberId: 'ddoyi', dayIndex: 0, dayLabel: '13(월)', startTime: 9, endTime: 12, title: '개인 업무', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 0, dayLabel: '13(월)', startTime: 13, endTime: 16, title: '프로젝트 준비', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 2, dayLabel: '15(수)', startTime: 9, endTime: 11, title: '데일리 스크럼', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 3, dayLabel: '16(목)', startTime: 13, endTime: 16, title: '프로젝트 회의', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 4, dayLabel: '17(금)', startTime: 9, endTime: 10, title: '주간 정리', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 4, dayLabel: '17(금)', startTime: 10, endTime: 11, title: '프로젝트 정리', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 4, dayLabel: '17(금)', startTime: 13, endTime: 14, title: '프로젝트 리뷰', visibility: 'public' },
  { memberId: 'ddoyi', dayIndex: 4, dayLabel: '17(금)', startTime: 14, endTime: 15, title: '프로젝트 마무리', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 0, dayLabel: '13(월)', startTime: 9, endTime: 12, title: '리더십 회의', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 0, dayLabel: '13(월)', startTime: 13, endTime: 14, title: '점심 미팅', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 0, dayLabel: '13(월)', startTime: 15, endTime: 16, title: '팀장 미팅', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 1, dayLabel: '14(화)', startTime: 9, endTime: 10, title: '주간 팀 리뷰', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 2, dayLabel: '15(수)', startTime: 9, endTime: 12, title: '마케팅 전략 회의', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 2, dayLabel: '15(수)', startTime: 14, endTime: 15, title: '내부 보고', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 2, dayLabel: '15(수)', startTime: 15, endTime: 16, title: '전략 회의', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 3, dayLabel: '16(목)', startTime: 13, endTime: 14, title: '점심 미팅', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 3, dayLabel: '16(목)', startTime: 14, endTime: 15, title: '외부 미팅', visibility: 'public' },
  { memberId: 'hyunwoo', dayIndex: 4, dayLabel: '17(금)', startTime: 9, endTime: 10, title: '주간 리더십 회의', visibility: 'public' },
  { memberId: 'seoyeon', dayIndex: 0, dayLabel: '13(월)', startTime: 13, endTime: 17, title: '캠페인 기획 회의', visibility: 'public' },
  { memberId: 'seoyeon', dayIndex: 1, dayLabel: '14(화)', startTime: 9, endTime: 10, title: '주간 리뷰', visibility: 'public' },
  { memberId: 'seoyeon', dayIndex: 3, dayLabel: '16(목)', startTime: 13, endTime: 14, title: '디자인 리뷰', visibility: 'public' },
  { memberId: 'seoyeon', dayIndex: 4, dayLabel: '17(금)', startTime: 9, endTime: 11, title: '스프린트 플래닝', visibility: 'public' },
  { memberId: 'seoyeon', dayIndex: 4, dayLabel: '17(금)', startTime: 13, endTime: 14, title: '스프린트 회고', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 0, dayLabel: '13(월)', startTime: 9, endTime: 10, title: '광고 성과 체크', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 1, dayLabel: '14(화)', startTime: 9, endTime: 10, title: '주간 성과 분석', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 1, dayLabel: '14(화)', startTime: 10, endTime: 11, title: '캠페인 분석', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 1, dayLabel: '14(화)', startTime: 16, endTime: 17, title: '매체사 미팅', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 2, dayLabel: '15(수)', startTime: 14, endTime: 15, title: '퍼포먼스 리뷰', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 2, dayLabel: '15(수)', startTime: 15, endTime: 16.5, title: '비공개 일정', visibility: 'private' },
  { memberId: 'minjae', dayIndex: 3, dayLabel: '16(목)', startTime: 15, endTime: 16, title: '데이터 분석', visibility: 'public' },
  { memberId: 'minjae', dayIndex: 4, dayLabel: '17(금)', startTime: 11, endTime: 12, title: '보고서 작성', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 0, dayLabel: '13(월)', startTime: 10, endTime: 12, title: '콘텐츠 기획', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 2, dayLabel: '15(수)', startTime: 9, endTime: 10, title: '콘텐츠 기획', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 2, dayLabel: '15(수)', startTime: 10, endTime: 12, title: '콘텐츠 제작 회의', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 2, dayLabel: '15(수)', startTime: 16, endTime: 17, title: '콘텐츠 마감', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 3, dayLabel: '16(목)', startTime: 9, endTime: 10, title: '브랜드 회의', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 4, dayLabel: '17(금)', startTime: 10, endTime: 11, title: '소셜 미디어 점검', visibility: 'public' },
  { memberId: 'yujin', dayIndex: 4, dayLabel: '17(금)', startTime: 11, endTime: 12, title: '주간 보고', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 0, dayLabel: '13(월)', startTime: 14, endTime: 15, title: '제휴사 미팅', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 1, dayLabel: '14(화)', startTime: 10, endTime: 11, title: '파트너 협의', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 1, dayLabel: '14(화)', startTime: 16, endTime: 17, title: '파트너사 보고', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 2, dayLabel: '15(수)', startTime: 15, endTime: 17, title: '외부 미팅', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 3, dayLabel: '16(목)', startTime: 9, endTime: 10, title: '제휴 검토', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 3, dayLabel: '16(목)', startTime: 14, endTime: 15, title: '파트너사 방문', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 4, dayLabel: '17(금)', startTime: 13, endTime: 14, title: '영업 보고', visibility: 'public' },
  { memberId: 'taeoh', dayIndex: 4, dayLabel: '17(금)', startTime: 14, endTime: 15, title: '클라이언트 미팅', visibility: 'public' },
];

const meetingCandidates = [
  {
    id: 'candidate-1',
    type: 'available',
    dateLabel: '14(화)',
    dayIndex: 1,
    startTime: 13,
    endTime: 15,
    isRange: true,
    statusLabel: '전원 가능',
    meetingHint: '1시간 회의 후보 2개가 있어요.',
    availableMemberIds: ['ddoyi', 'hyunwoo', 'seoyeon', 'minjae', 'yujin', 'taeoh'],
  },
  {
    id: 'candidate-2',
    type: 'available',
    dateLabel: '16(목)',
    dayIndex: 3,
    startTime: 10,
    endTime: 11,
    isRange: false,
    statusLabel: '전원 가능',
    meetingHint: '1시간 회의 후보 1개가 있어요.',
    availableMemberIds: ['ddoyi', 'hyunwoo', 'seoyeon', 'minjae', 'yujin', 'taeoh'],
  },
  {
    id: 'candidate-3',
    type: 'check-required',
    dateLabel: '15(수)',
    dayIndex: 2,
    startTime: 15,
    endTime: 16,
    isRange: false,
    statusLabel: '일정 확인 필요',
    availableMemberIds: ['ddoyi', 'hyunwoo', 'seoyeon', 'yujin', 'taeoh'],
    checkRequiredMemberIds: ['minjae'],
    checkReason: '비공개 일정',
    checkTimeRange: '15:00 - 16:30',
  },
];

const days = ['13(월)', '14(화)', '15(수)', '16(목)', '17(금)'];

function getTeamMemberById(id) {
  return teamMembers.find(m => m.id === id) || null;
}

function getTeamMemberName(id) {
  const member = getTeamMemberById(id);
  return member ? member.name : id;
}

function getMembersByIds(ids) {
  return ids.map(id => getTeamMemberById(id)).filter(Boolean);
}

function getTeamMemberIdByName(name) {
  const member = teamMembers.find(m => m.name === name);
  return member ? member.id : null;
}

function getSelectedParticipantIds() {
  if (selectedParticipants.size === 0) {
    return teamMembers.map(m => m.id);
  }
  const ids = [];
  selectedParticipants.forEach(name => {
    const id = getTeamMemberIdByName(name);
    if (id) ids.push(id);
  });
  return ids;
}

function getCandidateParticipantSummary(candidate) {
  const participantIds = getSelectedParticipantIds();
  const availableIds = candidate.availableMemberIds || [];
  const checkRequiredIds = candidate.checkRequiredMemberIds || [];

  const requiredAvailable = [];
  const requiredCheckRequired = [];
  const requiredUnavailable = [];
  const optionalAvailable = [];
  const optionalCheckRequired = [];
  const optionalUnavailable = [];

  participantIds.forEach(id => {
    const member = getTeamMemberById(id);
    const name = member ? member.name : id;
    const role = participantRole.get(name) || 'required';
    const isAvailable = availableIds.includes(id);
    const needsCheck = checkRequiredIds.includes(id);

    if (role === 'required') {
      if (isAvailable) requiredAvailable.push(id);
      else if (needsCheck) requiredCheckRequired.push(id);
      else requiredUnavailable.push(id);
    } else {
      if (isAvailable) optionalAvailable.push(id);
      else if (needsCheck) optionalCheckRequired.push(id);
      else optionalUnavailable.push(id);
    }
  });

  return {
    requiredAvailable,
    requiredCheckRequired,
    requiredUnavailable,
    optionalAvailable,
    optionalCheckRequired,
    optionalUnavailable,
    requiredAvailableCount: requiredAvailable.length,
    requiredCheckRequiredCount: requiredCheckRequired.length,
    requiredUnavailableCount: requiredUnavailable.length,
    optionalAvailableCount: optionalAvailable.length,
    optionalCheckRequiredCount: optionalCheckRequired.length,
    optionalUnavailableCount: optionalUnavailable.length,
    requiredTotal: requiredAvailable.length + requiredCheckRequired.length + requiredUnavailable.length,
    optionalTotal: optionalAvailable.length + optionalCheckRequired.length + optionalUnavailable.length,
    hasRequiredCheck: requiredCheckRequired.length > 0,
    hasOptionalCheck: optionalCheckRequired.length > 0,
  };
}

function hasUnknownParticipant() {
  let found = false;
  selectedParticipants.forEach(name => {
    if (!teamMembers.some(m => m.name === name)) found = true;
  });
  return found;
}

function getCandidateDisplayState(candidate, summary) {
  if (hasUnknownParticipant()) return 'check-required';
  if (summary.hasRequiredCheck || summary.hasOptionalCheck) return 'check-required';
  if (summary.requiredUnavailableCount > 0 || summary.optionalUnavailableCount > 0) return 'check-required';
  return 'available';
}

function getCandidateById(id) {
  return meetingCandidates.find(c => c.id === id) || null;
}

const SHORT_DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getCandidatePopoverId(candidate) {
  const dateObj = parseDate(`2026.07.${String(13 + candidate.dayIndex).padStart(2, '0')}`);
  const dayName = SHORT_DAY_NAMES[dateObj.getDay()];
  const prefix = candidate.type === 'available' ? 'available' : 'check-required';
  return `${prefix}-${dayName}-${candidate.startTime}-${candidate.endTime}`;
}

function buildSchedulePopoverData() {
  const unavailableEntry = schedulePopoverData[0];

  const candidateEntries = meetingCandidates.map(candidate => {
    const timeRange = `${formatHour(candidate.startTime)} - ${formatHour(candidate.endTime)}`;
    const availableNames = candidate.availableMemberIds.map(id => getTeamMemberName(id));

    const base = {
      dateLabel: candidate.dateLabel,
      timeRange,
      candidateId: candidate.id,
    };

    if (candidate.type === 'available') {
      return {
        ...base,
        id: getCandidatePopoverId(candidate),
        type: 'available',
        statusText: '모두가 가능한 시간이에요',
        availableLabel: '가능한 참석자',
        availableCount: availableNames.length,
        availableMembers: availableNames,
        ctaLabel: candidate.isRange ? '이 구간에서 회의 만들기' : '이 시간으로 회의 만들기',
        isRange: candidate.isRange,
        ...(candidate.isRange ? { meetingHint: candidate.meetingHint } : {}),
      };
    }

    const blockedMembers = (candidate.checkRequiredMemberIds || []).map(id => ({
      name: getTeamMemberName(id),
      reason: candidate.checkReason || '',
      time: candidate.checkTimeRange || '',
    }));

    return {
      ...base,
      id: getCandidatePopoverId(candidate),
      type: 'check-required',
      statusText: '일부 참석자의 일정 확인이 필요한 시간이에요.',
      blockedLabel: '확인이 필요한 참석자',
      blockedCount: blockedMembers.length,
      blockedMembers,
      availableLabel: '가능한 참석자',
      availableCount: availableNames.length,
      availableMembers: availableNames,
      ctaLabel: '이 시간으로 회의 만들기',
    };
  });

  return [unavailableEntry, ...candidateEntries];
}

schedulePopoverData = buildSchedulePopoverData();

function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getSchedulesByTime(dayIndex, startTime, endTime) {
  return memberSchedules.filter(s =>
    s.dayIndex === dayIndex &&
    s.startTime < endTime &&
    s.endTime > startTime
  );
}

function getAvailableMembers(dayIndex, startTime, endTime) {
  const busyIds = new Set(getSchedulesByTime(dayIndex, startTime, endTime).map(s => s.memberId));
  return teamMembers.filter(m => !busyIds.has(m.id)).map(m => m.id);
}

function computeConflictPopoverData(dayIndex, hour) {
  const dayLabel = days[dayIndex] || '';
  const timeRange = `${formatHour(hour)} - ${formatHour(hour + 1)}`;

  const blockedMembers = [];
  const availableMembers = [];

  teamMembers.forEach(member => {
    const schedule = memberSchedules.find(s =>
      s.memberId === member.id &&
      s.dayIndex === dayIndex &&
      s.startTime < hour + 1 &&
      s.endTime > hour
    );
    if (schedule) {
      const reason = schedule.visibility === 'private' ? '비공개 일정' : schedule.title;
      blockedMembers.push({ name: member.name, reason, time: `${formatHour(schedule.startTime)} - ${formatHour(schedule.endTime)}` });
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
    candidateId: 'candidate-1',
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
    candidateId: 'candidate-2',
  },
  {
    dayIndex: 2,
    hour: 15,
    type: 'check',
    status: '일정 확인 필요',
    dayName: '수',
    dayNum: 15,
    timeLabel: '15:00 - 16:00',
    candidateCount: 1,
    blockLabel: '확인 필요',
    available: ['이도이', '김현우', '박서연', '최유진', '강태오'],
    checkNeeded: [
      { name: '정민재', reason: '비공개 일정', time: '15:00 - 16:30' },
    ],
    unavailable: [],
    tooltipTitle: '수 15:00 - 16:00',
    tooltipNote: '클릭해서 일정 확인하기',
    candidateId: 'candidate-3',
  },
];

function getTimelineSlot(dayIndex, hour) {
  return timelineSlots.find(s => s.dayIndex === dayIndex && s.hour === hour) || null;
}

const timelineConflictHighCells = new Set([
  '0-9',
  '0-10',
  '0-13',
  '0-14',
  '0-15',
  '1-9',
  '2-9',
  '2-10',
  '2-15',
  '3-13',
  '3-14',
  '4-9',
  '4-10',
  '4-13',
]);

const timelineConflictLowCells = new Set([
  '1-10',
  '1-16',
  '2-14',
  '2-16',
  '3-9',
  '3-15',
  '4-11',
  '4-14',
]);

function getTimelineConflictClass(cellKey) {
  if (timelineConflictHighCells.has(cellKey)) return 'timeline-cell-conflict-high';
  if (timelineConflictLowCells.has(cellKey)) return 'timeline-cell-conflict-low';
  return '';
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
      const conflictClass = getTimelineConflictClass(cellKey);

      if (cellPopoverId) {
        cell.dataset.popoverId = cellPopoverId;
        if (conflictClass) cell.classList.add(conflictClass);
        cell.addEventListener('mouseenter', (e) => openSchedulePopover(cellPopoverId, e.currentTarget, true));
        cell.addEventListener('mouseleave', () => {
          if (isPopoverHover) closeSchedulePopover();
        });
      } else if (slot) {
        cell.classList.add(`timeline-cell-${slot.type}`);

        if (conflictClass) cell.classList.add(conflictClass);

        cell.addEventListener('mouseenter', (e) => showTimelineTooltip(e, slot));
        cell.addEventListener('mouseleave', hideTimelineTooltip);
      } else {
        if (conflictClass) {
          cell.classList.add(conflictClass);
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
        <span class="timeline-cell-badge">${slot.blockLabel || slot.status}</span>
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
  if (slot.type === 'check') return '일부 참석자의 일정 확인이 필요한 시간이에요.';
  return '선택한 참석자 모두 참석 가능한 시간이에요.';
}

function renderQuickSlotDetail(slot) {
  if (slot.type !== 'check') {
    return `<span class="quick-slot-count">1시간 회의 후보 ${slot.candidateCount || 1}개가 있어요.</span>`;
  }

  return `
    <div class="quick-slot-detail">
      <div class="quick-slot-detail-group">
        <span class="quick-slot-detail-title">확인 대상</span>
        ${slot.checkNeeded.map(member => `
          <span class="quick-slot-member-row">
            <span>${member.name}</span>
            <span>${member.reason}</span>
            <span>${member.time}</span>
          </span>
        `).join('')}
      </div>
      <div class="quick-slot-detail-group">
        <span class="quick-slot-detail-title">가능한 참석자</span>
        <span class="quick-slot-member-list">${slot.available.join(' · ')}</span>
      </div>
    </div>
  `;
}

function renderQuickSlotActions(slot) {
  if (slot.type !== 'check') {
    return '<span class="quick-slot-cta">이 구간에서 회의 만들기</span>';
  }

  return `
    <span class="quick-slot-actions">
      <span class="quick-slot-cta quick-slot-cta-secondary" data-card-action="request-check">정민재님에게 확인 요청 보내기</span>
      <span class="quick-slot-cta" data-card-action="create-meeting">이 시간으로 회의 만들기</span>
    </span>
  `;
}

function renderQuickSlots() {
  const container = document.getElementById('quick-slot-cards');
  if (!container) return;

  const quickSlots = timelineSlots.filter(s => {
    if (s.type === 'unavailable') return false;
    if (!s.candidateId) return true;
    const candidate = getCandidateById(s.candidateId);
    return candidate && candidate.type === 'available';
  });

  container.innerHTML = quickSlots.map(slot => `
    <button type="button" class="quick-slot-card quick-slot-${slot.type}" data-day-index="${slot.dayIndex}" data-hour="${slot.hour}">
      <span class="quick-slot-badge quick-slot-badge-${slot.type}">${slot.status}</span>
      <strong class="quick-slot-time">${slot.dayNum}(${slot.dayName}) ${slot.timeLabel}</strong>
      <span class="quick-slot-desc">${buildQuickSlotDesc(slot)}</span>
      ${renderQuickSlotDetail(slot)}
      ${renderQuickSlotActions(slot)}
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.quick-slot-card');
    if (!card) return;
    const action = e.target.closest('[data-card-action]')?.dataset.cardAction || 'create-meeting';
    if (action === 'request-check') {
      e.stopPropagation();
      showToast('확인 요청을 보냈어요.');
      return;
    }
    const slot = getTimelineSlot(Number(card.dataset.dayIndex), Number(card.dataset.hour));
    if (slot) openTimelineModal(slot);
  });
}

function openTimelineModal(slot) {
  const backdrop = document.getElementById('timeline-modal-backdrop');
  const modal = document.getElementById('timeline-modal');
  const body = document.getElementById('timeline-modal-body');
  const confirmBtn = document.getElementById('timeline-modal-confirm');
  const titleEl = document.getElementById('timeline-modal-title');

  titleEl.textContent = '빠른 회의 만들기';

  const candidate = slot.candidateId ? getCandidateById(slot.candidateId) : null;

  let timeLabel, dayName, dayNum;
  let selectedStartTime, selectedEndTime;
  let isRange = false;
  let badgeText, badgeClass;

  if (candidate && candidate.type === 'check-required') {
    dayNum = 13 + candidate.dayIndex;
    const days = ['월', '화', '수', '목', '금'];
    dayName = days[candidate.dayIndex] || '';
    selectedStartTime = candidate.startTime;
    selectedEndTime = candidate.endTime;
    timeLabel = `${String(dayNum).padStart(2, '0')}(${dayName}) ${formatHour(candidate.startTime)} - ${formatHour(candidate.endTime)}`;
    badgeText = '일정 확인 필요';
    badgeClass = 'check';
  } else if (candidate && candidate.isRange) {
    isRange = true;
    dayNum = 13 + candidate.dayIndex;
    const days = ['월', '화', '수', '목', '금'];
    dayName = days[candidate.dayIndex] || '';
    timeLabel = `${String(dayNum).padStart(2, '0')}(${dayName}) ${formatHour(candidate.startTime)} - ${formatHour(candidate.endTime)}`;
    selectedStartTime = candidate.startTime;
    selectedEndTime = candidate.startTime + 1;
    badgeText = '전원 가능';
    badgeClass = 'best';
  } else {
    dayNum = slot.dayNum;
    dayName = slot.dayName;
    selectedStartTime = slot.timeLabel.split(' - ')[0];
    selectedEndTime = slot.timeLabel.split(' - ')[1];
    timeLabel = `${String(dayNum).padStart(2, '0')}(${dayName}) ${slot.timeLabel}`;
    badgeText = '전원 가능';
    badgeClass = 'best';
  }

  const dateStrFull = `2026.07.${String(dayNum).padStart(2, '0')} (${dayName}) ${formatHour(Number(String(selectedStartTime).split(':')[0] || selectedStartTime))} - ${formatHour(Number(String(selectedEndTime).split(':')[0] || selectedEndTime))}`;

  let rangeSlotsHtml = '';
  if (isRange && candidate) {
    const slot1Start = candidate.startTime;
    const slot1End = candidate.startTime + 1;
    const slot2Start = candidate.startTime + 1;
    const slot2End = candidate.startTime + 2;
    const datePrefix = `2026.07.${String(dayNum).padStart(2, '0')} (${dayName})`;
    rangeSlotsHtml = `
      <div class="tm-range-section">
        <div class="tm-range-label">원하는 시간 선택</div>
        <div class="tm-range-slot tm-range-slot-selected" data-start="${formatHour(slot1Start)}" data-end="${formatHour(slot1End)}">
          <span class="tm-range-num">1</span>
          <span class="tm-range-time-label">시간 후보</span>
          <span class="tm-range-badge tm-range-badge-best">전원 가능</span>
          <span class="tm-range-time">${datePrefix} ${formatHour(slot1Start)} - ${formatHour(slot1End)}</span>
        </div>
        <div class="tm-range-slot" data-start="${formatHour(slot2Start)}" data-end="${formatHour(slot2End)}">
          <span class="tm-range-num">2</span>
          <span class="tm-range-time-label">시간 후보</span>
          <span class="tm-range-badge tm-range-badge-best">전원 가능</span>
          <span class="tm-range-time">${datePrefix} ${formatHour(slot2Start)} - ${formatHour(slot2End)}</span>
        </div>
      </div>`;
    modal.dataset.selectedStartTime = formatHour(slot1Start);
    modal.dataset.selectedEndTime = formatHour(slot1End);
  }

  let checkRequiredHtml = '';
  if (candidate && candidate.type === 'check-required') {
    const checkMembers = (candidate.checkRequiredMemberIds || []).map(id => {
      const m = teamMembers.find(tm => tm.id === id);
      return m ? { name: m.name, role: m.role } : null;
    }).filter(Boolean);
    checkRequiredHtml = checkMembers.map(m => `
      <div class="tm-check-required-section">
        <div class="tm-check-required-label">일정 확인 필요한 참석자</div>
        <div class="tm-check-required-row">
          <span class="tm-check-required-name">${m.name}</span>
          <span class="tm-check-required-role">${m.role}</span>
          <button type="button" class="tm-check-required-btn">회의 요청 보내기</button>
        </div>
      </div>
    `).join('');
  }

  const participantChipsHtml = teamMembers.map(m => {
    return `<button type="button" class="tm-chip" data-member="${m.name}" data-role="optional">${m.name}</button>`;
  }).join('');

  body.innerHTML = `
    <div class="tm-selected-time">
      <span class="tm-selected-time-label">선택 시간</span>
      <span class="tm-selected-time-badge ${badgeClass}">${badgeText}</span>
      <strong class="tm-selected-time-text">${dateStrFull}</strong>
    </div>
    ${isRange ? rangeSlotsHtml : ''}
    <div class="tm-input-group">
      <label class="tm-input-label" for="quick-modal-title-input">회의명</label>
      <input type="text" class="tm-input" id="quick-modal-title-input" placeholder="회의명을 입력하세요." value="" />
    </div>
    <div class="tm-input-group">
      <label class="tm-input-label" for="quick-modal-desc-input">회의 설명</label>
      <input type="text" class="tm-input" id="quick-modal-desc-input" placeholder="회의에 관한 간단한 설명을 작성해주세요." value="" />
    </div>
    ${checkRequiredHtml}
    <div class="tm-participants-section">
      <div class="tm-participants-title">참석자 조건 설정</div>
      <div class="tm-participants-group">
        <div class="tm-participants-group-label">필수 참석자</div>
        <div class="tm-participants-input-like" id="quick-modal-required-input">필수 참석자로 지정할 사람을 클릭하세요.</div>
        <div class="tm-chip-list" id="quick-modal-chip-list">${participantChipsHtml}</div>
      </div>
      <div class="tm-participants-group">
        <div class="tm-participants-group-label">선택 참석자</div>
        <div class="tm-participants-info">선택하지 않은 참석자는 자동으로 선택 참석자로 지정됩니다.</div>
      </div>
    </div>
  `;

  confirmBtn.textContent = '회의 요청 보내기';

  modal.dataset.slotDayIndex = slot.dayIndex;
  modal.dataset.slotHour = slot.hour;
  if (candidate) modal.dataset.candidateId = candidate.id;
  modal.dataset.badgeClass = badgeClass;

  body.querySelectorAll('.tm-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      const isReq = this.classList.toggle('tm-chip-required');
      this.dataset.role = isReq ? 'required' : 'optional';
      updateQuickModalRequiredDisplay();
    });
  });

  if (isRange) {
    body.querySelectorAll('.tm-range-slot').forEach(el => {
      el.addEventListener('click', function () {
        body.querySelectorAll('.tm-range-slot').forEach(s => s.classList.remove('tm-range-slot-selected'));
        this.classList.add('tm-range-slot-selected');
        modal.dataset.selectedStartTime = this.dataset.start;
        modal.dataset.selectedEndTime = this.dataset.end;

        const datePrefix = `2026.07.${String(dayNum).padStart(2, '0')} (${dayName})`;
        const badgeEl = body.querySelector('.tm-selected-time-badge');
        const timeEl = body.querySelector('.tm-selected-time-text');
        timeEl.textContent = `${datePrefix} ${this.dataset.start} - ${this.dataset.end}`;
      });
    });
  }

  backdrop.hidden = false;
  modal.hidden = false;
  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    modal.classList.add('visible');
    document.body.classList.add('timeline-modal-open');
  });

  setTimeout(() => document.getElementById('quick-modal-title-input')?.focus(), 120);
}

function updateQuickModalRequiredDisplay() {
  const chips = document.querySelectorAll('#quick-modal-chip-list .tm-chip');
  const requiredNames = [];
  chips.forEach(c => {
    if (c.dataset.role === 'required') requiredNames.push(c.textContent);
  });
  const display = document.getElementById('quick-modal-required-input');
  if (display) display.textContent = requiredNames.join(', ') || '필수 참석자로 지정할 사람을 클릭하세요.';
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

function saveQuickMeetingDraft(slot, title, participants, startTimeOverride, endTimeOverride) {
  const [defStart, defEnd] = slot.timeLabel.split(' - ');
  const startTime = startTimeOverride || defStart;
  const endTime = endTimeOverride || defEnd;
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

    const title = document.getElementById('quick-modal-title-input').value.trim() || TIMELINE_DEFAULT_TITLE;

    const participants = [];
    document.querySelectorAll('#quick-modal-chip-list .tm-chip').forEach(chip => {
      const name = chip.dataset.member;
      const required = chip.dataset.role === 'required';
      const member = teamMembers.find(m => m.name === name);
      participants.push({
        name,
        role: member ? member.role : '',
        required,
      });
    });

    let startTime, endTime;
    if (modal.dataset.selectedStartTime && modal.dataset.selectedEndTime) {
      startTime = modal.dataset.selectedStartTime;
      endTime = modal.dataset.selectedEndTime;
    } else {
      [startTime, endTime] = slot.timeLabel.split(' - ');
    }

    const badgeClass = modal.dataset.badgeClass || slot.status;
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
      startTime,
      endTime,
      source: 'timeline',
      status: 'pending',
      statusLabel: '미응답 ' + meetingParticipants.filter(p => p.response === '미응답').length + '명',
      meetingStatus: badgeClass === 'best' ? '전원 가능' : badgeClass === 'check' ? '일정 확인 필요' : '전원 가능',
      participants: meetingParticipants,
    };

    saveQuickMeetingDraft(slot, title, participants, startTime, endTime);
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
  bindTeamFreeTimeDropdown();

  document.querySelectorAll('.btn-new-meeting').forEach(btn => {
    btn.addEventListener('click', openMeetingDrawer);
  });

  document.getElementById('meeting-drawer-close').addEventListener('click', closeMeetingDrawer);
  document.getElementById('meeting-drawer-cancel').addEventListener('click', closeMeetingDrawer);
  document.getElementById('meeting-drawer-backdrop').addEventListener('click', closeMeetingDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const teamDropdown = document.getElementById('team-free-time-dropdown');
      if (teamDropdown && !teamDropdown.hidden) {
        closeTeamFreeTimeDropdown();
        return;
      }
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

  renderRecommendedParticipants();

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
    const isCheckRequired = card?.dataset.requiresCheck === 'true';

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

    const confirmBtn = document.getElementById('drawer-confirm-step');
    confirmBtn.textContent = card.dataset.requiresCheck === 'true'
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
