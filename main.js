// ─── Toast ───
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast-visible');
  setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 2000);
}

// ─── Clear previous session ───
function clearPreviousSession() {
  const keys = ['meetingDraft', 'participantsDraft', 'participantRoles', 'selectedTime', 'finalCandidate'];
  keys.forEach(key => sessionStorage.removeItem(key));
}

// ─── Dummy data ───
const coordinationData = [
  {
    title: '2분기 캠페인 의사결정 회의',
    status: '확인 필요 1명',
    time: '2026.07.14 (화) 10:00 - 11:00',
    summary: '필수 참석자 4명 전원 가능 · 선택 참석자 2명 중 1명 가능'
  },
  {
    title: '제품 런칭 리뷰 회의',
    status: '추천 시간 3개',
    time: '이번 주 후보 확인 중',
    summary: '필수 참석자 기준으로 가능한 시간을 찾았어요.'
  }
];

// ─── Render coordination ───
function renderCoordination() {
  const container = document.getElementById('coordination-list');

  if (!coordinationData || coordinationData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <strong class="empty-state-title">내가 만든 조율이 없어요</strong>
        <p class="empty-state-desc">새 회의를 만들면 확정 가능한 시간을 함께 찾아드릴게요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = coordinationData.map((item, index) => `
    <div class="coordination-card">
      <h4 class="coordination-card-title">${item.title}</h4>
      <span class="coordination-status">${item.status}</span>
      <p class="coordination-time">${item.time}</p>
      <p class="coordination-summary">${item.summary}</p>
      <button class="coordination-detail-btn" type="button" data-index="${index}">상세 보기</button>
    </div>
  `).join('');

  container.querySelectorAll('.coordination-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.index;
      const item = coordinationData[idx];
      console.log('상세 보기 클릭:', item.title);
      showToast('상세 화면은 다음 단계에서 연결할 예정이에요.');
    });
  });
}

// ─── Scroll to section ───
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── Quick menu actions ───
const quickActions = {
  'new-meeting': () => {
    clearPreviousSession();
    window.location.href = 'create.html';
  },
  'my-schedule': () => {
    scrollToSection('schedule-section');
  },
  'team-compare': () => {
    showToast('팀 일정 비교 화면은 다음 단계에서 연결할 예정이에요.');
  },
  'received-requests': () => {
    scrollToSection('response-section');
  },
  'sent-coordination': () => {
    scrollToSection('coordination-section');
  },
  'confirmed': () => {
    showToast('확정된 회의 화면은 다음 단계에서 연결할 예정이에요.');
  }
};

// ─── Init ───
function init() {
  // Hero CTA
  document.getElementById('hero-primary-btn').addEventListener('click', () => {
    clearPreviousSession();
    window.location.href = 'create.html';
  });

  document.getElementById('hero-secondary-btn').addEventListener('click', () => {
    scrollToSection('response-section');
  });

  // Header schedule button
  document.getElementById('header-schedule-btn').addEventListener('click', () => {
    scrollToSection('schedule-section');
  });

  // Response buttons
  document.getElementById('response-btn-1').addEventListener('click', () => {
    showToast('응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('response-btn-2').addEventListener('click', () => {
    showToast('응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  // View all schedule
  document.getElementById('view-all-schedule-btn').addEventListener('click', () => {
    showToast('내 일정 화면은 다음 단계에서 연결할 예정이에요.');
  });

  // Quick menu
  document.querySelectorAll('.quick-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (quickActions[action]) quickActions[action]();
    });
  });

  renderCoordination();
}

document.addEventListener('DOMContentLoaded', init);
