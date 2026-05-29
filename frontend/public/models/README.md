# 모델 파일 위치

숙소 또는 원룸 스캔 결과물을 이 폴더에 넣습니다.

예시:

```text
public/models/room.glb
```

그 다음 `frontend/.env.local`에 아래 값을 넣으면 프론트에서 해당 파일을 불러옵니다.

```text
VITE_GLB_URL=/models/room.glb
VITE_POLYCAM_URL=https://poly.cam/capture/8454646b-b853-4e41-981c-861246ff8dc0
```

`room.glb`는 발표 기본 시연용입니다. 3DGS 화면은 Polycam 공개 링크로 이동합니다.
