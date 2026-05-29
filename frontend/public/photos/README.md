# 사진 파일 위치

실제 숙소 또는 원룸 사진을 이 폴더에 넣습니다.

예시:

```text
public/photos/room-wide.jpg
public/photos/room-normal.jpg
```

그 다음 `frontend/.env.local`에 아래 값을 넣으면 매물 상세 화면의 일반 사진이 교체됩니다.

```text
VITE_ROOM_PHOTO_1=/photos/room-wide.jpg
VITE_ROOM_PHOTO_2=/photos/room-normal.jpg
```
