// 3D 투수 모델 스테이지: 포즈(팔 각도), 회전 전환, 카메라 구도
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ZONES = [
  { id: 'OH', min: 65, max: 90, color: 0xff5470 },
  { id: 'H34', min: 45, max: 65, color: 0xffa23a },
  { id: 'L34', min: 20, max: 45, color: 0xf2d34b },
  { id: 'SIDE', min: -10, max: 20, color: 0x4fd18b },
  { id: 'SUB', min: -45, max: -10, color: 0x5fb4ff },
];

let renderer, scene, camera, pivot, model, gauge, clock;
let bones = {}, rest = new Map(), target = new Map();
let footOffset = 0, footTarget = 0;
let ready = false;

const state = { angle: 50, hand: 'R', height: 180, pose: 'stand', screen: 0 };
const view = { sx: 0, sy: 0, dist: 5.5, rot: 0.35, gauge: 0 };
const goal = { sx: 0, sy: 0, dist: 5.5, rot: 0.35, gauge: 0 };
let layoutFn = () => ({ sx: 0, sy: 0, dist: 5.5 });

const ROT = [0.4, Math.PI, Math.PI + 2.2, Math.PI * 3, Math.PI * 4 + 0.5];
const POSE = ['stand', 'pitch', 'pitch', 'pitch', 'pitch'];

function bone(name) { return bones['mixamorig' + name]; }

const _a = V(0, 0, 0), _b = V(0, 0, 0), _q = new THREE.Quaternion(), _bw = new THREE.Quaternion(), _pw = new THREE.Quaternion();

function applyWorld(b, qd) {
  b.getWorldQuaternion(_bw);
  b.parent.getWorldQuaternion(_pw);
  b.quaternion.copy(_pw.invert().multiply(qd).multiply(_bw));
  b.updateMatrixWorld(true);
}
function aim(name, childName, dir) {
  const b = bone(name), c = bone(childName);
  if (!b || !c) return;
  b.getWorldPosition(_a); c.getWorldPosition(_b);
  _b.sub(_a).normalize();
  _q.setFromUnitVectors(_b, dir.clone().normalize());
  applyWorld(b, _q);
}
function twist(name, axis, deg) {
  const b = bone(name);
  if (!b) return;
  _q.setFromAxisAngle(axis, rad(deg));
  applyWorld(b, _q);
}

// 모델 기준 축: 정면 +Z, 위 +Y, 투수의 오른쪽 -X
const F = V(0, 0, 1), U = V(0, 1, 0), X = V(1, 0, 0);

function poseStand() {
  aim('RightArm', 'RightForeArm', V(-0.2, -1, 0.02));
  aim('RightForeArm', 'RightHand', V(-0.12, -1, 0.22));
  aim('LeftArm', 'LeftForeArm', V(0.2, -1, 0.02));
  aim('LeftForeArm', 'LeftHand', V(0.12, -1, 0.22));
}

function posePitch(angle) {
  const lean = clamp((angle - 20) * 0.36, -24, 26);      // + = 글러브 쪽으로 기울임
  const bend = angle < 0 ? 18 + (-angle) * 0.75 : 18;     // 앞으로 숙임 (언더일수록 깊게)
  twist('Hips', U, 12);
  twist('Spine', F, -lean * 0.5);
  twist('Spine', X, bend * 0.55);
  twist('Spine1', F, -lean * 0.5);
  twist('Spine1', X, bend * 0.45);
  twist('Spine2', U, 14);
  twist('Neck', F, lean * 0.75);
  twist('Neck', X, -bend * 0.6);

  const c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
  aim('RightArm', 'RightForeArm', V(-c, s, 0.3));
  aim('RightForeArm', 'RightHand', V(-c, s, 0.55));
  aim('RightHand', 'RightHandMiddle1', V(-c * 0.8, s * 0.8, 0.9));

  aim('LeftArm', 'LeftForeArm', V(0.42, -0.85, 0.2));
  aim('LeftForeArm', 'LeftHand', V(-0.55, 0.55, 0.5));

  aim('LeftUpLeg', 'LeftLeg', V(0.12, -0.72, 0.68));
  aim('LeftLeg', 'LeftFoot', V(0.02, -1, 0.02));
  aim('RightUpLeg', 'RightLeg', V(-0.14, -0.9, -0.38));
  aim('RightLeg', 'RightFoot', V(-0.05, -0.62, -0.78));
  aim('RightFoot', 'RightToeBase', V(0, -0.9, -0.3));
}

