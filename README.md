# Pitchers

팔 각도, 키, 평균 구속을 맞추면 그 투구 폼에 어울리는 구종을 보여 주는 웹 앱입니다.

1. **시작 화면** — 앱 이름과 시작하기 버튼
2. **팔 각도** — 3D 투수 모델의 팔이 슬라이더에 따라 움직이며 오버핸드 / 쓰리쿼터 / 사이드암 / 언더핸드를 판정
3. **키 · 구속** — 릴리스 높이, 익스텐션, 체감 구속
4. **결과** — 주요 구종, 예상 구속, 무브먼트 차트, 난이도, 그립(실밥·손가락 위치 그림)

화면이 바뀔 때마다 3D 모델이 회전하며 전환됩니다.

## 실행

`index.html`을 브라우저로 열면 됩니다. 서버나 설치가 필요 없습니다.

## 배포

`main`에 푸시하면 GitHub Actions(`.github/workflows/pages.yml`)가 GitHub Pages로 배포합니다.
저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 한 번 설정해야 합니다.
주소: https://bravekoon.github.io/Pitchers/

## 개발

3D 스테이지(`src/stage.js`)나 모델(`assets/pitcher.glb`)을 바꾼 뒤에는 다시 빌드합니다.

```
npm install
npm run build   # stage.bundle.js, model.js 생성
```

모델은 Mixamo 방식 뼈대(`mixamorig:*`)를 가진 GLB면 교체할 수 있습니다.

## 출처

- 3D 렌더링: [three.js](https://threejs.org) (MIT)
- 사람 모델: three.js 예제의 `Xbot.glb` (Mixamo 캐릭터)

모든 수치는 일반적인 경향을 단순화한 추정치이며 참고용입니다.
