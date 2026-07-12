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

function setActiveNav(action) {
  document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
    btn.classList.toggle('sidebar-icon-active', btn.dataset.action === action);
  });
}

function getPendingNavMessage(action) {
  const messages = {
    calendar: '캘린더 화면은 다음 단계에서 연결할 예정이에요.',
    message: '메시지 화면은 다음 단계에서 연결할 예정이에요.',
    mail: '메일 화면은 다음 단계에서 연결할 예정이에요.',
    address: '주소록 화면은 다음 단계에서 연결할 예정이에요.'
  };

  return messages[action] || '해당 기능은 준비 중이에요.';
}

function init() {
  document.getElementById('btn-add-schedule').addEventListener('click', () => {
    showToast('일정 추가 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const action = btn.dataset.action;

      if (btn.dataset.disabledNav === 'true') {
        const currentScrollY = window.scrollY;
        showToast(getPendingNavMessage(action));
        requestAnimationFrame(() => {
          window.scrollTo({ top: currentScrollY, left: window.scrollX, behavior: 'auto' });
        });
        return;
      }

      switch (action) {
        case 'dashboard':
          setActiveNav('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'meeting':
          window.location.href = 'meetings.html';
          break;
        default:
          showToast(getPendingNavMessage(action));
      }
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

  document.getElementById('urgent-btn-1').addEventListener('click', () => {
    showToast('참석 여부 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-2').addEventListener('click', () => {
    showToast('답장 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-3').addEventListener('click', () => {
    showToast('확인 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-4').addEventListener('click', () => {
    showToast('검토 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('next-schedule-btn').addEventListener('click', () => {
    showToast('회의 메모 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('received-btn-1').addEventListener('click', () => {
    showToast('참석 여부 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('received-btn-2').addEventListener('click', () => {
    showToast('참석 여부 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('aside-status-link').addEventListener('click', () => {
    showToast('상태 설정 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('aside-today-link').addEventListener('click', () => {
    showToast('전체 일정 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('cal-prev').addEventListener('click', () => {
    showToast('이전 달 기능은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    showToast('다음 달 기능은 다음 단계에서 연결할 예정이에요.');
  });
}

document.addEventListener('DOMContentLoaded', init);