// 포즈 계산: 본을 잠시 기본 자세(피벗 변환 없음)로 되돌려 poseFn을 적용한 뒤 결과를 저장하고 현재 자세로 복원
function computePose(poseFn) {
  const savedQ = new Map();
  for (const [b] of rest) savedQ.set(b, b.quaternion.clone());
  const pr = pivot.rotation.y, ps = pivot.scale.clone(), py = model.position.y;
  pivot.rotation.y = 0; pivot.scale.set(1, 1, 1); model.position.y = 0;
  for (const [b, q] of rest) b.quaternion.copy(q);
  pivot.updateMatrixWorld(true);

  poseFn();
  pivot.updateMatrixWorld(true);

  const quats = new Map();
  for (const [b] of rest) quats.set(b, b.quaternion.clone());
  // 발이 땅에 닿도록 높이 보정
  let low = Infinity;
  for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) {
    const b = bone(n); if (b) low = Math.min(low, b.getWorldPosition(_a).y);
  }
  const foot = -(low - footBase);
  const sh = bone('RightArm').getWorldPosition(V(0, 0, 0));

  for (const [b, q] of savedQ) b.quaternion.copy(q);
  pivot.rotation.y = pr; pivot.scale.copy(ps); model.position.y = py;
  pivot.updateMatrixWorld(true);
  return { quats, foot, sh };
}

function computeTarget() {
  if (!ready) return;
  const p = computePose(state.pose === 'pitch' ? () => posePitch(state.angle) : poseStand);
  target = p.quats;
  footTarget = p.foot;
  if (gauge) gauge.userData.goal = p.sh;
}
let footBase = 0;


/* ───────────── 우투 ↔ 좌투 전환 ───────────── */
// 좌우 대칭 자세(양손을 가슴 앞에 모아 글러브를 바꿔 끼는 동작). 모델이 좌우 대칭이라
// 이 자세에서 좌우를 반전하면 눈에 띄지 않으므로, 살짝 뛰어오르는 순간에 반전합니다.
function poseSwap() {
  twist('Spine', X, 6);
  twist('Spine1', X, 6);
  twist('Neck', X, 14);
  aim('LeftUpLeg', 'LeftLeg', V(0.12, -1, 0.14)); aim('LeftLeg', 'LeftFoot', V(0.03, -1, -0.12));
  aim('RightUpLeg', 'RightLeg', V(-0.12, -1, 0.14)); aim('RightLeg', 'RightFoot', V(-0.03, -1, -0.12));
  aim('LeftFoot', 'LeftToeBase', V(0.06, -0.3, 1)); aim('RightFoot', 'RightToeBase', V(-0.06, -0.3, 1));
  aim('RightArm', 'RightForeArm', V(-0.3, -1, 0.3)); aim('RightForeArm', 'RightHand', V(0.6, 0.42, 0.68));
  aim('LeftArm', 'LeftForeArm', V(0.3, -1, 0.3)); aim('LeftForeArm', 'LeftHand', V(-0.6, 0.42, 0.68));
}

const SWAP_IN = 0.42, SWAP_HOP = 0.26, SWAP_OUT = 0.5;
let swap = null, sign = 1, scaleMag = 1;

function startSwap(newSign) {
  const from = new Map();
  for (const [b] of rest) from.set(b, b.quaternion.clone());
  const mid = computePose(poseSwap);
  swap = { t: 0, from, fromFoot: footOffset, mid, sign: newSign, flipped: false };
}

