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
    desc.textContent = '참석자의 역할(필수/선택)을 선택해주세요.';
  } else if (step === 3) {
    title.textContent = '후보 시간을 추천했어요';
    desc.textContent = '필수 참석자의 가능 여부를 기준으로 확정 가능한 시간을 먼저 보여드려요.';
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
      desc: requiredTotal > 0 ? '필수 참석자 1명의 확인이 필요해요.' : '',
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
  const meetings = JSON.parse(sessionStorage.getItem('confirmedMeetings') || '[]');

  document.querySelectorAll('.confirmed-card--new').forEach(el => el.remove());

  meetings.forEach(meeting => {
    const allParticipants = [...meeting.requiredParticipants, ...meeting.optionalParticipants];
    let nameText;
    if (allParticipants.length <= 3) {
      nameText = allParticipants.join(', ');
    } else {
      nameText = `${allParticipants.slice(0, 3).join(', ')} 외 ${allParticipants.length - 3}명`;
    }

    const card = document.createElement('article');
    card.className = 'confirmed-card confirmed-card--new';
    card.innerHTML = `
      <div>
        <span class="badge badge-green">확정 완료</span>
        <h4 class="card-title">${meeting.title}</h4>
        <div class="confirmed-meta">
          <span>${meeting.date} (${meeting.dayOfWeek}) ${meeting.timeRange}</span>
          <span>필수 참석자 ${meeting.requiredParticipants.length}명 · 선택 참석자 ${meeting.optionalParticipants.length}명</span>
        </div>
        <p class="card-support">${nameText}</p>
      </div>
      <button type="button" class="btn-secondary">회의 상세 보기</button>
    `;

    card.querySelector('.btn-secondary').addEventListener('click', () => {
      showToast('회의 상세 화면은 다음 작업에서 연결할 예정이에요.');
    });

    const header = section.querySelector('.section-header');
    header.after(card);
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
    if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) {
      closeMeetingDrawer();
    }
  });

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

    const title = document.getElementById('meeting-title-input').value.trim();
    const candidate = getCandidateData(selectedCandidateId);
    const card = document.querySelector(`.drawer-candidate-card[data-candidate-id="${selectedCandidateId}"]`);
    const badgeEl = card?.querySelector('.badge');
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
}

document.addEventListener('DOMContentLoaded', init);
