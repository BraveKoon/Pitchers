'use strict';

/* ───────────── 데이터 ───────────── */

// 팔 각도: 0° = 지면과 수평(사이드암), 90° = 머리 위 수직, 음수 = 어깨 아래
const FORMS = [
  {
    id: 'OH', name: '오버핸드', min: 65, max: 90, color: '#ff5470',
    desc: '팔이 머리 위에서 수직에 가깝게 내려오는 폼. 높은 타점에서 내리꽂는 각도가 가장 큰 무기입니다.',
    good: '수직 무브먼트가 커서 떠오르는 직구와 뚝 떨어지는 커브·스플리터의 낙차가 큽니다.',
    warn: '좌우 변화는 작은 편이고, 어깨가 열리면 제구가 높게 뜨기 쉽습니다.',
    players: '클레이튼 커쇼, 저스틴 벌랜더',
  },
  {
    id: 'H34', name: '하이 쓰리쿼터', min: 45, max: 65, color: '#ffa23a',
    desc: '가장 흔하고 균형 잡힌 폼. 구속을 내기 쉽고 거의 모든 구종을 무리 없이 던질 수 있습니다.',
    good: '상하·좌우 변화를 고르게 쓸 수 있어 구종 선택의 폭이 가장 넓습니다.',
    warn: '타자에게 가장 익숙한 궤적이라, 구위나 제구 중 하나는 확실해야 합니다.',
    players: '게릿 콜, 류현진',
  },
  {
    id: 'L34', name: '로우 쓰리쿼터', min: 20, max: 45, color: '#f2d34b',
    desc: '팔이 어깨보다 조금 높은 곳에서 나오는 폼. 직구에 자연스러운 테일링이 붙습니다.',
    good: '투심·체인지업의 팔 쪽 움직임과 슬라이더·스위퍼의 횡 변화가 크게 살아납니다.',
    warn: '커브처럼 위에서 아래로 떨어뜨리는 공은 낙차를 만들기 어렵습니다.',
    players: '맥스 슈어저, 크리스 세일',
  },
  {
    id: 'SIDE', name: '사이드암', min: -10, max: 20, color: '#4fd18b',
    desc: '팔이 지면과 거의 수평으로 나오는 폼. 같은 손 타자에게 등 뒤에서 공이 오는 듯한 각도를 만듭니다.',
    good: '싱커와 횡슬라이더의 좌우 폭이 매우 커서 땅볼 유도에 유리합니다.',
    warn: '반대 손 타자에게는 공이 오래 보여 약점이 되기 쉽습니다. 체인지업이 꼭 필요합니다.',
    players: '임창용, 정우영',
  },
  {
    id: 'SUB', name: '언더핸드', min: -45, max: -10, color: '#5fb4ff',
    desc: '허리를 숙여 어깨 아래에서 공을 놓는 잠수함 폼. 아래에서 위로 솟는 궤적은 타자에게 매우 낯섭니다.',
    good: '구속이 느려도 통합니다. 가라앉는 싱커와 솟아오르는 변화구의 조합이 독특합니다.',
    warn: '허리·무릎 부담이 크고 폼을 익히는 데 오래 걸립니다. 주자 견제와 구속에는 불리합니다.',
    players: '정대현, 박종훈, 타일러 로저스',
  },
];
const FORM_IX = { OH: 0, H34: 1, L34: 2, SIDE: 3, SUB: 4 };

