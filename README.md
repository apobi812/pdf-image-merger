# PDF 이미지 병합 PWA

PDF와 이미지 파일을 하나의 PDF로 병합하는 설치형 웹앱입니다.

파일은 브라우저 안에서만 처리됩니다. 서버로 업로드하지 않습니다.

## 로컬 확인

```bash
cd "/Users/jihun/Documents/1 2/pdf-image-merger-pwa"
python3 -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.

## 아이폰에서 쓰는 방법

1. HTTPS로 배포한 주소를 Safari에서 엽니다.
2. 공유 버튼을 누릅니다.
3. `홈 화면에 추가`를 선택합니다.
4. 홈 화면에 생긴 `PDF 병합` 아이콘으로 실행합니다.

GitHub Pages, Cloudflare Pages, Vercel 같은 정적 호스팅에 이 폴더 전체를 올리면 됩니다.

## 배포 메모

- `file://`로 열면 앱 설치와 오프라인 캐시가 제대로 동작하지 않습니다.
- 아이폰 홈 화면 설치용 주소는 HTTPS여야 합니다.
- GitHub Pages에 올릴 때는 이 폴더 안의 파일 전체를 그대로 배포하면 됩니다.
- 라이브러리는 `vendor/`에 들어 있어서 CDN 없이 동작합니다.
