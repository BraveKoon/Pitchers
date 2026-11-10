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

const ROT = [0.4, Math.PI, Math.PI + 2.2, Math.PI * 3];
const POSE = ['stand', 'pitch', 'pitch', 'pitch'];

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

// 목표 포즈 계산: 본을 잠시 기본 자세로 되돌려 계산한 뒤 현재 자세로 복원
function computeTarget() {
  if (!ready) return;
  const savedQ = new Map();
  for (const [b] of rest) savedQ.set(b, b.quaternion.clone());
  const pr = pivot.rotation.y, ps = pivot.scale.clone(), py = model.position.y;
  pivot.rotation.y = 0; pivot.scale.set(1, 1, 1); model.position.y = 0;
  for (const [b, q] of rest) b.quaternion.copy(q);
  pivot.updateMatrixWorld(true);

  if (state.pose === 'pitch') posePitch(state.angle); else poseStand();
  pivot.updateMatrixWorld(true);

  for (const [b] of rest) target.set(b, b.quaternion.clone());
  // 발이 땅에 닿도록 높이 보정
  let low = Infinity;
  for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) {
    const b = bone(n); if (b) low = Math.min(low, b.getWorldPosition(_a).y);
  }
  footTarget = -(low - footBase);
  // 어깨 위치(각도 게이지 중심)
  const sh = bone('RightArm');
  if (sh && gauge) gauge.userData.goal = sh.getWorldPosition(V(0, 0, 0));

  for (const [b, q] of savedQ) b.quaternion.copy(q);
  pivot.rotation.y = pr; pivot.scale.copy(ps); model.position.y = py;
  pivot.updateMatrixWorld(true);
}
let footBase = 0;

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
    for (const [b, q] of target) b.quaternion.slerp(q, k);
    footOffset += (footTarget - footOffset) * k;
    model.position.y = footOffset;

    const sway = state.screen === 0 ? Math.sin(clock.elapsedTime * 0.5) * 0.35 : 0;
    view.rot += (goal.rot + sway - view.rot) * kr;
    pivot.rotation.y = view.rot;
    const hs = state.height / 180;
    const sx = (state.hand === 'L' ? -1 : 1) * hs;
    pivot.scale.x += (sx - pivot.scale.x) * k;
    pivot.scale.y += (hs - pivot.scale.y) * k;
    pivot.scale.z += (hs - pivot.scale.z) * k;

    view.gauge += (goal.gauge - view.gauge) * kv;
    gauge.position.lerp(gauge.userData.goal, k);
    const active = zoneOf(state.angle).id;
    for (const m of gauge.children) {
      if (m.userData.line) m.material.opacity = 0.35 * view.gauge;
      else {
        const on = m.userData.zone.id === active;
        m.material.opacity = (on ? 1 : 0.28) * view.gauge;
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
}

export function goTo(screen) {
  state.screen = screen;
  state.pose = POSE[screen];
  goal.rot = ROT[screen];
  goal.gauge = screen === 1 ? 1 : 0;
  Object.assign(goal, layoutFn(screen, renderer.domElement.clientWidth, renderer.domElement.clientHeight));
  computeTarget();
}