function stepSwap(dt) {
  const w = swap;
  w.t += dt;
  const t = w.t;
  let hop = 0;
  if (t < SWAP_IN) {
    const e = smooth(t / SWAP_IN);
    for (const [b, q] of w.mid.quats) b.quaternion.slerpQuaternions(w.from.get(b), q, e);
    footOffset = w.fromFoot + (w.mid.foot - w.fromFoot) * e;
  } else if (t < SWAP_IN + SWAP_HOP) {
    for (const [b, q] of w.mid.quats) b.quaternion.copy(q);
    footOffset = w.mid.foot;
    const u = (t - SWAP_IN) / SWAP_HOP;
    hop = Math.sin(Math.PI * u) * 0.09;
    if (!w.flipped && u >= 0.5) { w.flipped = true; sign = w.sign; }
  } else {
    if (!w.flipped) { w.flipped = true; sign = w.sign; }
    const e = smooth(clamp((t - SWAP_IN - SWAP_HOP) / SWAP_OUT, 0, 1));
    for (const [b, q] of w.mid.quats) b.quaternion.slerpQuaternions(q, target.get(b), e);
    footOffset = w.mid.foot + (footTarget - w.mid.foot) * e;
    if (e >= 1) swap = null;
  }
  model.position.y = footOffset + hop;
}

// 전환 중 각도 게이지를 잠시 숨김 (0~1)
function swapFade() {
  if (!swap) return 1;
  const t = swap.t;
  if (t < SWAP_IN) return 1 - t / SWAP_IN;
  if (t < SWAP_IN + SWAP_HOP) return 0;
  return clamp((t - SWAP_IN - SWAP_HOP) / SWAP_OUT, 0, 1);
}

/* ───────────── 투구 동작 ───────────── */
// 좌표: 홈플레이트 방향 +Z, 투수의 오른쪽(던지는 팔 쪽) -X, 위 +Y. 좌투는 피벗을 좌우 반전해 처리

const yawV = (v, deg) => v.clone().applyAxisAngle(U, rad(deg));
const leanOf = a => clamp((a - 20) * 0.36, -24, 26);

function trunk(yaw, bend, lean) {
  twist('Hips', U, yaw * 0.6);
  twist('Spine', U, yaw * 0.2);
  twist('Spine1', U, yaw * 0.2);
  const lat = yawV(X, yaw), fwd = yawV(F, yaw);
  twist('Spine', lat, bend * 0.5);
  twist('Spine1', lat, bend * 0.5);
  twist('Spine', fwd, -lean * 0.5);
  twist('Spine1', fwd, -lean * 0.5);
  twist('Neck', fwd, lean * 0.7);
  twist('Neck', lat, -bend * 0.6);
}
function legs(lu, ll, ru, rl, lf, rf) {
  aim('LeftUpLeg', 'LeftLeg', lu); aim('LeftLeg', 'LeftFoot', ll);
  aim('RightUpLeg', 'RightLeg', ru); aim('RightLeg', 'RightFoot', rl);
  if (lf) aim('LeftFoot', 'LeftToeBase', lf);
  if (rf) aim('RightFoot', 'RightToeBase', rf);
}
function armR(upper, fore) { aim('RightArm', 'RightForeArm', upper); aim('RightForeArm', 'RightHand', fore); }
function armL(upper, fore) { aim('LeftArm', 'LeftForeArm', upper); aim('LeftForeArm', 'LeftHand', fore); }
// 전완을 자기 축으로 회전: 양수 = 회외(엄지가 바깥/위), 음수 = 회내(손바닥이 바깥)
function forearmTurn(deg) {
  const f = bone('RightForeArm'), h = bone('RightHand');
  const axis = h.getWorldPosition(V(0, 0, 0)).sub(f.getWorldPosition(V(0, 0, 0))).normalize();
  twist('RightForeArm', axis, deg);
}
function handsAtChest(yaw) {
  armR(yawV(V(-0.35, -1, 0.12), yaw + 90), yawV(V(-0.55, 0.45, 0.75), yaw + 90));
  armL(yawV(V(-0.35, -1, -0.12), yaw + 90), yawV(V(-0.55, 0.45, -0.75), yaw + 90));
}

