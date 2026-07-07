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
    label: '추천 후보',
    time: '2026.07.14 (화) 10:00 - 11:00',
    descriptions: [
      '필수 참석자는 모두 가능해요.',
      '선택 참석자 1명은 확인이 필요해요.'
    ],
    ctaText: '확인하러 가기',
    toastMsg: '확인 필요자 상세 화면은 다음 단계에서 연결할 예정이에요.'
  },
  {
    title: '제품 런칭 리뷰 회의',
    status: '추천 후보 3개',
    label: '이번 주 후보 확인 중',
    time: '',
    descriptions: [
      '필수 참석자가 모두 가능한 시간이 3개 있어요.',
      '가장 적합한 시간을 선택해 확정할 수 있어요.'
    ],
    ctaText: '후보 보기',
    toastMsg: '추천 후보 목록은 다음 단계에서 연결할 예정이에요.'
  }
];

// ─── Render coordination ───
function renderCoordination() {
  const container = document.getElementById('coordination-list');

  if (!coordinationData || coordinationData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <strong class="empty-state-title">확정 대기 중인 회의가 없어요</strong>
        <p class="empty-state-desc">새 회의를 만들면 확정 가능한 시간을 함께 찾아드릴게요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = coordinationData.map((item, index) => `
    <div class="coordination-row">
      <div class="coordination-row-main">
        <span class="coordination-row-badge">${item.status}</span>
        <h4 class="coordination-row-title">${item.title}</h4>
      </div>
      <div class="coordination-row-info">
        <span class="coordination-row-label">${item.label}</span>
        ${item.time ? `<span class="coordination-row-time">${item.time}</span>` : '<span class="coordination-row-time">가능한 시간 3개</span>'}
      </div>
      <div class="coordination-row-meta">
        <span class="coordination-row-desc">${item.descriptions[item.descriptions.length - 1]}</span>
        <button class="coordination-detail-btn" type="button" data-index="${index}">${item.ctaText}</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.coordination-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.index;
      const item = coordinationData[idx];
      console.log('CTA 클릭:', item.ctaText, item.title);
      showToast(item.toastMsg);
    });
  });
}

// ─── Scroll to section ───
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── Sidebar actions ───
const sidebarActions = {
  'dashboard': () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  'received-requests': () => {
    scrollToSection('response-section');
  },
  'sent-coordination': () => {
    scrollToSection('coordination-section');
  },
  'confirmed': () => {
    scrollToSection('confirmed-section');
  },
  'my-schedule': () => {
    scrollToSection('schedule-section');
  },
  'team-compare': () => {
    showToast('팀 시간 비교 화면은 다음 단계에서 연결할 예정이에요.');
  },
  'new-meeting': () => {
    clearPreviousSession();
    window.location.href = 'create.html';
  }
};

// ─── Init ───
function init() {
  // Header create button
  document.getElementById('header-create-btn').addEventListener('click', () => {
    clearPreviousSession();
    window.location.href = 'create.html';
  });

  // Sidebar menus
  document.querySelectorAll('.sidebar-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      // Update active state
      document.querySelectorAll('.sidebar-menu').forEach(m => m.classList.remove('sidebar-menu-active'));
      btn.classList.add('sidebar-menu-active');
      if (sidebarActions[action]) sidebarActions[action]();
    });
  });

  // Response buttons
  document.getElementById('response-btn-1').addEventListener('click', () => {
    console.log('참석 여부 응답하기 클릭');
    showToast('참석 여부 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  document.getElementById('response-btn-2').addEventListener('click', () => {
    console.log('일정 확인 후 응답하기 클릭');
    showToast('일정 확인 후 응답 화면은 다음 단계에서 연결할 예정이에요.');
  });

  // View all schedule
  document.getElementById('view-all-schedule-btn').addEventListener('click', () => {
    console.log('내 일정 전체 보기 클릭');
    showToast('전체 일정 화면은 다음 단계에서 연결할 예정이에요.');
  });

  // Confirmed meeting view
  document.getElementById('confirmed-view-btn').addEventListener('click', () => {
    console.log('회의 일정 보기 클릭');
    showToast('회의 일정 상세 화면은 다음 단계에서 연결할 예정이에요.');
  });

  renderCoordination();
}

document.addEventListener('DOMContentLoaded', init);
