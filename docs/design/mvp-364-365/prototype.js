/* Stage A only: every value below is a labeled design sample. No product API calls. */
const sample = {
  period: '최근 3개월', category: '전체 카테고리', count: 24, unclassified: 3,
  generatedAt: '2026. 9. 29. 오후 2:40',
  summary: '식비 이용내역이 여러 시기에 반복되어 보여요. 결제 시점과 카테고리를 함께 살펴보면, 다음 달에 조정할 항목을 고르기 쉬워집니다.',
  cards: [
    { title: '반복되는 식비 결제', description: '비슷한 종류의 결제가 여러 시기에 나타납니다. 어떤 날에 집중되는지 살펴보세요.' },
    { title: '교통비는 비교적 일정', description: '조회한 기간의 교통 카테고리에서 급격한 변화보다 비슷한 흐름이 보입니다.' },
    { title: '목표로 이어갈 항목', description: '식비처럼 반복해서 보이는 카테고리를 다음 달 목표의 출발점으로 삼을 수 있어요.' }
  ],
  goals: [
    { id: 'food', title: '식비 30% 줄이기', category: '식비', baseline: 180000, target: 126000, difference: 54000, ratio: 30 },
    { id: 'transport', title: '교통비 40% 줄이기', category: '교통', baseline: 90000, target: 54000, difference: 36000, ratio: 40 },
    { id: 'shopping', title: '쇼핑 50% 줄이기', category: '쇼핑', baseline: 75000, target: 37500, difference: 37500, ratio: 50 }
  ]
};
const scenarios = {
  insight: [['initial','분석 실행 전'],['loading','분석 중'],['success','분석 결과'],['partial','미분류 내역 있음'],['empty','분석할 내역 없음'],['error','실패 및 재시도']],
  goal: [['noGoal','설정한 목표 없음'],['recommended','목표 제안'],['selecting','목표 선택'],['saving','저장 중'],['saved','저장 확인'],['saveError','저장 실패'],['existing','기존 목표 조회']]
};
const app = document.querySelector('#app');
const experienceControl = document.querySelector('#experience');
const scenarioControl = document.querySelector('#scenario');
let experience = 'insight';
let scenario = 'initial';
let selectedGoal = 'food';
let savedGoal = null;
let loadingTimer;
let toastTimer;
const won = value => new Intl.NumberFormat('ko-KR').format(value) + '원';
const arrow = '<span aria-hidden="true">↗</span>';

