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

function goToCreate() {
  clearPreviousSession();
  window.location.href = 'create.html';
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
    btn.addEventListener('click', goToCreate);
  });

  document.querySelectorAll('[data-toast]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(btn.dataset.toast);
    });
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
}

document.addEventListener('DOMContentLoaded', init);
