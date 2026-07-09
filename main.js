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

function init() {
  document.getElementById('btn-add-schedule').addEventListener('click', () => {
    clearPreviousSession();
    window.location.href = 'create.html';
  });

  document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast('해당 기능은 준비 중이에요.');
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
    showToast('더보기 메뉴는 준비 중이에요.');
  });

  document.getElementById('urgent-btn-1').addEventListener('click', () => {
    showToast('참석 여부 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-2').addEventListener('click', () => {
    showToast('답장 기능은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-3').addEventListener('click', () => {
    showToast('확인 기능은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('urgent-btn-4').addEventListener('click', () => {
    showToast('검토 기능은 다음 단계에서 연결할 예정이에요.');
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
