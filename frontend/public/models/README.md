# 모델 파일 위치

숙소 또는 원룸 스캔 결과물을 이 폴더에 넣습니다.

예시:

```text
public/models/room.glb
public/models/room.ply
```

그 다음 `frontend/.env.local`에 아래 값을 넣으면 프론트에서 해당 파일을 불러옵니다.

```text
VITE_GLB_URL=/models/room.glb
VITE_SPLAT_URL=/models/room.ply
```

`room.glb`는 발표 기본 시연용, `room.ply`는 3DGS 테스트용입니다.