const KEYS = {
  set() {
    trunk(-90, 4, 0);
    legs(V(0, -1, 0.14), V(0, -1, 0.02), V(0, -1, -0.14), V(0, -1, -0.02), V(-1, -0.25, 0), V(-1, -0.25, 0));
    handsAtChest(-90);
  },
  lift() {
    trunk(-105, -2, 0);
    legs(V(-0.85, 0.3, 0.05), V(-0.15, -1, 0.12), V(0.02, -1, -0.05), V(0.04, -1, 0), V(-0.3, -1, 0.25), V(-1, -0.25, 0));
    handsAtChest(-105);
  },
  stride() {
    trunk(-85, -6, 0);
    legs(V(-0.05, -0.5, 0.86), V(0, -0.92, 0.38), V(-0.08, -0.75, -0.62), V(0, -0.85, -0.45), V(0, -0.35, 1), V(-1, -0.3, 0));
    armR(V(0.05, -0.4, -1), V(0, -0.15, -1));
    armL(V(0, 0.12, 1), V(0, 0.25, 1));
  },
  cock(angle) {
    const yaw = -45, c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
    trunk(yaw, -4, leanOf(angle) * 0.5);
    legs(V(0.05, -0.62, 0.78), V(0, -1, 0.05), V(-0.08, -0.76, -0.64), V(0, -0.78, -0.62), V(0, -0.3, 1), V(-0.6, -0.7, -0.3));
    const R = yawV(V(-1, 0, 0), yaw), B = yawV(V(0, 0, -1), yaw);
    const upper = R.clone().multiplyScalar(c).add(U.clone().multiplyScalar(s));
    const P = U.clone().multiplyScalar(c).sub(R.clone().multiplyScalar(s));
    armR(upper, B.clone().multiplyScalar(0.85).add(P.multiplyScalar(0.55)));
    armL(V(0.15, 0.05, 1), V(0.45, 0.15, 0.8));
  },
  release(angle, turn) {
    const c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
    const bend = 22 + (angle < 0 ? -angle * 0.7 : 0);
    trunk(0, bend, leanOf(angle));
    legs(V(0.12, -0.72, 0.68), V(0.02, -1, 0.02), V(-0.14, -0.9, -0.38), V(-0.05, -0.62, -0.78), V(0, -0.3, 1), V(0, -0.9, -0.3));
    armR(V(-c, s, 0.4), V(-c * 0.7, s * 0.7, 0.85));
    aim('RightHand', 'RightHandMiddle1', V(-c * 0.5, s * 0.5, 1));
    forearmTurn(turn);
    armL(V(0.42, -0.85, 0.2), V(-0.55, 0.55, 0.5));
  },
  follow(angle, turn) {
    const under = angle < 0 ? -angle * 0.4 : 0;
    trunk(25, 45 + under, leanOf(angle) * 0.3);
    legs(V(0.05, -0.62, 0.78), V(0, -1, -0.04), V(-0.1, -0.4, -0.9), V(0, 0.2, -1), V(0, -0.3, 1), V(0, 0.4, -1));
    armR(V(0.5, -0.75, 0.45), V(0.8, -0.5, 0.05));
    forearmTurn(turn * 0.6);
    armL(V(0.35, -0.9, -0.15), V(0.15, -0.35, -0.9));
  },
};

