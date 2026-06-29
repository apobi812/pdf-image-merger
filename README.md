# Toolkit PWA

브라우저 안에서 실행되는 정적 웹 툴킷입니다.

## 포함된 도구

- 홈: `/`에서 약 20개 내외의 도구 심볼 그리드를 표시하고, 현재 사용 가능한 도구를 선택
- PDF 관리: `/pdf/`에서 PDF와 이미지 파일을 하나의 PDF로 병합
- 글자수 세기: `/word-count/`에서 글자수, 공백 제외 글자수, 단어수, 문장수, 문단수, 읽기 시간, 주요 단어 계산
- 동영상 추출: `/video-extractor/`에서 동영상의 현재 프레임 또는 일정 간격 프레임을 PNG로 추출

## iPhone/모바일 사용

- Safari에서 배포 URL을 연 뒤 공유 버튼 → `홈 화면에 추가`로 설치형 앱처럼 사용할 수 있습니다.
- PWA manifest에는 PDF 관리, 글자수 세기, 동영상 추출 단축 실행 항목이 포함되어 있습니다.
- 서비스워커는 주요 화면과 오프라인 안내 페이지를 캐시합니다.

## 보안 원칙

- 파일 내용은 서버로 업로드하지 않고 브라우저 안에서 처리합니다.
- 분석에는 파일명, 파일 내용, 원본 문서, 동영상 내용을 저장하지 않습니다.
- 서버형 원격 분석은 사용자가 동의한 경우에만 전송하고, Worker도 동의 표시가 없는 이벤트를 거절합니다.
- 파일 형식과 크기를 클라이언트에서 제한합니다.
- PDF와 이미지 파일은 실제 파일 시그니처를 확인하고, SVG 등 병합 대상이 아닌 형식은 거절합니다.
- 암호화된 PDF는 권한 우회 위험을 줄이기 위해 병합 대상에서 차단합니다.
- JavaScript, 자동 실행, 첨부파일, 리치 미디어 표식이 있는 PDF는 악용 위험을 줄이기 위해 차단합니다.
- 동영상은 MP4, MOV, WebM, OGG 계열만 허용합니다.
- 동영상은 확장자와 MIME 타입 외에 컨테이너 헤더를 한 번 더 확인합니다.
- CSP를 적용해 외부 스크립트와 임의 네트워크 연결을 막습니다.
- 지원 호스팅에서는 `_headers`의 frame-ancestors와 X-Frame-Options를 적용하고, GitHub Pages 정적 배포에서는 앱 시작 시 프레임 실행을 감지해 차단합니다.
- 오프라인 fallback 페이지를 포함해 네트워크 오류 시에도 명확한 안내를 제공합니다.
- 관리자 페이지는 기본 정적 배포에서는 로컬 잠금과 로컬 집계를 제공합니다.
- 관리자 페이지는 일반 화면에 링크하지 않고 `/admin/` 직접 주소 접근으로만 사용합니다.
- `worker/`의 Cloudflare Worker + D1 백엔드를 연결하면 서버형 관리자 로그인과 전체 사용자 집계가 활성화됩니다.

중요: GitHub Pages 같은 정적 호스팅만으로는 진짜 서버 관리자 인증, 전체 사용자 분석, 원격 계정 잠금, 악성 파일 서버 격리 처리를 완성할 수 없습니다. 해당 기능은 `worker/`의 서버리스 백엔드를 배포하고 `config.js`의 `apiBaseUrl`을 연결해야 활성화됩니다.

## 서버형 관리자/분석

Cloudflare Worker + D1 코드가 `worker/`에 포함되어 있습니다.

- 이벤트 수집: `/api/events` (사용자 동의 후 전송, 파일명, 파일 내용, 브라우저 세션 ID는 전송하지 않음)
- 관리자 로그인: `/api/admin/login`
- 집계 조회: `/api/admin/summary`
- 집계 내보내기: `/api/admin/export`

프론트엔드 연결은 `config.js`에서 설정합니다.

```js
window.TOOLKIT_CONFIG = {
  apiBaseUrl: '/api'
};
```

별도 Worker 도메인을 쓰는 경우에는 `apiBaseUrl`을 해당 `/api` URL로 바꾸고, `index.html` 및 각 전용 페이지의 CSP `connect-src`에 그 정확한 origin을 추가해야 합니다. 보안상 넓은 와일드카드는 권장하지 않습니다.

## 로컬 확인

```bash
cd "/Users/jihun/Documents/1 2/pdf-image-merger-pwa"
npm run check
python3 -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.

## 배포

GitHub Pages에 배포됩니다.

```bash
npm run check
git add .
git commit -m "Update toolkit"
git push
```

배포 URL:

```text
https://apobi812.github.io/pdf-image-merger/
```

## 다음 단계

- 커스텀 도메인 연결
- AdSense 승인 후 광고 슬롯에 실제 광고 코드 삽입
- Search Console 연결 및 sitemap 제출
- Cloudflare Worker/D1 배포 및 `config.js` 연결
- 개인정보처리방침/이용약관을 실제 운영 주체와 세무 구조에 맞게 법무 검토

운영 구조, 도메인 연결 방식, 보안 불변조건은 `docs/OPERATIONS.md`를 기준으로 관리합니다.
