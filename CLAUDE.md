# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IconMaker is a tool for generating icon SVG and PNG files using the Iconify library.

## Project Status

This is a new project in the initialization phase. The technology stack and project structure have not yet been established.

## Intended Functionality

- 🔍 Search and browse 275,000+ icons from Iconify API
- ⭐ Favorite and cache icons for quick access
- 📥 Export icons as SVG or PNG files
- ⚙️ Pre-configure export settings and default save folder
- ⚡ Quick export with a single click

## Technology Stack

- **Frontend**: Tauri 2.0 + React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Virtualization**: TanStack Virtual
- **Backend**: Rust + resvg (SVG→PNG conversion)
- **Data Persistence**: Tauri Store Plugin

## Language Policy

- **Communication**: All conversations and responses must be in Korean (한국어)
- **Code Comments**: All comments in code must be written in Korean
- **Documentation**: Documentation should be written in Korean when applicable

---

## MCP Servers

이 저장소는 다음 MCP 서버를 사용합니다 (전역 설정 위치: `~/.claude/config.json`):

| 서버 | 용도 | 패키지 |

|------|------|--------|

| **notion** | Notion 페이지 및 database 관리 | `@modelcontextprotocol/server-notion` |

| **brave-search** | Brave Search API를 통한 실시간 웹 검색 | `@modelcontextprotocol/server-brave-search` |

| **github** | GitHub 저장소, 이슈, PR 관리 | `@modelcontextprotocol/server-github` |

| **filesystem** | 로컬 파일 시스템 접근 | `@modelcontextprotocol/server-filesystem` |

| **sequential-thinking** | 복잡한 문제를 단계별로 분해하여 사고 | `@modelcontextprotocol/server-sequential-thinking` |

| **playwright** | 브라우저 자동화 및 웹 스크래핑 | `@playwright/mcp` |

| **serena** | 코드 분석 및 프로젝트 컨텍스트 관리 | `serena-slim` |

---

## 전역 플러그인: Tauri Toolkit

Tauri + React 데스크톱 앱 개발 자동화를 위한 전역 플러그인이 설치되어 있습니다.

**위치**: `~/.claude/plugins/local/tauri-toolkit/`

### 자동 활성화

다음 요청 시 Tauri 개발 가이드라인과 실수 방지 규칙이 자동 적용됩니다:

- "Tauri 앱 만들어줘", "데스크톱 앱 개발"
- "React + Rust 앱", "크로스 플랫폼 앱"
- `tauri.conf.json` 파일 수정 시

### 사용 가능한 명령어

| 명령어 | 설명 |

|--------|------|

| `/tauri:help` | 전체 도움말 |

| `/tauri:init` | 새 프로젝트 초기화 가이드 |

| `/tauri:setup-store` | Tauri Store 설정 (데이터 영속성) |

| `/tauri:setup-fs` | 파일 시스템 유틸리티 |

| `/tauri:setup-oauth` | **Google OAuth 2.0 인증 시스템 설정** |

| `/tauri:dialog` | 커스텀 다이얼로그 생성 |

| `/tauri:dnd` | 드래그앤드롭 구현 |

| `/tauri:emoji` | 이모지 피커 생성 |

| `/tauri:build` | 플랫폼별 빌드 가이드 |

| `/tauri:setup-cicd` | **GitHub Actions CI/CD + Secrets 설정** |

| `/tauri:release-prep` | **릴리스 준비 - 버전 업데이트 및 문서 동기화** |

| `/tauri:icons` | 앱 아이콘 생성 |

### 실수 방지 (Hookify)

다음 패턴 사용 시 자동으로 차단/경고됩니다:

| 패턴 | 액션 | 권장 대안 |

|------|------|----------|

| `window.confirm/alert` | 차단 | React 커스텀 다이얼로그 |

| `e.dataTransfer.files` | 경고 | Tauri `onDragDropEvent` |

| `localStorage` | 경고 | Tauri Store |

| `fetch("https://...")` | 경고 | Tauri HTTP plugin |

| `new Notification()` | 경고 | Tauri notification plugin |

| 이모지 하드코딩 | 경고 | @emoji-mart/data |

### 데이터 영속성 (중요)

개발 중 빌드/재설치 시 데이터가 유지되려면 **반드시 Tauri Store** 사용:

```typescript

// ❌ localStorage - 개발 빌드 시 삭제될 수 있음

localStorage.setItem('key', value)

// ✅ Tauri Store - 개발 빌드/재설치 시에도 유지됨

const store = await Store.load('settings.json')

await store.set('key', value)

await [store.save](http://store.save)()

```

---

## Tauri 개발 가이드라인

