# 이어집 프론트엔드

대학가 원룸 중개업소가 사무소 안에서 HMD로 매물을 먼저 보여주는 VR 상담 시연용 프론트엔드입니다.

## 실행

```bash
npm install
npm run dev -- --host 0.0.0.0
```

로컬 확인 주소는 `http://localhost:5173`입니다.

## Vercel 배포

이 저장소는 루트의 `vercel.json` 기준으로 `frontend`를 빌드해 배포합니다. Vercel에는 가벼운 GLB 모델과 실제 사진만 올리고, 대용량 3DGS PLY는 로컬 시연용으로만 둡니다.

```bash
vercel --prod
```

처음 배포할 때 Vercel 로그인이 필요합니다. GitHub 저장소로 가져올 경우 Root Directory를 따로 지정하지 않아도 루트 `vercel.json`의 `frontend` 빌드 설정을 사용합니다.

## 발표 시연 흐름

```text
매물 리스트
→ 매물 상세 보기
→ VR 상담 시작
→ 방 안 투어
→ 방문 후보로 선택
→ 결과 화면
```

Meta Quest 3에서는 같은 주소를 Quest Browser에서 열고, PC 화면은 발표자 조작용 백업으로 사용합니다. 같은 Wi-Fi에서 Quest가 접속할 때는 PC의 로컬 IP를 사용합니다. 예: `http://192.168.200.164:5173`.

immersive WebXR 진입 버튼은 브라우저가 `immersive-vr`을 지원할 때만 표시됩니다. Quest에서 실제 VR 세션 버튼까지 쓰려면 HTTPS 배포 주소나 터널 주소를 쓰는 것이 안정적입니다.

## 스캔 모델 연결

현재 기본 시연은 `public/models/room.glb`를 사용합니다. 이 파일은 가볍고 Meta Quest 3 브라우저에서 안정적으로 확인하기 위한 메인 시연 모델입니다.

3DGS PLY를 테스트하려면 `public/models` 폴더에 넣고 `.env.local`을 만듭니다.

```bash
VITE_GLB_URL=/models/room.glb
VITE_SPLAT_URL=/models/room.ply
```

지원 후보 형식은 `.glb`, `.ply`, `.splat`, `.ksplat`입니다. PLY는 파일이 클 수 있으므로 GitHub에는 올리지 않고 로컬 테스트용으로 둡니다.

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

현재 기본 사진은 광각 느낌의 `room-wide.jpg`, 일반 배율 느낌의 `room-normal.jpg`를 사용합니다.

## 검증

dev 서버를 먼저 켠 뒤 실행합니다.

```bash
npm run verify:ui
```

검증은 데스크톱 뷰어 캔버스가 비어 있지 않은지 확인하고, 모바일 폭에서 결과 화면까지 흐름이 깨지지 않는지 확인합니다.
