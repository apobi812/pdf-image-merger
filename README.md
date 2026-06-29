# Toolkit PWA

브라우저 안에서 실행되는 정적 웹 툴킷입니다.

## 포함된 도구

- PDF 관리: PDF와 이미지 파일을 하나의 PDF로 병합
- 글자수 세기: 글자수, 공백 제외 글자수, 단어수, 문장수, 문단수, 읽기 시간, 주요 단어 계산
- 동영상 추출: 동영상에서 현재 프레임 또는 일정 간격 프레임을 PNG로 추출

## 보안 원칙

- 파일 내용은 서버로 업로드하지 않고 브라우저 안에서 처리합니다.
- 분석에는 파일명, 파일 내용, 원본 문서, 동영상 내용을 저장하지 않습니다.
- 파일 형식과 크기를 클라이언트에서 제한합니다.
- CSP를 적용해 외부 스크립트와 임의 네트워크 연결을 막습니다.
- 관리자 페이지는 현재 정적 배포용 로컬 잠금과 로컬 집계만 제공합니다.

중요: GitHub Pages 같은 정적 호스팅만으로는 진짜 서버 관리자 인증, 전체 사용자 분석, 원격 계정 잠금, 악성 파일 서버 격리 처리를 완성할 수 없습니다. 해당 기능은 Cloudflare Worker/D1, Supabase, Firebase, 자체 서버 등 서버 측 인증과 저장소를 붙이는 다음 단계에서 구현해야 합니다.

## 로컬 확인

```bash
cd "/Users/jihun/Documents/1 2/pdf-image-merger-pwa"
python3 -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.

## 배포

GitHub Pages에 배포됩니다.

```bash
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
- Search Console, sitemap, robots.txt 추가
- Cloudflare Worker/D1 기반 서버형 분석과 관리자 인증 구현
- 개인정보처리방침/이용약관을 실제 운영 주체와 세무 구조에 맞게 법무 검토