// fit: 폼별 적합도 [OH, H34, L34, SIDE, SUB] (0~10)
const PITCHES = {
  FF: {
    ko: '포심 패스트볼', en: 'Four-Seam Fastball', color: '#ff4d6d', ratio: 1.0,
    fit: [10, 10, 7, 5, 6], diff: 1,
    diffNote: '가장 기본이 되는 공. 손목을 세우고 공 뒤를 똑바로 긁어 주는 것이 전부입니다.',
    why: {
      OH: '순수한 백스핀이 걸려 타자 눈에 떠오르는 듯한 직구가 됩니다.',
      H34: '구속과 회전을 가장 효율적으로 낼 수 있는 기본 구종입니다.',
      L34: '팔 쪽으로 살짝 휘는 테일링 직구가 됩니다.',
      SIDE: '옆으로 흐르는 직구. 높은 코스에 보여 주는 용도로 좋습니다.',
      SUB: '낮은 곳에서 솟아오르는 궤적이라 높은 코스에서 헛스윙을 유도합니다.',
    },
    grip: {
      view: { polar: 90, az: 90, roll: 90 },
      fingers: [
        { n: '검지', tip: [-0.24, 0.72], base: [-0.3, -1.22] },
        { n: '중지', tip: [0.24, 0.76], base: [0.3, -1.22] },
      ],
      thumb: [-0.05, -0.62], curl: true,
      steps: ['실밥이 말굽(C자) 모양으로 보이게 잡습니다.', '검지·중지 끝마디를 위쪽 실밥에 직각으로 걸칩니다.', '엄지는 공 바로 아래 가죽 부분에, 손바닥과 공 사이는 살짝 띄웁니다.'],
    },
  },
  SI: {
    ko: '투심 · 싱커', en: 'Two-Seam / Sinker', color: '#ff9f1c', ratio: 0.985,
    fit: [3, 5, 9, 10, 10], diff: 2,
    diffNote: '직구처럼 던지되 검지 쪽으로 살짝 눌러 주는 감각만 익히면 됩니다.',
    why: {
      OH: '팔 각도가 높아 가라앉는 폭은 작습니다. 보조용으로 씁니다.',
      H34: '포심과 섞어 방망이 중심을 피하는 용도로 좋습니다.',
      L34: '팔 각도 덕분에 팔 쪽으로 크게 휘며 가라앉습니다.',
      SIDE: '사이드암의 간판 구종. 옆으로 크게 흐르며 떨어져 땅볼을 만듭니다.',
      SUB: '아래로 꺼지듯 가라앉는 잠수함 투수의 기본 구종입니다.',
    },
    grip: {
      view: { polar: 0, az: 0, roll: 90 },
      fingers: [
        { n: '검지', tip: [-0.36, 0.66], base: [-0.38, -1.22] },
        { n: '중지', tip: [0.36, 0.7], base: [0.38, -1.22] },
      ],
      thumb: [0, -0.66], curl: true,
      steps: ['실밥 사이가 가장 좁은 곳을 찾습니다.', '검지·중지를 두 실밥 위에 나란히 올려 따라 잡습니다.', '놓을 때 검지에 힘을 조금 더 실어 줍니다.'],
    },
  },
  FC: {
    ko: '커터', en: 'Cutter', color: '#d9825f', ratio: 0.96,
    fit: [7, 7, 5, 2, 1], diff: 3,
    diffNote: '직구 팔 스윙을 유지한 채 공의 바깥쪽을 살짝 자르는 감각이 필요합니다.',
    why: {
      OH: '직구와 같은 궤적에서 끝에 살짝 꺾여 빗맞은 타구를 만듭니다.',
      H34: '직구와 구속 차가 작아 방망이 손잡이 쪽을 파고듭니다.',
      L34: '테일링 직구와 반대로 꺾여 좌우를 넓게 쓸 수 있습니다.',
      SIDE: '팔 각도상 꺾임을 만들기 어렵습니다.',
      SUB: '팔 각도상 꺾임을 만들기 어렵습니다.',
    },
    grip: {
      view: { polar: 90, az: 90, roll: 90 },
      fingers: [
        { n: '검지', tip: [0.02, 0.76], base: [0.0, -1.22] },
        { n: '중지', tip: [0.42, 0.72], base: [0.46, -1.2] },
      ],
      thumb: [-0.3, -0.6], curl: true,
      steps: ['포심 그립에서 두 손가락을 바깥쪽으로 조금 옮깁니다.', '검지·중지를 붙이고 중지 끝에 힘을 줍니다.', '손목을 비틀지 말고 직구처럼 던집니다.'],
    },
  },
  SL: {
    ko: '슬라이더', en: 'Slider', color: '#e8c93a', ratio: 0.91,
    fit: [7, 9, 9, 6, 6], diff: 3,
    diffNote: '손목을 비틀지 않고 공 옆면을 자르듯 놓아야 합니다. 팔꿈치 부담에 주의하세요.',
    why: {
      OH: '옆보다는 아래로 떨어지는 종슬라이더가 됩니다.',
      H34: '직구와 가장 잘 어울리는 결정구. 글러브 쪽으로 날카롭게 꺾입니다.',
      L34: '횡으로 크게 휘어 같은 손 타자의 바깥쪽으로 달아납니다.',
      SIDE: '옆으로 길게 흐르는 슬라이더가 됩니다.',
      SUB: '가라앉지 않고 옆으로 밀려 나가며 살짝 떠오릅니다.',
    },
    grip: {
      view: { polar: 0, az: 0, roll: 104 },
      fingers: [
        { n: '검지', tip: [0.12, 0.74], base: [0.02, -1.22] },
        { n: '중지', tip: [0.5, 0.64], base: [0.42, -1.2] },
      ],
      thumb: [-0.36, -0.58], curl: true,
      steps: ['두 손가락을 붙여 공의 바깥쪽 반에 치우쳐 잡습니다.', '중지를 실밥에 길게 걸칩니다.', '직구처럼 던지다가 중지로 공 옆면을 긁어 내립니다.'],
    },
  },
  ST: {
    ko: '스위퍼', en: 'Sweeper', color: '#b39cf0', ratio: 0.88,
    fit: [1, 4, 8, 9, 7], diff: 4,
    diffNote: '옆회전을 크게 걸어야 해서 손목 각도와 실밥 방향을 정교하게 맞춰야 합니다.',
    why: {
      OH: '팔 각도가 높아 횡회전을 걸기 어렵습니다.',
      H34: '슬라이더보다 느리지만 훨씬 크게 옆으로 휩니다.',
      L34: '낮은 팔 각도와 잘 맞아 홈플레이트를 가로지르는 큰 횡 변화가 나옵니다.',
      SIDE: '프리스비처럼 옆으로 크게 휘어 같은 손 타자에게 치명적입니다.',
      SUB: '옆으로 크게 휘며 떠오르는 독특한 궤적이 됩니다.',
    },
    grip: {
      view: { polar: 0, az: 0, roll: 122 },
      fingers: [
        { n: '검지', tip: [0.0, 0.76], base: [-0.1, -1.22] },
        { n: '중지', tip: [0.48, 0.66], base: [0.36, -1.2] },
      ],
      thumb: [-0.42, -0.5], curl: true,
      steps: ['투심 그립에서 공을 살짝 돌려 실밥을 비스듬히 둡니다.', '검지·중지를 실밥을 따라 걸치고 약간 벌립니다.', '손등이 옆을 보도록 하고 공 옆면을 쓸어 줍니다.'],
    },
  },
  CU: {
    ko: '커브', en: 'Curveball', color: '#35c9e8', ratio: 0.84,
    fit: [10, 7, 4, 5, 7], diff: 3,
    diffNote: '공 앞쪽으로 톱스핀을 거는 손목 사용법을 익혀야 합니다. 풀리면 밋밋하게 뜹니다.',
    why: {
      OH: '위에서 아래로 뚝 떨어지는 12-6 커브. 오버핸드의 대표 결정구입니다.',
      H34: '대각선으로 떨어지는 커브. 구속 차로 타이밍을 뺏습니다.',
      L34: '낙차는 작고 옆으로 흐르는 슬러브에 가까워집니다.',
      SIDE: '옆으로 크게 도는 프리스비 커브가 됩니다.',
      SUB: '아래에서 위로 솟아오르는 업슛 커브. 잠수함 투수만의 무기입니다.',
    },
    grip: {
      view: { polar: 90, az: 90, roll: 0 },
      fingers: [
        { n: '검지', tip: [0.18, 0.62], base: [0.12, -1.22] },
        { n: '중지', tip: [0.58, 0.56], base: [0.52, -1.18] },
      ],
      thumb: [-0.6, -0.3], curl: true,
      steps: ['말굽 모양 실밥을 세로로 세웁니다.', '중지를 오른쪽 실밥 안쪽에 길게 붙이고 검지는 옆에 가볍게 댑니다.', '엄지는 반대편 실밥에 걸고, 놓을 때 중지로 공을 앞으로 굴립니다.'],
    },
  },
  CH: {
    ko: '체인지업', en: 'Changeup', color: '#3ddc84', ratio: 0.895,
    fit: [6, 8, 8, 8, 6], diff: 4,
    diffNote: '직구와 똑같은 팔 스윙으로 느린 공을 던져야 합니다. 감각을 잡기까지 가장 오래 걸립니다.',
    why: {
      OH: '직구와 같은 궤적에서 속도만 줄어 타이밍을 뺏습니다.',
      H34: '직구처럼 오다가 팔 쪽으로 가라앉아 반대 손 타자에게 효과적입니다.',
      L34: '투심과 같은 방향으로 더 느리게, 더 크게 떨어집니다.',
      SIDE: '반대 손 타자를 상대하려면 꼭 필요한 구종입니다.',
      SUB: '싱커보다 느리게 가라앉아 타이밍을 무너뜨립니다.',
    },
    grip: {
      view: { polar: 0, az: 0, roll: 90 },
      fingers: [
        { n: '중지', tip: [-0.12, 0.74], base: [-0.16, -1.22] },
        { n: '약지', tip: [0.34, 0.66], base: [0.34, -1.2] },
        { n: '새끼', tip: [0.76, 0.2], base: [0.8, -0.95], w: 0.28 },
      ],
      circle: [-0.7, 0.02],
      steps: ['검지와 엄지로 공 옆에 동그라미(OK 모양)를 만듭니다.', '중지·약지를 실밥 위에 올리고 새끼는 옆을 받칩니다.', '공을 손바닥 깊숙이 쥐고 직구와 똑같이 팔을 휘두릅니다.'],
    },
  },
  FS: {
    ko: '스플리터 · 포크', en: 'Splitter / Forkball', color: '#2ec4b6', ratio: 0.92,
    fit: [9, 6, 3, 1, 0], diff: 4,
    diffNote: '손가락을 넓게 벌려야 해서 손이 크고 유연해야 합니다. 팔꿈치 부담도 큰 편입니다.',
    why: {
      OH: '높은 타점에서 직구처럼 오다 홈플레이트 앞에서 뚝 떨어집니다.',
      H34: '직구와 짝을 이루는 헛스윙 유도용 결정구입니다.',
      L34: '팔 각도가 낮아 낙차를 만들기 어렵습니다.',
      SIDE: '팔 각도와 맞지 않습니다.',
      SUB: '팔 각도와 맞지 않습니다.',
    },
    grip: {
      view: { polar: 0, az: 0, roll: 90 },
      fingers: [
        { n: '검지', tip: [-0.66, 0.5], base: [-0.5, -1.2] },
        { n: '중지', tip: [0.66, 0.5], base: [0.5, -1.2] },
      ],
      thumb: [0, -0.68], curl: true,
      steps: ['좁은 실밥 바깥쪽으로 검지·중지를 넓게 벌립니다.', '공을 손가락 사이에 끼우되 손바닥에는 닿지 않게 합니다.', '손목을 고정하고 직구처럼 던져 회전을 죽입니다.'],
    },
  },
};


