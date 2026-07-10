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
let selectedDuration = 60;
const calendarYear = 2026;
const calendarMonth = 6;
const defaultStartDate = '2026.07.14';
const defaultEndDate = '2026.07.20';
let startDate = null;
let endDate = null;

function resetSelectedParticipants() {
  selectedParticipants.clear();
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
    renderSelectedParticipants();
    participantInput.value = '';
  });

  document.querySelectorAll('[data-toast]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(btn.dataset.toast);
    });
  });

  document.getElementById('drawer-next-step').addEventListener('click', () => {
    showToast('참석자 조건 설정 단계는 다음 작업에서 연결할 예정이에요.');
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
}

document.addEventListener('DOMContentLoaded', init);