Tauri + React 기반 데스크톱 앱 개발 시 자주 발생하는 문제와 검증된 해결 패턴을 정리합니다.

### 1. window.confirm/alert 사용 금지

**문제점:**

- Tauri 환경에서 `window.confirm()`과 `window.alert()`는 불안정하게 동작

- 확인 다이얼로그에서 "취소"를 눌러도 코드가 실행되는 경우 발생

- 비동기 작업과 함께 사용 시 타이밍 이슈 발생

**해결 방법: React 커스텀 다이얼로그**

```typescript

// 1. State로 삭제 대상 관리

const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

// 2. 삭제 버튼 → 다이얼로그 표시만

const handleDelete = (id: string) => setDeleteConfirm(id)

// 3. 취소/확인 함수

const cancelDelete = () => setDeleteConfirm(null)

const confirmDelete = () => {

  if (!deleteConfirm) return

  // 실제 삭제 로직

  setDeleteConfirm(null)

}

// 4. 조건부 렌더링

{deleteConfirm && (

  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    <div className="bg-card border border-border rounded-lg shadow-xl max-w-sm w-full p-6">

      <h3 className="text-lg font-semibold mb-2">삭제 확인</h3>

      <p className="text-muted-foreground mb-6">정말 삭제하시겠습니까?</p>

      <div className="flex gap-3 justify-end">

        <button onClick={cancelDelete}>취소</button>

        <button onClick={confirmDelete}>삭제</button>

      </div>

    </div>

  </div>

)}

```

**참고 예시:**

- `GamePlanner-Tauri/src/components/Sidebar.tsx`

- `GamePlanner-Tauri/src/components/TemplateManagerModal.tsx`

---

### 2. 드래그 앤 드롭 구현

Tauri에서 드래그 앤 드롭은 **앱 외부(탐색기→앱)**와 **앱 내부(앱 요소→앱 요소)**를 구분해서 구현해야 합니다.

#### 2.1 앱 외부 → 앱 (파일 드롭)

웹 표준 `onDrop` 이벤트는 Tauri에서 파일 경로를 가져올 수 없습니다. **Tauri 네이티브 API**를 사용해야 합니다.

```typescript

import { getCurrentWindow } from '@tauri-apps/api/window'

useEffect(() => {

  let unlisten: (() => void) | undefined

  const setup = async () => {

    const appWindow = getCurrentWindow()

    unlisten = await appWindow.onDragDropEvent(async (event) => {

      if (event.payload.type === 'enter' || event.payload.type === 'over') {

        setIsDragging(true)

      } else if (event.payload.type === 'leave') {

        setIsDragging(false)

      } else if (event.payload.type === 'drop') {

        setIsDragging(false)

        // 핵심: 실제 파일 경로 획득

        const paths = event.payload.paths || []

        if (paths.length > 0) {

          await processFiles(paths)

        }

      }

    })

  }

  setup()

  return () => { if (unlisten) unlisten() }

}, []) // 의존성 배열 주의

```

**주의사항:**

- `useEffect` 의존성 배열에 필요한 상태만 포함 (무한 루프 방지)

- `unlisten()` 반드시 클린업에서 호출

- `event.payload.paths`는 항상 배열

**참고 예시:**

- `StyleStudio-Tauri/src/components/generator/ImageUpload.tsx`

- `GamePlanner-Tauri/src/components/ReferenceManager.tsx`

#### 2.2 앱 내부 (요소 재정렬)

앱 내부에서의 드래그 앤 드롭은 **웹 표준 API**를 사용합니다.

```typescript

// 드래그 가능한 항목

const handleDragStart = (e: React.DragEvent, index: number) => {

  e.dataTransfer.effectAllowed = 'move'

  e.dataTransfer.setData('text/plain', index.toString())

}

// 드롭 영역

const handleDragOver = (e: React.DragEvent) => {

  e.preventDefault() // 필수: 드롭 허용

  e.dataTransfer.dropEffect = 'move'

}

const handleDrop = (e: React.DragEvent, targetIndex: number) => {

  e.preventDefault()

  const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'))

  // 재정렬 로직

}

```

**주의사항:**

- `onDragOver`에서 `e.preventDefault()` 필수

- `setData/getData` 값은 문자열만 가능

#### 2.3 비교 요약

| 구분 | 앱 외부 (탐색기→앱) | 앱 내부 (요소→요소) |

|------|-------------------|-------------------|

| **API** | Tauri `onDragDropEvent` | 웹 표준 `onDragStart`, `onDrop` |

| **데이터** | `event.payload.paths` | `dataTransfer.setData/getData` |