// 투구 동작: turn = 릴리스 때 전완 회전(+ 회외, − 회내), cue = 릴리스 요령
const MOTION = {
  FF: { turn: 0, cue: '손가락 끝으로 공 뒤를 똑바로 내려 긁어 강한 백스핀을 겁니다.' },
  SI: { turn: -30, cue: '검지 쪽으로 살짝 눌러 주며, 손바닥이 바깥을 향하도록 놓습니다.' },
  FC: { turn: 15, cue: '직구처럼 던지되 중지로 공의 바깥쪽을 살짝 밀어 줍니다.' },
  SL: { turn: 35, cue: '손목을 세운 채 중지로 공 옆면을 자르듯 놓습니다. 손목을 억지로 비틀지 않습니다.' },
  ST: { turn: 55, cue: '손등이 바깥을 향하게 하고 공 옆면을 쓸어 옆회전을 크게 겁니다.' },
  CU: { turn: 75, cue: '엄지가 위를 향하게 손을 세우고, 중지로 공 앞쪽을 끌어내려 톱스핀을 겁니다.' },
  CH: { turn: -50, cue: '직구와 같은 팔 스윙으로 던지며, 놓는 순간 손바닥을 바깥으로 돌려 속도를 줄입니다.' },
  FS: { turn: -10, cue: '손목을 고정한 채 직구처럼 강하게 던지고, 공이 손가락 사이로 빠져나가게 합니다.' },
};
const PHASE_NAMES = ['세트', '레그킥', '스트라이드', '코킹', '릴리스', '팔로스루'];