// 시간(초, 1배속 기준)과 구간 이름
const TIMELINE = [
  { t: 0.0, key: 'set' }, { t: 0.4, key: 'set' }, { t: 0.95, key: 'lift' }, { t: 1.4, key: 'stride' },
  { t: 1.62, key: 'cock' }, { t: 1.74, key: 'release' }, { t: 2.15, key: 'follow' }, { t: 3.1, key: 'follow' }, { t: 3.7, key: 'set' },
];
const PHASES = [0, 0.4, 0.95, 1.5, 1.7, 1.9]; // 세트, 레그킥, 스트라이드, 코킹, 릴리스, 팔로스루 시작 시각
const RELEASE_T = 1.74;
const FLIGHT_D = 3.2;      // 공이 날아가는 거리(모델 좌표, m)
const BREAK_K = 0.022;     // 무브먼트 1cm당 표시 이동량(m) — 과장 표시

let motion = null, fx = null, ball = null, dots = [], refLine = null, speed = 1;

function buildFx() {
  fx = new THREE.Group();
  fx.visible = false;
  ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: 0x223355, emissiveIntensity: 0.3 }));
  ball.castShadow = true;
  fx.add(ball);
  for (let i = 0; i < 36; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    fx.add(d); dots.push(d);
  }
  const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 1)]);
  refLine = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0x9fc4ff, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0 }));
  fx.add(refLine);
  pivot.add(fx);
}

const smooth = x => x * x * (3 - 2 * x);

function handWorld() {
  const h = bone('RightHand').getWorldPosition(V(0, 0, 0));
  const m = (bone('RightHandMiddle2') || bone('RightHandMiddle1')).getWorldPosition(V(0, 0, 0));
  return h.lerp(m, 0.85);
}

function pathAt(u) {
  const m = motion;
  const p = m.p0.clone().lerp(m.end, u);
  return p.add(m.brk.clone().multiplyScalar(u * u));
}

function stepMotion(dt) {
  const m = motion;
  m.time += dt * speed;
  let t = m.time;
  const keys = m.keys, last = keys[keys.length - 1];
  if (t >= last.t) { m.time = t = 0; resetFlight(); }

  if (t < 0) {
    const e = smooth((t + 0.5) / 0.5);
    for (const [b, q] of keys[0].quats) b.quaternion.slerpQuaternions(m.from.get(b), q, e);
    footOffset = m.fromFoot + (keys[0].foot - m.fromFoot) * e;
  } else {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const A = keys[i], Bk = keys[i + 1];
    const e = smooth(clamp((t - A.t) / (Bk.t - A.t), 0, 1));
    for (const [b, q] of A.quats) b.quaternion.slerpQuaternions(q, Bk.quats.get(b), e);
    footOffset = A.foot + (Bk.foot - A.foot) * e;
  }
  model.position.y = footOffset;
  pivot.updateMatrixWorld(true);

  // 구간 알림
  let ph = 0;
  while (ph < PHASES.length - 1 && t >= PHASES[ph + 1]) ph++;
  if (t < 0) ph = 0;
  if (ph !== m.phase) { m.phase = ph; if (m.onPhase) m.onPhase(ph); }

  // 공
  if (t < RELEASE_T) {
    ball.visible = true;
    ball.position.copy(fx.worldToLocal(handWorld()));
  } else {
    if (!m.released) {
      m.released = true;
      m.p0 = fx.worldToLocal(handWorld());
      m.end = V(m.p0.x * 0.4, 0.95, m.p0.z + FLIGHT_D);
      m.brk = V(-m.opts.mx * BREAK_K, m.opts.my * BREAK_K, 0);
      refLine.geometry.setFromPoints([m.p0, m.end]);
      refLine.computeLineDistances();
    }
    const u = clamp((t - RELEASE_T) / m.flight, 0, 1);
    ball.visible = u < 1;
    ball.position.copy(pathAt(u));
    const fade = clamp((last.t - 0.35 - t) / 0.5, 0, 1);
    for (let i = 0; i < dots.length; i++) {
      const ui = u * i / (dots.length - 1);
      dots[i].position.copy(pathAt(ui));
      dots[i].material.opacity = 0.85 * fade * (0.35 + 0.65 * i / dots.length);
    }
    refLine.material.opacity = 0.55 * fade * clamp(u * 3, 0, 1);
  }
}

