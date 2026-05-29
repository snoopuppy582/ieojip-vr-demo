# 모델 파일 위치

숙소 또는 원룸 스캔 결과물을 이 폴더에 넣습니다.

예시:

```text
public/models/room.splat
```

그 다음 `frontend/.env.local`에 아래 값을 넣으면 프론트의 `3DGS 모드`에서 해당 파일을 불러옵니다.

```text
VITE_SPLAT_URL=/models/room.splat
```