const DIFF_LABEL = ['', '입문', '쉬움', '보통', '어려움', '매우 어려움'];

/* ───────────── 계산 ───────────── */

const rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vec = (m, deg) => [m * Math.cos(rad(deg)), m * Math.sin(rad(deg))];

function formOf(angle) {
  return FORMS.find(f => angle >= f.min) || FORMS[FORMS.length - 1];
}

// 무브먼트(cm): x+ = 던지는 팔 쪽, y+ = 위(중력 제외)
function movement(id, angle, velo) {
  const phi = 20 + 0.75 * angle;               // 직구 회전축 방향
  const s = 0.8 + 0.2 * clamp((velo - 90) / 50, 0, 1.4);
  const ff = vec(44, phi);
  const cu = vec(40, phi + 180);
  const sinkOff = 15 + 0.2 * angle;
  let m;
  switch (id) {
    case 'FF': m = ff; break;
    case 'SI': m = vec(42, phi - sinkOff); m[1] -= 5; break;
    case 'CH': m = vec(36, phi - sinkOff - 5); m[1] -= 8; break;
    case 'FS': m = vec(22, phi - 35); m[1] -= 10; break;
    case 'FC': m = [ff[0] * 0.5 - 16, ff[1] * 0.5 + 3]; break;
    case 'CU': m = cu; break;
    case 'SL': m = [-10 + cu[0] * 0.35, 3 + cu[1] * 0.35]; break;
    case 'ST': m = [-20 + cu[0] * 0.5, 10 + cu[1] * 0.5]; break;
  }
  return [m[0] * s, m[1] * s];
}

function difficulty(id, formId) {
  let d = PITCHES[id].diff;
  if (id === 'CU' && (formId === 'SIDE' || formId === 'SUB')) d++;
  if (id === 'CU' && formId === 'L34') d++;
  if (id === 'FS' && formId !== 'OH') d++;
  if (id === 'ST' && (formId === 'OH' || formId === 'H34')) d++;
  if (id === 'SI' && formId === 'OH') d++;
  if (id === 'FF' && formId === 'SUB') d++;
  if (id === 'SL' && formId === 'SUB') d++;
  return clamp(d, 1, 5);
}

function rankPitches(form, s) {
  const ix = FORM_IX[form.id];
  const list = Object.keys(PITCHES).map(id => {
    let score = PITCHES[id].fit[ix];
    if (s.velo >= 145) score += ({ FF: 2, SL: 1, FS: 1, FC: 1 })[id] || 0;
    if (s.velo < 125) score += ({ FF: -2, CH: 1.5, CU: 1.5, SI: 1 })[id] || 0;
    if (s.height >= 188 && s.angle >= 45) score += ({ FF: 0.5, CU: 1, FS: 1 })[id] || 0;
    if (s.height < 175 && s.angle < 45) score += ({ FF: 1, ST: 0.5 })[id] || 0;
    return { id, score };
  });
  list.sort((a, b) => b.score - a.score);
  return list.filter(p => p.score >= 4.5).slice(0, 5);
}

