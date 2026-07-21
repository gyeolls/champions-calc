# GitHub Pages 배포 가이드

이 앱은 순수 정적 웹앱(서버 불필요)이라 GitHub Pages에 그대로 올리면 동작합니다.
HTTPS 환경에서 OCR·실시간 API·아이콘 CDN 모두 정상 작동해요.

## 1. GitHub 저장소 만들기
1. https://github.com/new 에서 새 저장소 생성 (예: `champions-calc`)
   - Public 선택 (Pages 무료 호스팅은 Public 필요)
2. 아래 명령을 **이 폴더(champions-calc)에서** 실행:

```bash
git init
git add .
git commit -m "포켓몬 챔피언스 데미지 계산기"
git branch -M main
git remote add origin https://github.com/<내아이디>/champions-calc.git
git push -u origin main
```

## 2. Pages 켜기
1. 저장소 → **Settings → Pages**
2. Source: **Deploy from a branch** / Branch: **main** / 폴더: **/(root)** → Save
3. 1~2분 후 `https://<내아이디>.github.io/champions-calc/` 접속

## 3. 업데이트할 때
```bash
git add .
git commit -m "수정 내용"
git push
```
푸시하면 1~2분 내 자동 반영됩니다.

## 참고
- `.nojekyll` 파일이 포함되어 있어 모든 파일이 그대로 서빙됩니다.
- 전체 용량 약 8MB (Pages 제한 1GB 이내로 여유).
- 브라우저 저장(파티/캐시)은 도메인별이므로, 로컬 파일로 쓰던 파티는
  호스팅 페이지에서 다시 등록해야 해요 (이미지 2장 붙여넣으면 금방).
- ⚠️ 스프라이트/아이콘은 포켓몬 IP 자산입니다. 공개 저장소·사이트로 올리는 것은
  개인·비상업 팬 프로젝트 관행 수준이지만, 문제 시 저장소를 Private으로 하고
  Pages 대신 로컬 사용을 권장해요 (Private 저장소 Pages는 유료 플랜 필요).
