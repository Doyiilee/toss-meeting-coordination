const activeCoordination = {
  title: '2분기 캠페인 의사결정 회의',
  status: '확인 필요 1명',
  candidateTime: '화 10:00 - 11:00',
  summary: '필수 참석자 4명 전원 가능 · 선택 참석자 2명 중 1명 가능'
};

function renderCoordination() {
  const container = document.getElementById('coordination-list');
  const emptyState = document.getElementById('empty-state');

  if (!activeCoordination) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = `
    <div class="coordination-card">
      <h4 class="coordination-card-title">${activeCoordination.title}</h4>
      <span class="coordination-status">${activeCoordination.status}</span>
      <p class="coordination-time">${activeCoordination.candidateTime}</p>
      <p class="coordination-summary">${activeCoordination.summary}</p>
      <button class="coordination-detail-btn" type="button" id="detail-btn">상세 보기</button>
    </div>
  `;

  document.getElementById('detail-btn').addEventListener('click', () => {
    console.log('상세 보기 클릭');
  });
}

function init() {
  document.getElementById('hero-primary-btn').addEventListener('click', () => {
    console.log('새 회의 잡기 클릭');
  });

  document.getElementById('bottom-cta-btn').addEventListener('click', () => {
    console.log('새 회의 잡기 클릭');
  });

  document.getElementById('empty-state-btn').addEventListener('click', () => {
    console.log('새 회의 잡기 클릭');
  });

  document.getElementById('hero-secondary-btn').addEventListener('click', () => {
    document.getElementById('active-coordination-section').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('header-progress-btn').addEventListener('click', () => {
    document.getElementById('active-coordination-section').scrollIntoView({ behavior: 'smooth' });
  });

  renderCoordination();
}

document.addEventListener('DOMContentLoaded', init);