function profile(s) {
  const h = s.height / 100;
  const sin = Math.sin(rad(s.angle));
  const release = 0.25 + h * (0.56 + (s.angle < 0 ? 0.5 : 0.36) * sin); // 마운드 높이 포함
  const ext = h * (s.angle < 0 ? 0.97 : 1.0);
  const perceived = s.velo * (18.44 - 1.85) / (18.44 - ext);
  return { release, ext, perceived };
}

/* ───────────── SVG 헬퍼 ───────────── */

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);

/* ───────────── 무브먼트 차트 ───────────── */

function renderChart(s, ranked) {
  const C = 190, R = 150, MAX = 60, k = R / MAX;
  const dir = s.hand === 'R' ? 1 : -1;
  let o = '';
  for (const cm of [20, 40, 60]) {
    o += `<circle cx="${C}" cy="${C}" r="${cm * k}" fill="none" stroke="var(--grid)" stroke-width="1.2"/>`;
    o += `<text x="${C + 4}" y="${C - cm * k + 12}" font-size="10" fill="var(--muted)">${cm}</text>`;
  }
  o += `<line x1="${C - R - 8}" y1="${C}" x2="${C + R + 8}" y2="${C}" stroke="var(--line)" stroke-width="1.5"/>`;
  o += `<line x1="${C}" y1="${C - R - 8}" x2="${C}" y2="${C + R + 8}" stroke="var(--line)" stroke-width="1.5"/>`;
  const lab = 'font-size="11" font-weight="600" fill="var(--muted)"';
  o += `<text x="${C}" y="14" text-anchor="middle" ${lab}>↑ 떠오름</text>`;
  o += `<text x="${C}" y="376" text-anchor="middle" ${lab}>↓ 가라앉음</text>`;
  const armRight = dir === 1;
  o += `<text x="4" y="${C - 8}" ${lab}>← ${armRight ? '글러브 쪽' : '던지는 팔 쪽'}</text>`;
  o += `<text x="376" y="${C - 8}" text-anchor="end" ${lab}>${armRight ? '던지는 팔 쪽' : '글러브 쪽'} →</text>`;

  for (const p of ranked) {
    const pt = PITCHES[p.id];
    const [mx, my] = p.move;
    const x = C + dir * clamp(mx, -MAX, MAX) * k, y = C - clamp(my, -MAX, MAX) * k;
    const len = Math.hypot(x - C, y - C) || 1;
    const ux = (x - C) / len, uy = (y - C) / len;
    const lx = x + ux * 21, ly = y + uy * 21 + 4;
    o += `<g class="pt" data-id="${p.id}">`;
    o += `<line x1="${C}" y1="${C}" x2="${f1(x)}" y2="${f1(y)}" stroke="${pt.color}" stroke-width="2.5" opacity=".45"/>`;
    o += `<circle class="dot" cx="${f1(x)}" cy="${f1(y)}" r="11" fill="${pt.color}" stroke="var(--panel)" stroke-width="2"/>`;
    o += `<text x="${f1(lx)}" y="${f1(ly)}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink)" stroke="var(--panel)" stroke-width="3" paint-order="stroke">${pt.ko.split(' ')[0]}</text>`;
    o += `</g>`;
  }
  o += `<circle cx="${C}" cy="${C}" r="3" fill="var(--ink)"/>`;
  document.getElementById('chart').innerHTML = o;
}

/* ───────────── 그립 그림 ───────────── */

