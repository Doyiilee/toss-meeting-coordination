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

  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('.segment-btn').forEach(item => item.classList.remove('segment-active'));
      btn.classList.add('segment-active');
    });
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
}

document.addEventListener('DOMContentLoaded', init);
