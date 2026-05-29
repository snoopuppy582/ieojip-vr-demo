# 이어집 프론트엔드

대학가 원룸 중개업소가 사무소 안에서 HMD로 매물을 먼저 보여주는 VR 상담 시연용 프론트엔드입니다.

## 실행

```bash
npm install
npm run dev -- --host 0.0.0.0
```

로컬 확인 주소는 `http://localhost:5173`입니다.

## 발표 시연 흐름

```text
매물 리스트
→ 매물 상세 보기
→ VR 상담 시작
→ 앞으로 이동 / 뒤로 이동
→ 방문 후보로 선택
→ 결과 화면
```

Meta Quest 3에서는 같은 주소를 Quest Browser에서 열고, PC 화면은 발표자 조작용 백업으로 사용합니다. 같은 Wi-Fi에서 Quest가 접속할 때는 PC의 로컬 IP를 사용합니다. 예: `http://192.168.200.164:5173`.

immersive WebXR 진입 버튼은 브라우저가 `immersive-vr`을 지원할 때만 표시됩니다. Quest에서 실제 VR 세션 버튼까지 쓰려면 HTTPS 배포 주소나 터널 주소를 쓰는 것이 안정적입니다.

## 3D Gaussian Splatting 파일 연결

숙소 또는 원룸 스캔 결과물이 준비되면 `public/models` 폴더에 넣고 `.env.local`을 만듭니다.

```bash
VITE_SPLAT_URL=/models/room.splat
```

지원 후보 형식은 사용하는 변환 파이프라인에 따라 `.splat`, `.ksplat`, `.ply` 중 하나로 맞춥니다. 파일이 없으면 기본 절차형 원룸 공간이 표시되므로 발표 리허설은 계속 가능합니다.

## 실제 사진 연결

사진을 `public/photos` 폴더에 넣고 `.env.local`에 연결합니다.

```bash
VITE_ROOM_PHOTO_1=/photos/room-entry.jpg
VITE_ROOM_PHOTO_2=/photos/room-inside.jpg
```

URL로 바로 테스트할 수도 있습니다.

```text
http://localhost:5173?photo1=/photos/room-entry.jpg&photo2=/photos/room-inside.jpg
```

## 검증

dev 서버를 먼저 켠 뒤 실행합니다.

```bash
npm run verify:ui
```

검증은 데스크톱 뷰어 캔버스가 비어 있지 않은지 확인하고, 모바일 폭에서 결과 화면까지 흐름이 깨지지 않는지 확인합니다.