function resetFlight() {
  if (!motion) return;
  motion.released = false;
  for (const d of dots) d.material.opacity = 0;
  refLine.material.opacity = 0;
}

function buildGauge(armLen) {
  gauge = new THREE.Group();
  const r = armLen * 1.22;
  for (const z of ZONES) {
    const geo = new THREE.TorusGeometry(r, 0.018, 8, 40, rad(z.max - z.min - 3));
    const mat = new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.z = rad(z.min + 1.5);
    m.userData.zone = z;
    gauge.add(m);
  }
  // 수평 기준선
  const line = new THREE.Mesh(new THREE.BoxGeometry(r * 0.95, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0 }));
  line.position.x = r * 0.5;
  line.userData.line = true;
  gauge.add(line);
  gauge.rotation.y = Math.PI; // 투수 오른쪽(-X) 방향으로 펼침
  gauge.userData.goal = V(0, 1.4, 0);
  pivot.add(gauge);
}

function zoneOf(a) { return ZONES.find(z => a >= z.min) || ZONES[4]; }

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 9), kr = 1 - Math.exp(-dt * 3.2), kv = 1 - Math.exp(-dt * 4);
  if (ready) {
    if (motion) stepMotion(dt);
    else if (swap) stepSwap(dt);
    else {
      for (const [b, q] of target) b.quaternion.slerp(q, k);
      footOffset += (footTarget - footOffset) * k;
      model.position.y = footOffset;
    }

    const sway = state.screen === 0 ? Math.sin(clock.elapsedTime * 0.5) * 0.35 : 0;
    view.rot += (goal.rot + sway - view.rot) * kr;
    pivot.rotation.y = view.rot;
    const hs = state.height / 180;
    scaleMag += (hs - scaleMag) * k;
    pivot.scale.x = sign * scaleMag;
    pivot.scale.y += (hs - pivot.scale.y) * k;
    pivot.scale.z += (hs - pivot.scale.z) * k;

    view.gauge += (goal.gauge - view.gauge) * kv;
    const gv = view.gauge * swapFade();
    gauge.position.lerp(gauge.userData.goal, k);
    const active = zoneOf(state.angle).id;
    for (const m of gauge.children) {
      if (m.userData.line) m.material.opacity = 0.35 * gv;
      else {
        const on = m.userData.zone.id === active;
        m.material.opacity = (on ? 1 : 0.28) * gv;
        m.scale.z = on ? 2.2 : 1;
      }
    }
  }
  view.sx += (goal.sx - view.sx) * kv;
  view.sy += (goal.sy - view.sy) * kv;
  view.dist += (goal.dist - view.dist) * kv;
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  camera.position.set(0, 1.25, view.dist);
  camera.lookAt(0, 0.95, 0);
  camera.setViewOffset(w, h, -view.sx * w, view.sy * h, w, h);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function resize() {
  const c = renderer.domElement;
  const w = c.clientWidth, h = c.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  Object.assign(goal, layoutFn(state.screen, w, h));
}

