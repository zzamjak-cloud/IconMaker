# Tauri 서명 키 설정 가이드

## ⚠️ 중요: 직접 터미널에서 실행하세요

Claude CLI 환경에서는 대화형 명령어가 작동하지 않으므로, 아래 단계를 **직접 터미널 앱에서** 실행해야 합니다.

---

## 1. 비밀번호 없는 새 키 생성

### 터미널에서 실행:

```bash
cd /Users/woody/Desktop/AI/IconMaker
npx tauri signer generate -w src-tauri/iconmaker.key
```

### 프롬프트 응답:

1. **"Please enter a password to protect the secret key"**
   → **아무것도 입력하지 말고 Enter 키만 누르세요**

2. **"Please enter the same password again"**
   → **다시 아무것도 입력하지 말고 Enter 키만 누르세요**

**중요**: 두 번 모두 빈 상태에서 Enter만 눌러야 합니다. 비밀번호를 입력하면 안 됩니다!

### 성공 메시지:

```
Generating new signing key pair...
Keys generated successfully!
Public key: src-tauri/iconmaker.key.pub
Private key: src-tauri/iconmaker.key
```

---

## 2. 공개 키 확인 및 복사

```bash
cat src-tauri/iconmaker.key.pub
```

출력된 긴 문자열 전체를 복사하세요 (예: `dW50cnVzdGVkIGNvbW1lbnQ6...`).

---

## 3. tauri.conf.json 업데이트

`src-tauri/tauri.conf.json` 파일을 열고 `plugins.updater.pubkey` 값을 복사한 공개 키로 교체하세요:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "여기에_복사한_공개키_붙여넣기",
      "endpoints": [...]
    }
  }
}
```

---

## 4. GitHub Secrets 설정

### 개인 키 내용 확인:

```bash
cat src-tauri/iconmaker.key
```

### GitHub에 등록:

1. 브라우저에서 https://github.com/zzamjak-cloud/IconMaker/settings/secrets/actions 이동
2. **"New repository secret"** 클릭
3. Name: `TAURI_SIGNING_PRIVATE_KEY`
4. Secret: 위에서 복사한 개인 키 내용 전체 붙여넣기
5. **"Add secret"** 클릭

**기존 Secret이 있다면**: "Update" 버튼을 클릭하여 값을 교체하세요.

---

## 5. 변경사항 커밋 및 푸시

```bash
git add .github/workflows/release.yml src-tauri/tauri.conf.json
git commit -m "$(cat <<'EOF'
Tauri 서명 키 설정 수정 (비밀번호 없는 키 사용)

- 비밀번호 없는 새 서명 키 생성
- GitHub Actions 워크플로우에서 비밀번호 요구사항 제거
- 공개 키 업데이트

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

## 6. 태그 재생성 및 재배포

```bash
# 이전 태그 삭제
git tag -d v0.1.1
git push origin :refs/tags/v0.1.1

# 새 태그 생성 및 푸시
git tag v0.1.1
git push origin v0.1.1
```

GitHub Actions가 자동으로 빌드를 시작합니다:
👉 https://github.com/zzamjak-cloud/IconMaker/actions

---

## 7. 빌드 확인

1. GitHub Actions 페이지에서 빌드 진행 상황 확인
2. 빌드 완료 후 Releases 페이지에서 v0.1.1 확인:
   👉 https://github.com/zzamjak-cloud/IconMaker/releases

---

## ⚠️ 보안 주의사항

- ❌ **절대로** `iconmaker.key` (개인 키)를 Git에 커밋하지 마세요
- ✅ `.gitignore`에 `src-tauri/*.key` 패턴이 이미 있습니다
- ✅ `iconmaker.key.pub` (공개 키)만 커밋하세요 (선택사항)
- ✅ GitHub Secrets는 암호화되어 저장됩니다

---

## 트러블슈팅

### "passwords don't match" 에러
→ Enter를 두 번 눌렀는지 확인하세요. 비밀번호를 입력하면 안 됩니다.

### "Device not configured" 에러
→ Claude CLI가 아닌 **일반 터미널 앱(Terminal.app, iTerm2 등)**에서 실행하세요.

### 빌드가 여전히 실패하는 경우
→ GitHub Secrets에 `TAURI_SIGNING_PRIVATE_KEY`가 올바르게 설정되었는지 확인하세요.