// 야구공 실밥 곡선 (단위 구 위)
function seamPoint(t) {
  const a = 0.4;
  const th = Math.PI / 2 - (Math.PI / 2 - a) * Math.cos(t);
  const ph = t / 2 + a * Math.sin(2 * t);
  return [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function seamSvg(view, mirror) {
  const z = [Math.sin(rad(view.polar)) * Math.cos(rad(view.az)), Math.sin(rad(view.polar)) * Math.sin(rad(view.az)), Math.cos(rad(view.polar))];
  const ref = Math.abs(z[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
  let x = norm(cross(ref, z));
  let y = cross(z, x);
  const c = Math.cos(rad(view.roll)), sn = Math.sin(rad(view.roll));
  const xr = [x[0] * c + y[0] * sn, x[1] * c + y[1] * sn, x[2] * c + y[2] * sn];
  const yr = [y[0] * c - x[0] * sn, y[1] * c - x[1] * sn, y[2] * c - x[2] * sn];
  const proj = p => [mirror * dot(p, xr) * 100, -dot(p, yr) * 100, dot(p, z)];

  const N = 220;
  let path = '', pen = false, st = '';
  for (let i = 0; i <= N; i++) {
    const t = i / N * 4 * Math.PI;
    const p = seamPoint(t);
    const q = proj(p);
    if (q[2] > 0.02) {
      path += `${pen ? 'L' : 'M'}${f1(q[0])} ${f1(q[1])}`;
      pen = true;
      if (i % 2 === 0) {
        const tan = norm(seamPoint(t + 0.01).map((v, j) => v - p[j]));
        const perp = norm(cross(p, tan));
        const w = 0.085, sk = 0.035;
        const a = proj(p.map((v, j) => v + perp[j] * w + tan[j] * sk));
        const b = proj(p.map((v, j) => v - perp[j] * w + tan[j] * sk));
        st += `M${f1(a[0])} ${f1(a[1])}L${f1(q[0])} ${f1(q[1])}L${f1(b[0])} ${f1(b[1])}`;
      }
    } else pen = false;
  }
  return `<path d="${st}" fill="none" stroke="#c8102e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
         `<path d="${path}" fill="none" stroke="#c8102e" stroke-width="1" opacity=".55"/>`;
}

function gripSvg(id, hand) {
  const g = PITCHES[id].grip;
  const m = hand === 'R' ? 1 : -1;
  const X = v => f1(m * v * 100), Y = v => f1(-v * 100);
  let o = `<svg viewBox="-150 -128 300 290" role="img" aria-label="${esc(PITCHES[id].ko)} 그립">`;
  o += `<defs><clipPath id="ball-${id}"><circle r="100"/></clipPath>`;
  o += `<radialGradient id="shade-${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#cfc6b2" stop-opacity=".55"/></radialGradient></defs>`;
  o += `<circle r="100" fill="var(--ball)"/><circle r="100" fill="url(#shade-${id})"/>`;
  o += `<g clip-path="url(#ball-${id})">${seamSvg(g.view, m)}</g>`;
  o += `<circle r="100" fill="none" stroke="var(--ball-edge)" stroke-width="2"/>`;

  // 엄지 (공 아래쪽)
  if (g.thumb) {
    o += `<ellipse cx="${X(g.thumb[0])}" cy="${Y(g.thumb[1])}" rx="19" ry="24" fill="var(--skin)" fill-opacity=".25" stroke="var(--skin-edge)" stroke-width="2" stroke-dasharray="5 4"/>`;
    o += `<text x="${X(g.thumb[0])}" y="${f1(-g.thumb[1] * 100 + 4)}" text-anchor="middle" font-size="12" font-weight="700" fill="#7a4f2c">엄지</text>`;
  }
  // 약지·새끼 (옆에서 받침)
  if (g.curl) {
    o += `<path d="M${X(0.86)} ${Y(-0.62)} Q${X(1.16)} ${Y(-0.3)} ${X(0.98)} ${Y(0.02)}" fill="none" stroke="var(--skin-edge)" stroke-width="30" stroke-linecap="round"/>`;
    o += `<path d="M${X(0.86)} ${Y(-0.62)} Q${X(1.16)} ${Y(-0.3)} ${X(0.98)} ${Y(0.02)}" fill="none" stroke="var(--skin)" stroke-width="26" stroke-linecap="round"/>`;
  }
  // 체인지업 서클 (검지+엄지)
  if (g.circle) {
    o += `<circle cx="${X(g.circle[0])}" cy="${Y(g.circle[1])}" r="27" fill="none" stroke="var(--skin-edge)" stroke-width="24"/>`;
    o += `<circle cx="${X(g.circle[0])}" cy="${Y(g.circle[1])}" r="27" fill="none" stroke="var(--skin)" stroke-width="20"/>`;
    o += `<text x="${X(g.circle[0])}" y="${f1(-g.circle[1] * 100 + 58)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">검지+엄지</text>`;
  }
  for (const f of g.fingers) {
    const w = (f.w || 0.34) * 100;
    const d = `M${X(f.base[0])} ${Y(f.base[1])} L${X(f.tip[0])} ${Y(f.tip[1])}`;
    o += `<path d="${d}" stroke="var(--skin-edge)" stroke-width="${w + 4}" stroke-linecap="round" opacity=".9"/>`;
    o += `<path d="${d}" stroke="var(--skin)" stroke-width="${w}" stroke-linecap="round" opacity=".78"/>`;
    // 손끝 압점
    o += `<circle cx="${X(f.tip[0])}" cy="${Y(f.tip[1])}" r="7" fill="#c8102e" stroke="#fff" stroke-width="2"/>`;
    o += `<text x="${X(f.base[0])}" y="${f1(-f.base[1] * 100 + 34)}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${f.n}</text>`;
  }
  // 실밥은 손가락 위로도 살짝 보이게
  o += `<g clip-path="url(#ball-${id})" opacity=".35">${seamSvg(g.view, m)}</g>`;
  o += `</svg>`;
  return o;
}

/* ───────────── 렌더 ───────────── */

const state = { angle: 50, height: 180, velo: 135, hand: 'R' };
let activePitch = null;
let screen = 0;
let lastRanked = [];
let watching = null;
let slow = false;
let stageOk = false;

function moveText(mx, my) {
  const ax = Math.abs(mx), ay = Math.abs(my);
  const hx = ax < 5 ? '좌우 변화 거의 없음' : `${mx > 0 ? '던지는 팔 쪽' : '글러브 쪽'} ${Math.round(ax)}cm`;
  const vy = ay < 5 ? '상하 변화 거의 없음' : `${my > 0 ? '위로' : '아래로'} ${Math.round(ay)}cm`;
  return [hx, vy];
}

const $ = id => document.getElementById(id);

function render() {
  const s = state;
  const form = formOf(s.angle);
  const ranked = rankPitches(form, s).map(p => ({ ...p, move: movement(p.id, s.angle, s.velo) }));
  if (!ranked.some(p => p.id === activePitch)) activePitch = null;
  lastRanked = ranked;
  if (stageOk) Stage.setPitcher({ angle: s.angle, hand: s.hand, height: s.height });

  $('angleOut').textContent = `${s.angle}°`;
  $('heightOut').textContent = `${s.height} cm`;
  $('veloOut').textContent = `${s.velo} km/h`;
  const handKo = s.hand === 'R' ? '우투' : '좌투';
  for (const chip of document.querySelectorAll('.form-chip')) {
    chip.textContent = `${handKo} · ${s.angle}°`;
    chip.style.background = form.color;
  }
  for (const el of document.querySelectorAll('.form-name')) el.textContent = form.name;
  for (const el of document.querySelectorAll('.form-desc')) el.textContent = form.desc;
  $('summary').textContent = `${s.height}cm · 평균 ${s.velo}km/h`;

  // 프로필
  const pr = profile(s);
  const stats =
    `<div><dt>릴리스 높이</dt><dd>${pr.release.toFixed(2)}<small>m</small></dd></div>` +
    `<div><dt>익스텐션</dt><dd>${pr.ext.toFixed(2)}<small>m</small></dd></div>` +
    `<div><dt>체감 구속</dt><dd>${Math.round(pr.perceived)}<small>km/h</small></dd></div>`;
  for (const el of document.querySelectorAll('.stats')) el.innerHTML = stats;

  const notes = [['good', form.good], ['warn', form.warn]];
  if (s.height >= 188 && s.angle >= 45) notes.push(['tip', '키가 커서 타점이 높습니다. 내리꽂는 각도를 살리는 커브·스플리터의 가치가 올라갑니다.']);
  else if (s.height >= 188) notes.push(['tip', '키가 커서 익스텐션이 깁니다. 공을 타자 가까이에서 놓아 체감 구속이 빨라집니다.']);
  else if (s.height < 175 && s.angle < 45) notes.push(['tip', '릴리스 지점이 낮아 높은 코스 직구가 떠오르는 것처럼 보입니다. 하이 패스트볼을 적극 활용하세요.']);
  else if (s.height < 175) notes.push(['tip', '타점이 낮은 편이라 각도보다는 회전과 로케이션으로 승부하는 편이 좋습니다.']);
  if (s.velo >= 145) notes.push(['tip', '구속이 빠릅니다. 직구 비중을 높이고 빠른 변화구(슬라이더·커터·스플리터)로 힘 대 힘 승부가 가능합니다.']);
  else if (s.velo < 125) notes.push(['tip', '구속보다 완급과 무브먼트가 중요합니다. 느린 변화구와 가라앉는 공의 우선순위를 높였습니다.']);
  else notes.push(['tip', '평균적인 구속대입니다. 직구와 구속 차가 큰 변화구 하나를 확실한 결정구로 만드세요.']);
  $('notes').innerHTML = notes.map(n => `<li class="${n[0]}">${esc(n[1])}</li>`).join('');
  $('players').textContent = `이 유형의 대표 투수: ${form.players}`;

  renderChart(s, ranked);

  // 구종 카드
  $('cards').innerHTML = ranked.map((p, i) => {
    const pt = PITCHES[p.id];
    const v = s.velo * pt.ratio;
    const d = difficulty(p.id, form.id);
    const [hx, vy] = moveText(p.move[0], p.move[1]);
    const role = i === 0 ? '<span class="role main">주무기</span>' : i < 3 ? '<span class="role">핵심 구종</span>' : '<span class="role">보조 구종</span>';
    const bars = [1, 2, 3, 4, 5].map(n => `<i class="${n <= d ? 'on' : ''}"></i>`).join('');
    return `<article class="card" tabindex="0" data-id="${p.id}" style="--c:${pt.color}">
      <div class="card-head">
        <span class="abbr">${p.id}</span>
        <div><h4>${pt.ko}</h4><span class="en">${pt.en}</span></div>
        ${role}
      </div>
      <p class="why">${esc(pt.why[form.id])}</p>
      <div class="metrics">
        <div class="metric"><div class="k">예상 구속</div><div class="v">${Math.round(v)} <small>km/h</small></div><div class="s">${Math.round(v - 3)}~${Math.round(v + 3)} km/h</div></div>
        <div class="metric"><div class="k">무브먼트</div><div class="mv">${hx}</div><div class="mv">${vy}</div></div>
      </div>
      <div class="diff">
        <div class="diff-row"><span>난이도</span><span class="bars" aria-hidden="true">${bars}</span><span>${DIFF_LABEL[d]}</span></div>
        <p>${esc(pt.diffNote)}</p>
      </div>
      <button type="button" class="btn watch" data-watch="${p.id}">▶ 투구 폼 보기</button>
      <div class="grip">
        ${gripSvg(p.id, s.hand)}
        <div><h5>그립 잡는 법</h5><ol>${pt.grip.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
      </div>
    </article>`;
  }).join('');
  applyActive();
}

function applyActive() {
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('active', c.dataset.id === activePitch));
  document.querySelectorAll('#chart .pt').forEach(g => {
    const on = !activePitch || g.dataset.id === activePitch;
    g.setAttribute('opacity', on ? 1 : 0.22);
  });
}

/* ───────────── 화면 전환 ───────────── */

// 화면별 3D 모델 위치: sx/sy = 화면 폭·높이 대비 이동량, dist = 카메라 거리
function stageLayout(sc, w, h) {
  const wide = w >= 900 && w > h;
  const table = wide
    ? [{ sx: 0.2, sy: 0, dist: 5.0 }, { sx: -0.2, sy: 0.02, dist: 5.6 }, { sx: -0.2, sy: 0.02, dist: 5.6 }, { sx: -0.31, sy: 0, dist: 6.4 }, { sx: -0.17, sy: 0.04, dist: 8.2 }]
    : [{ sx: 0, sy: -0.03, dist: 6.6 }, { sx: 0, sy: 0.25, dist: 11 }, { sx: 0, sy: 0.25, dist: 11 }, { sx: 0, sy: 0.3, dist: 12 }, { sx: 0.04, sy: 0.27, dist: 13.5 }];
  return table[sc];
}

function goTo(n) {
  const prev = screen;
  screen = n;
  document.body.dataset.screen = n;
  document.querySelectorAll('.screen').forEach(el => {
    const on = +el.dataset.screen === n;
    el.classList.toggle('active', on);
    el.inert = !on;
  });
  if (n === 3 && prev !== 4) $('s3').scrollTop = 0;
  if (n !== 4) watching = null;
  if (stageOk) Stage.goTo(n);
}

/* ───────────── 투구 동작 화면 ───────────── */

function openMotion(id) {
  const p = lastRanked.find(x => x.id === id) || lastRanked[0];
  if (!p) return;
  const pt = PITCHES[p.id], mo = MOTION[p.id];
  const v = Math.round(state.velo * pt.ratio);
  const [hx, vy] = moveText(p.move[0], p.move[1]);
  watching = p.id;
  $('s4').style.setProperty('--c', pt.color);
  $('mAbbr').textContent = p.id;
  $('mName').textContent = pt.ko;
  $('mSub').textContent = `${formOf(state.angle).name} · 약 ${v}km/h · ${hx}, ${vy}`;
  $('mCue').textContent = mo.cue;
  $('mChips').innerHTML = lastRanked.map(x =>
    `<button type="button" class="chip" data-pitch="${x.id}" aria-pressed="${x.id === p.id}" style="--c:${PITCHES[x.id].color}">${PITCHES[x.id].ko.split(' ')[0]}</button>`).join('');
  setPhase(0);
  if (screen !== 4) goTo(4);
  if (stageOk) {
    Stage.setSpeed(slow ? 0.35 : 1);
    Stage.playPitch({ turn: mo.turn, mx: p.move[0], my: p.move[1], color: pt.color, velo: v }, setPhase);
  }
}

function setPhase(i) {
  document.querySelectorAll('#phases li').forEach((li, j) => {
    li.classList.toggle('on', j === i);
    li.classList.toggle('done', j < i);
  });
}

function init() {
  for (const key of ['angle', 'height', 'velo']) {
    $(key).addEventListener('input', e => { state[key] = +e.target.value; render(); });
  }
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    state.hand = b.dataset.hand;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-checked', x === b));
    render();
  }));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.go)));

  const cards = $('cards');
  const toggle = el => {
    const card = el.closest('.card');
    if (!card) return;
    activePitch = activePitch === card.dataset.id ? null : card.dataset.id;
    applyActive();
  };
  cards.addEventListener('click', e => {
    const w = e.target.closest('[data-watch]');
    if (w) { openMotion(w.dataset.watch); return; }
    toggle(e.target);
  });
  $('mChips').addEventListener('click', e => {
    const c = e.target.closest('[data-pitch]');
    if (c) openMotion(c.dataset.pitch);
  });
  $('mReplay').addEventListener('click', () => { if (stageOk) Stage.replay(); setPhase(0); });
  $('mSlow').addEventListener('click', () => {
    slow = !slow;
    $('mSlow').setAttribute('aria-pressed', slow);
    if (stageOk) Stage.setSpeed(slow ? 0.35 : 1);
  });
  $('phases').innerHTML = PHASE_NAMES.map(n => `<li>${n}</li>`).join('');
  cards.addEventListener('keydown', e => { if (e.target.closest('button')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e.target); } });

  render();
  goTo(0);

  // 3D 모델 (WebGL을 못 쓰는 환경에서는 모델 없이 동작)
  try {
    Stage.init($('stage'), window.PITCHER_MODEL_B64, stageLayout).then(() => {
      stageOk = true;
      document.body.classList.add('stage-ready');
      Stage.setPitcher({ angle: state.angle, hand: state.hand, height: state.height });
      Stage.goTo(screen);
    }).catch(() => document.body.classList.add('no-stage'));
  } catch (e) {
    document.body.classList.add('no-stage');
  }
}
init();