export function init(canvas, b64, layout) {
  layoutFn = layout || layoutFn;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x061024, 9, 22);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  clock = new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x0a1430, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2.5, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 14 });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rimL = new THREE.DirectionalLight(0x3d8bff, 3.2); rimL.position.set(-4, 3, -4); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0x7fb6ff, 1.6); rimR.position.set(4, 2, -3); scene.add(rimR);

  // 마운드
  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.9, 0.08, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1c40, roughness: 0.95 }));
  mound.position.y = -0.04; mound.receiveShadow = true; scene.add(mound);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x3d8bff }));
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.02, 0.15), new THREE.MeshStandardMaterial({ color: 0xe9eef7, roughness: 0.8 }));
  plate.position.set(0, 0.01, -0.25); plate.receiveShadow = true; scene.add(plate);

  pivot = new THREE.Group();
  pivot.rotation.y = view.rot;
  scene.add(pivot);

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  return new Promise((resolve, reject) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    new GLTFLoader().parse(bin.buffer, '', gltf => {
      model = gltf.scene;
      model.traverse(o => {
        if (o.isBone) bones[o.name.replace(/[:_]/g, '')] = o;
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          // 유니폼 느낌: 몸은 밝은 회백색, 관절은 남색
          const joint = /joint/i.test(o.name);
          o.material = new THREE.MeshStandardMaterial({ color: joint ? 0x1d4fa8 : 0xe9eff9, roughness: joint ? 0.45 : 0.62, metalness: joint ? 0.3 : 0.05 });
        }
      });
      // 모델이 -Z를 보고 있으면 정면(+Z)으로 돌림
      pivot.add(model);
      pivot.updateMatrixWorld(true);
      const lh = bone('LeftArm').getWorldPosition(V(0, 0, 0)), rh = bone('RightArm').getWorldPosition(V(0, 0, 0));
      if (lh.x < rh.x) { model.rotation.y += Math.PI; pivot.updateMatrixWorld(true); }
      // 키 1.8m 기준으로 정규화
      const head = bone('HeadTopEnd') || bone('Head');
      const top = head.getWorldPosition(V(0, 0, 0)).y;
      const toe = bone('LeftToeBase').getWorldPosition(V(0, 0, 0)).y;
      model.scale.multiplyScalar(1.74 / (top - toe));
      pivot.updateMatrixWorld(true);
      footBase = 0.02;
      model.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
      const armLen = bone('RightArm').getWorldPosition(V(0, 0, 0)).distanceTo(bone('RightHand').getWorldPosition(V(0, 0, 0)));
      buildGauge(armLen);
      buildFx();
      ready = true;
      computeTarget();
      for (const [b, q] of target) b.quaternion.copy(q);
      resolve();
    }, reject);
  });
}

export function setPitcher(p) {
  Object.assign(state, p);
  computeTarget();
  const want = state.hand === 'L' ? -1 : 1;
  const pending = swap ? swap.sign : sign;
  if (want !== pending) {
    // 투구 동작 재생 중이거나 모델이 준비되기 전에는 바로 반전
    if (!ready || motion) { sign = want; swap = null; }
    else startSwap(want);
  }
}

export function goTo(screen) {
  if (screen !== 4) stopMotion();
  state.screen = screen;
  state.pose = POSE[screen];
  goal.rot = ROT[screen];
  goal.gauge = screen === 1 ? 1 : 0;
  Object.assign(goal, layoutFn(screen, renderer.domElement.clientWidth, renderer.domElement.clientHeight));
  computeTarget();
}

function stopMotion() {
  motion = null;
  if (fx) fx.visible = false;
}

// 구종별 투구 동작 재생 (반복). opts: { turn, mx, my, color, velo }
export function playPitch(opts, onPhase) {
  if (!ready) return;
  if (swap) { sign = swap.sign; swap = null; }
  const a = state.angle;
  const keys = TIMELINE.map(k => ({ t: k.t, ...computePose(() => KEYS[k.key](a, opts.turn)) }));
  const from = new Map();
  for (const [b] of rest) from.set(b, b.quaternion.clone());
  motion = {
    keys, from, fromFoot: footOffset, time: -0.5, phase: -1, released: false, opts, onPhase,
    flight: 0.5 * 135 / Math.max(80, opts.velo),
  };
  const col = new THREE.Color(opts.color);
  for (const d of dots) d.material.color.copy(col);
  resetFlight();
  fx.visible = true;
}

export function replay() {
  if (!motion) return;
  motion.time = 0;
  resetFlight();
}

export function setSpeed(x) { speed = x; }

// 특정 시점(초, 1배속 기준)으로 이동
export function seek(t) {
  if (!motion) return;
  if (t < motion.time) resetFlight();
  motion.time = t;
}