function setScenario(nextExperience, nextScenario) {
  clearTimeout(loadingTimer);
  experience = nextExperience;
  scenario = nextScenario;
  experienceControl.value = experience;
  scenarioControl.innerHTML = scenarios[experience].map(([value,label]) => `<option value="${value}">${label}</option>`).join('');
  scenarioControl.value = scenario;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showToast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3300);
}
function pageHead(kind) {
  return kind === 'insight'
    ? `<div class="page-head"><div><div class="eyebrow">DISCOVER · MVP-364</div><h1>내 소비에서 <em>의미를 발견하다.</em></h1><p>정리한 이용내역을 바탕으로, 반복되는 흐름과 다음 선택의 단서를 살펴보세요.</p></div><div class="page-index">01 / 02 · UNDERSTAND</div></div>`
    : `<div class="page-head goal-head"><div><div class="eyebrow">DECIDE · MVP-365</div><h1>발견을 <em>나의 선택으로.</em></h1><p>눈에 띈 소비에서 바꾸고 싶은 한 가지를 고르고, 목표의 의미를 분명히 확인하세요.</p></div><div class="page-index">02 / 02 · ACT</div></div>`;
}
function evidence(status) {
  const hasData = status !== 'empty';
  const count = hasData ? sample.count : 0;
  return `<aside class="analysis-evidence"><div class="evidence-head"><span class="section-label">분석에 사용되는 정보</span><span class="small-pill ${status === 'error' ? 'warn' : ''}">${status === 'success' ? '분석 결과 기준' : status === 'loading' ? '요청 진행 중' : status === 'error' ? '결과 없음' : '선택한 조건'}</span></div>
    <div><div class="evidence-number">${count}<small>건</small></div><div class="evidence-caption">조회 조건에 맞는 카드 이용내역<br>디자인 샘플의 예시 건수입니다.</div></div>
    <dl class="scope-list"><div><dt>기간</dt><dd>${sample.period}</dd></div><div><dt>카테고리</dt><dd>${sample.category}</dd></div><div><dt>결과 생성</dt><dd>${status === 'success' ? sample.generatedAt : '아직 없음'}</dd></div></dl>
    ${status === 'initial' || status === 'partial' || status === 'empty' ? `<div class="filter-row"><div class="filter-field"><label for="period">기간 조건</label><select id="period"><option>${sample.period}</option><option>전체 기간</option><option>최근 1개월</option></select></div><div class="filter-field"><label for="category">카테고리 조건</label><select id="category"><option>${sample.category}</option><option>식비</option><option>교통</option></select></div></div>` : `<p class="evidence-note">요청 시 기간·카테고리와 거래 날짜, 가맹점, 금액, 분류 정보 등이 분석에 전달됩니다. 조회 건수는 절감액이 아닙니다.</p>`}
  </aside>`;
}
function insightStory(status) {
  if (status === 'loading') return `<section class="analysis-story"><div class="story-status on-dark">READING YOUR PATTERN</div><div class="skeleton-line wide"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div><h2 style="margin-top:29px">소비의 흐름을<br><em>살펴보고 있어요.</em></h2><p class="lead">선택한 24건의 내역을 읽고 핵심 내용을 정리하는 중입니다. 결과가 준비되면 이 자리에 표시됩니다.</p><div class="orbit" aria-hidden="true"></div><p class="story-foot">요청 진행 중 · 결과를 미리 만들거나 완료로 표시하지 않습니다.</p></section>`;
  if (status === 'error') return `<section class="analysis-story"><div class="story-status on-dark">ANALYSIS UNAVAILABLE</div><h2>이번 분석 결과를<br><em>가져오지 못했어요.</em></h2><p class="lead">서비스 응답을 받지 못했습니다. 선택한 분석 조건을 유지한 채 다시 시도할 수 있어요.</p><div class="story-bottom"><button class="primary" data-act="retry">다시 분석하기 ${arrow}</button></div><p class="story-foot">이 상태에서는 분석 결과와 목표 제안을 표시하지 않습니다.</p></section>`;
  if (status === 'empty') return `<section class="analysis-story"><div class="story-status on-dark">NO RECORDS IN THIS VIEW</div><h2>이 조건에서 볼 수 있는<br><em>내역이 없어요.</em></h2><p class="lead">기간이나 카테고리를 넓혀 다시 확인해 보세요. 등록한 이용내역이 없다면 먼저 가져와야 합니다.</p><div class="story-bottom"><button class="primary" data-act="expand">조건 다시 보기 ${arrow}</button><button class="quiet" data-act="records">이용내역 화면 안내 ↗</button></div><div class="empty-art" aria-hidden="true"><span></span><span></span><span></span></div><p class="story-foot">서버 오류와 데이터 없음은 서로 다른 상태입니다.</p></section>`;
  if (status === 'success') return `<section class="analysis-story"><div class="story-status on-dark">THE SIGNAL IN YOUR SPENDING</div><h2>눈에 띈 흐름은,<br><em>반복되는 식비 결제.</em></h2><p class="lead">${sample.summary}</p><div class="story-bottom"><span class="state-badge">분석 결과 · Design Sample</span><button class="quiet" data-act="goal">이 흐름으로 목표 살펴보기 ${arrow}</button></div><p class="story-foot">요약·발견 문장은 실제 제품에서는 AI 응답을 그대로 근거로 구성합니다.</p></section>`;
  return `<section class="analysis-story"><div class="story-status on-dark">YOUR PATTERN, READY TO READ</div><h2>정리한 내역에서<br><em>나의 소비를 읽어볼까요?</em></h2><p class="lead">기간과 카테고리를 고르면 해당 이용내역을 바탕으로 핵심 흐름을 살펴봅니다. 분석에 사용할 정보는 오른쪽에서 확인하세요.</p><div class="story-bottom"><button class="primary" data-act="analyze">내 소비 분석하기 ${arrow}</button></div><p class="story-foot">분석을 실행하기 전에는 AI 결과나 목표 성과를 표시하지 않습니다.</p></section>`;
}
function renderInsight() {
  const status = scenario;
  let after = '';
  if (status === 'success') after = `<div class="result-head"><div><h2>세 가지 발견</h2><p>응답의 카드 제목과 설명을 읽기 쉬운 순서로 배치합니다. 건수와 금액은 시안용 예시입니다.</p></div><span class="sample-tag">DESIGN SAMPLE · 실제 AI 생성 결과 아님</span></div>
    <div class="finding-grid">${sample.cards.map((card,index) => `<article class="finding"><span class="finding-index">SIGNAL 0${index+1}</span><h3>${card.title}</h3><p>${card.description}</p></article>`).join('')}</div>
    <section class="lower-cta"><div><h3>발견한 흐름을, 다음 선택으로</h3><p>목표를 고르기 전 기준 금액과 목표 금액의 차이를 확인할 수 있어요.</p></div><button class="primary dark" data-act="goal">개선 목표 살펴보기 ${arrow}</button></section>`;
  if (status === 'partial') after = `<div class="info-strip warning"><div><h3>분류가 필요한 내역이 있어요</h3><p>디자인 샘플 24건 중 3건은 아직 카테고리가 없습니다. 분석에는 포함되지만 카테고리 해석은 제한될 수 있어요.</p></div><button data-act="records">이용내역 확인 ↗</button></div>`;
  if (status === 'error') after = `<div class="info-strip error"><div><h3>분석 결과를 표시할 수 없습니다</h3><p>실제 제품에서는 응답 오류를 한곳에만 안내합니다. 조건은 유지하고 같은 요청을 다시 시도합니다.</p></div><button data-act="retry">다시 시도 ↗</button></div>`;
  if (status === 'initial' || status === 'partial') after += `<div class="info-strip"><div><h3>어떤 정보로 분석하나요?</h3><p>선택 기간·카테고리와 거래 날짜, 가맹점, 금액, 분류 정보가 분석 요청에 사용됩니다.</p></div><button data-act="scope">사용 정보 자세히 보기 ↗</button></div>`;
  if (status === 'loading') after = `<div class="finding-grid">${[1,2,3].map(() => `<div class="finding"><div class="skeleton-line"></div><div class="skeleton-line wide"></div><div class="skeleton-line"></div></div>`).join('')}</div>`;
  if (status === 'empty') after = `<div class="info-strip"><div><h3>분석할 이용내역이 필요해요</h3><p>이 조건의 결과는 0건입니다. 다른 조건을 선택하거나, 이용내역 화면에서 등록 상태를 확인하세요.</p></div></div>`;
  app.innerHTML = `${pageHead('insight')}<div class="canvas analysis-grid">${insightStory(status)}${evidence(status)}</div><div class="after-canvas">${after}</div>`;
}
function goalFocus(status, goal) {
  if (status === 'noGoal' || status === 'recommended' || status === 'selecting' || status === 'saving' || status === 'saveError') {
    const title = status === 'selecting' || status === 'saving' || status === 'saveError' ? `이번 달에는<br><span style="color:var(--mint)">${goal.category}</span>부터 살펴볼까요?` : '하나의 선택이<br>다음 달을 바꿉니다.';
    return `<section class="goal-focus"><div class="eyebrow">FROM INSIGHT TO ACTION</div><h2>${title}</h2><p>${status === 'selecting' || status === 'saving' || status === 'saveError' ? '기준 금액과 목표 금액을 확인한 다음 저장하세요. 아직 달성한 절감액은 없습니다.' : '아직 설정한 목표가 없어요. 이용내역에서 눈에 띈 카테고리 하나를 골라 시작할 수 있습니다.'}</p><div class="focus-bottom"><span class="state-badge">${status === 'noGoal' ? '설정한 목표 없음 · Design Sample' : '2026년 9월 · Design Sample'}</span><div class="stat-row"><strong class="stat-value">01</strong><span>한 달에 하나의 목표<br>선택한 뒤 저장</span></div></div></section>`;
  }
  return `<section class="goal-focus"><div class="eyebrow">MY CHOSEN DIRECTION</div><h2>${goal.title}<br><span style="color:var(--mint)">진행 중이에요.</span></h2><p>2026년 9월 목표로 저장된 상태입니다. 목표를 정한 것과 실제로 절감한 것은 다른 정보예요.</p><div class="focus-bottom"><span class="state-badge">${status === 'saved' ? '저장 확인 · Design Sample' : '기존 목표 조회 · Design Sample'}</span><div class="stat-row"><strong class="stat-value">${won(goal.target)}</strong><span>이번 달 지출 목표 금액<br>절감 실적이 아닙니다</span></div></div></section>`;
}
function goalChoices(status, goal) {
  if (status === 'noGoal') return `<section class="goal-panel"><div class="section-heading"><div><h2>목표를 아직 고르지 않았어요</h2><p>분석 결과를 확인한 뒤 조정하고 싶은 카테고리를 선택할 수 있습니다.</p></div><span class="small-pill gray">시작 전</span></div><div class="empty-pattern" aria-hidden="true"></div><div class="context-card"><b>다음 행동</b><p>내 소비 분석으로 돌아가 흐름을 읽어보세요. 이 화면의 숫자는 모두 시연용 예시이며 실제 추천을 뜻하지 않습니다.</p></div><div class="panel-foot"><p>현재 코드의 목표 제안은 거래 카테고리 합계에서 프런트엔드가 계산합니다.</p><button class="primary dark" data-act="backInsight">분석 화면 보기 ${arrow}</button></div></section>`;
  if (status === 'saved' || status === 'existing') return `<section class="goal-panel"><div class="section-heading"><div><h2>내가 선택한 목표</h2><p>추천 항목이 아닌, 저장된 목표의 상태와 금액을 보여줍니다.</p></div><span class="small-pill">진행 중</span></div><div class="choice-list"><div class="choice selected"><span class="radio" aria-hidden="true"></span><span class="choice-main"><b>${goal.title}</b><small>2026-09 · ${goal.category} · 목표로 저장됨</small></span><span class="choice-number">${won(goal.target)}</span></div></div><div class="context-card"><b>현재 확인 가능한 상태</b><p>목표가 저장되어 있고 상태가 ‘진행 중’입니다. 이 정보만으로 달성률이나 실제 절감액을 계산할 수는 없어요.</p></div><div class="panel-foot"><p>중단·완수 상태 변경은 기존 인터페이스를 유지합니다. 완수 표시만으로 실제 절감이 검증되지는 않습니다.</p><button class="primary dark" data-act="recommend">다른 목표 살펴보기 ${arrow}</button></div></section>`;
  return `<section class="goal-panel"><div class="section-heading"><div><h2>이번에 바꾸고 싶은 한 가지</h2><p>이용내역의 카테고리 금액에서 계산한 예시 제안입니다. AI 응답에 목표 금액은 포함되지 않습니다.</p></div><span class="small-pill">선택 예시 3개</span></div><div class="choice-list">${sample.goals.map(item => `<button class="choice ${selectedGoal === item.id && status !== 'recommended' ? 'selected' : ''}" data-act="select" data-id="${item.id}" ${status === 'saving' ? 'disabled' : ''}><span class="radio" aria-hidden="true"></span><span class="choice-main"><b>${item.title}</b><small>기준 ${won(item.baseline)} → 목표 ${won(item.target)} · ${item.ratio}% 조정 계획</small></span><span class="choice-number">차이 ${won(item.difference)}</span></button>`).join('')}</div><div class="panel-foot"><p>‘차이’는 기준 금액과 목표 금액의 계산상 차이입니다. 실제 절감액이 아닙니다.</p><button class="primary dark" data-act="save" ${status === 'recommended' || status === 'saving' ? 'disabled' : ''}>${status === 'saving' ? '저장하는 중…' : '이 목표 저장하기'} ${status === 'saving' ? '' : arrow}</button></div>${status === 'saveError' ? '<div class="notice fail">목표를 저장하지 못했어요. 선택한 항목은 그대로 유지됩니다. 다시 시도해 주세요.</div>' : ''}</section>`;
}
function goalDetail(status, goal) {
  const active = status === 'saved' || status === 'existing';
  return `<div class="goal-detail"><section class="detail-card"><h3>기준 금액과 목표 금액</h3><p class="sub">시연용 이용내역 합계와 선택한 조정 비율을 바탕으로 계산했습니다.</p><div class="amount-track"><div class="amount-row"><label>기준 금액</label><div class="track"><span style="width:100%"></span></div><b>${won(goal.baseline)}</b></div><div class="amount-row target"><label>목표 금액</label><div class="track"><span style="width:${goal.target / goal.baseline * 100}%"></span></div><b>${won(goal.target)}</b></div></div><div class="metric-note">계획상 차이 ${won(goal.difference)} = 기준 금액 − 목표 금액. 해당 기간의 미래 소비나 실제 절감 실적을 뜻하지 않습니다.</div></section><section class="detail-card"><h3>목표의 진행 상태</h3><p class="sub">실제 제공되는 목표 상태에 근거한 단계만 표현합니다.</p><div class="journey"><div class="journey-step ${active ? 'done' : status === 'selecting' || status === 'saving' || status === 'saveError' ? 'done' : ''}"><i>1</i><b>목표 선택</b></div><div class="journey-step ${active ? 'done' : ''}"><i>2</i><b>저장·진행 중</b></div><div class="journey-step"><i>3</i><b>결과 확인</b></div></div><p class="journey-caption">${active ? '목표 저장과 진행 중 상태는 확인할 수 있습니다. 실제 지출 대비 성과는 별도 검증 전까지 표시하지 않습니다.' : '목표를 저장하면 진행 중 상태로 이동합니다. 저장 전에는 성과가 없습니다.'}</p></section></div>`;
}
function renderGoal() {
  const status = scenario;
  const goal = (status === 'saved' && savedGoal) ? sample.goals.find(item => item.id === savedGoal) : sample.goals.find(item => item.id === selectedGoal);
  app.innerHTML = `${pageHead('goal')}<div class="goal-grid">${goalFocus(status,goal)}${goalChoices(status,goal)}</div>${['selecting','saving','saveError','saved','existing'].includes(status) ? goalDetail(status,goal) : ''}<div class="after-canvas"><div class="info-strip"><div><h3>이 화면에서 ‘변화’를 읽는 방법</h3><p>현재 계약은 목표 금액과 저장 상태를 제공합니다. 검증된 월별 실적 기록이 없어 미래 누적 차트나 달성률을 만들지 않았습니다.</p></div><button data-act="backInsight">소비 분석으로 돌아가기 ↗</button></div></div>`;
}
function render() { experience === 'insight' ? renderInsight() : renderGoal(); }
experienceControl.addEventListener('change', () => setScenario(experienceControl.value, experienceControl.value === 'insight' ? 'initial' : 'noGoal'));
scenarioControl.addEventListener('change', () => setScenario(experience, scenarioControl.value));
document.addEventListener('click', event => {
  const control = event.target.closest('[data-act]');
  if (!control) return;
  const action = control.dataset.act;
  if (action === 'analyze' || action === 'retry') {
    setScenario('insight','loading');
    loadingTimer = setTimeout(() => setScenario('insight','success'), 1400);
  } else if (action === 'goal') setScenario('goal',savedGoal ? 'existing' : 'recommended');
  else if (action === 'select') { selectedGoal = control.dataset.id; setScenario('goal','selecting'); }
  else if (action === 'save') {
    setScenario('goal','saving');
    loadingTimer = setTimeout(() => { savedGoal = selectedGoal; setScenario('goal','saved'); showToast('디자인 시연: 목표 저장 확인 상태입니다.'); }, 950);
  } else if (action === 'recommend') setScenario('goal','recommended');
  else if (action === 'backInsight') setScenario('insight','success');
  else if (action === 'expand') setScenario('insight','initial');
  else if (action === 'scope') showToast('거래 날짜·가맹점·금액·분류 정보와 선택한 분석 범위를 사용합니다.');
  else if (action === 'records') showToast('실제 제품에서는 기존 이용내역 화면 /washing으로 이동합니다.');
});
setScenario('insight','initial');