| **용도** | 파일 업로드, 이미지 드롭 | 리스트 재정렬, 요소 이동 |

---

### 3. 이모지 피커 구현

**절대 금지:** 이모지 데이터를 수천 개의 코드로 직접 입력

**올바른 방법:** `@emoji-mart/data` 패키지 사용

```bash

npm install @emoji-mart/data

```

```typescript

// src/lib/emojiData.ts

import emojiData from '@emoji-mart/data/sets/15/native.json'

interface EmojiItem {

  emoji: string

  name: string

  keywords: string[]

  category: string

}

function convertEmojiMartData(): EmojiItem[] {

  const emojis: EmojiItem[] = []

  for (const id in emojiData.emojis) {

    const item = emojiData.emojis[id]

    const skin = item.skins[0]

    if (!skin) continue

    // 카테고리 찾기 (중요: categories 배열에서 검색)

    let category = 'symbols'

    for (const cat of emojiData.categories) {

      if (cat.emojis.includes(id)) {

        category = [cat.id](http://cat.id)

        break

      }

    }

    emojis.push({

      emoji: skin.native,

      name: [item.name](http://item.name) || id,

      keywords: item.keywords || [],

      category,

    })

  }

  return emojis

}

// 캐싱

let cached: EmojiItem[] | null = null

export function getEmojiList(): EmojiItem[] {

  if (!cached) cached = convertEmojiMartData()

  return cached

}

```

**Tiptap에서 ":" 입력 시 이모지 검색:**

Tiptap `Mention` extension을 `char: ':'`로 설정하여 구현합니다.

**참고 예시:**

- `GamePlanner-Tauri/src/lib/emojiData.ts`

- `GamePlanner-Tauri/src/components/TemplateEditorModal.tsx`

---

### 4. 기타 Tauri 개발 팁

#### 파일 시스템 접근

- Tauri의 `@tauri-apps/plugin-fs` 사용

- 웹 `File API`로는 실제 파일 경로 접근 불가

#### 윈도우 관리

- `@tauri-apps/api/window`의 `getCurrentWindow()` 사용

- 창 크기, 위치, 최소화/최대화 등 제어

#### 설정 저장 (데이터 영속성)

- **필수**: `@tauri-apps/plugin-store` 사용

- `localStorage`는 개발 빌드/재설치 시 삭제될 수 있어 **비권장**

- Tauri Store 저장 위치: `~/Library/Application Support/<bundle-id>/` (macOS)

- `/tauri:setup-store` 명령어로 설정 및 래퍼 훅 생성

---

## Super Claude 슬래시 명령어

Super Claude가 설치되어 있으며, 작업 상황에 따라 적절한 슬래시 명령어를 자동으로 사용합니다.

### 명령어 자동 사용 기준

| 상황 | 명령어 |

|------|--------|

| 코드 분석 | `/sc:analyze` |

| 기능 구현 | `/sc:implement` |

| 테스트 실행 | `/sc:test` |

| 빌드/컴파일 | `/sc:build` |

| Git 커밋 | `/sc:git` |

| 문서 생성 | `/sc:document` |

| 코드 개선 | `/sc:improve` |

| 문제 해결 | `/sc:troubleshoot` |

| 설계/아키텍처 | `/sc:design` |

| 코드 정리 | `/sc:cleanup` |

| 작업량 산정 | `/sc:estimate` |

| 웹 리서치 | `/sc:research` |

| 요구사항 정의 | `/sc:brainstorm` |

| 워크플로우 생성 | `/sc:workflow` |

| 코드 설명 | `/sc:explain` |

| PR 코드 리뷰 | `/code-review` |

### 자동 실행 규칙

1. **명시적 요청 우선**: 사용자가 특정 명령어를 직접 요청하면 해당 명령어 사용

2. **작업 컨텍스트 기반**: 작업 성격에 따라 적합한 명령어 자동 선택

3. **연속 작업 지원**: 코드 작성 → `/sc:test`, 문제 발견 → `/sc:troubleshoot`

4. **불필요한 실행 금지**: 단순 질문이나 파일 읽기만 필요한 경우 사용 안 함

### 명령어 조합 패턴

- **기능 개발**: `/sc:design` → `/sc:implement` → `/sc:test` → `/sc:git`

- **버그 수정**: `/sc:troubleshoot` → `/sc:implement` → `/sc:test`

- **리팩토링**: `/sc:analyze` → `/sc:improve` → `/sc:cleanup` → `/sc:test`

---

## Notes

- This repository contains multiple experimental projects

- Each project has its own implementation status document in the `Plans/` directory

- Always refer to project-specific documentation before making changes