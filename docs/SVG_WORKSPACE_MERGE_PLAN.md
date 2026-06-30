# SVG 워크스페이스 병합 계획

StyleStudio의 "SVG 세션" 기능을 IconMaker로 이식하기 위한 계획서.

## 0. 결정된 범위

- **이식 방식**: 세션 시스템 제외, 기능만 **단일 패널(워크스페이스)**로 이식.
- **데이터 저장**: StyleStudio의 다중 세션(`settings.json`의 `sessions[]`) 구조 대신, IconMaker 기존 `iconmaker.json`(Tauri Store)에 **단일 워크스페이스 키**로 저장.
- **기능 깊이**: 스타일링 엔진(색상 모드·마감 효과·그래디언트), SVG 스프라이트/HTML 스니펫 내보내기 **전부 포함**.

## 1. 핵심 구조 차이 (이식의 본질)

| 항목 | StyleStudio | IconMaker (대상) |
|------|-------------|------------------|
| 앱 구조 | 다중 세션 (세션 타입별 패널) | 단일 화면 SPA |
| SVG 기능 위치 | `SVG_ICON` 세션 타입 | 신규 패널/탭으로 추가 |
| 데이터 컨테이너 | `Session.svgIconData` | `iconmaker.json`의 `svgWorkspace` 키 |
| 저장 트리거 | `onSessionUpdate → persistSessions` | 신규 훅 `useSvgWorkspace`의 디바운스 저장 |
| Iconify 호출 | (확인 필요) plugin-http or fetch | 기존 `useIconSearch` 방식과 통일 |

**이식의 핵심**: StyleStudio의 SVG 기능 모듈(검색/스타일/내보내기 lib)은 세션과 무관한 **순수 함수**라 거의 그대로 복사 가능. 결합 지점은 오직 두 곳 — (1) 데이터를 어디서 읽고 쓰는가, (2) 패널을 어디서 렌더링/진입하는가. 이 두 곳만 IconMaker 방식으로 갈아끼우면 됨.

## 2. 그대로 복사 가능한 파일 (순수 모듈)

StyleStudio → IconMaker, 경로 동일 유지:

- `src/lib/svgIcon/svgIconDefaults.ts` — 스타일 프리셋·기본 카테고리 템플릿·기본 데이터 팩토리
- `src/lib/svgIcon/svgIconSearch.ts` — Iconify 검색, 한글→영문 쿼리 확장
- `src/lib/svgIcon/svgIconStyle.ts` — `applyColorMode`/`applyFinishMode`/`normalizeViewBox`/그래디언트·그림자
- `src/lib/svgIcon/svgIconExport.ts` — `buildStandaloneSvg`/`buildSvgSprite`/`buildHtmlIconSnippet`/`downloadTextFile`
- `src/lib/svgIcon/svgSanitizer.ts` — SVG XSS 정규화 (**필수, 생략 금지**)

복사 후 import 경로(타입·lucide-react)만 확인.

## 3. 적응(adapt)이 필요한 파일

### 3.1 타입 — `src/types/svgIcon.ts`
- `SvgGameIcon`, `SvgIconCategory`, `SvgIconStyleSnapshot`, 스타일/검색 결과 타입은 그대로 복사.
- `SvgIconSessionData` → **`SvgWorkspaceData`로 개명** (세션 색채 제거). 필드는 동일: `categories`, `icons`, `selectedCategoryId`, `stylePreset`, `defaultViewBox`, `updatedAt`.
- IconMaker `src/types/session.ts`는 없으므로 세션 관련 타입 이식 **불필요**.

### 3.2 영속성 — 신규 `src/hooks/useSvgWorkspace.ts`
StyleStudio의 `useSessionManagement` + `storage.ts` 세션 로직을 **이식하지 않고**, IconMaker의 `storageService` 패턴을 따르는 경량 훅 신규 작성:

- `storageService`에 `getSvgWorkspace()` / `saveSvgWorkspace(data)` 추가 (`iconmaker.json`의 `svgWorkspace` 키).
- 훅 동작: 마운트 시 로드 → 없으면 `createDefaultSvgWorkspaceData()`로 초기화 → 변경 시 디바운스(예: 500ms) 저장.
- 반환: `{ workspace, updateWorkspace, isLoading }`.
- **결정 사항**: 단일 워크스페이스만 저장(세션 다중성 제거). 추후 다중 컬렉션이 필요하면 키를 배열로 확장.

### 3.3 메인 컴포넌트 — `src/components/svg-icon/SvgIconPanel.tsx`
- 복사 후 props 인터페이스 조정: `(svgIconData, onSessionUpdate)` → `(workspace, onChange)` 또는 패널 내부에서 `useSvgWorkspace` 직접 사용.
- **권장**: 패널 내부에서 `useSvgWorkspace`를 호출해 자기완결형으로 만들기 (App.tsx 결합 최소화).
- **내보내기 저장 치환(확정)**: StyleStudio는 `downloadTextFile()`로 **브라우저 a태그 다운로드**(`svgIconExport.ts:106`). IconMaker는 `plugin-dialog save()` + `save_icon_file` command + `Download_Icon` 기본 폴더(`exportService.ts:87-121`). → SvgIconPanel의 모든 `downloadTextFile()` 호출을 **IconMaker `exportService` 텍스트 저장 함수로 치환**. 신규 `exportService.saveTextFile(fileName, text, extension)` 추가(자동저장/다이얼로그 분기 재사용), `save_icon_file`에 텍스트 바이트 전달. 호출 지점: `SvgIconPanel.tsx:642`(handleDownload), `:737`(스프라이트), `:1205`(개별 SVG).

### 3.4 Iconify API 호출 (확정: 치환 불필요)
- StyleStudio `svgIconSearch.ts`는 **순수 브라우저 `fetch`** 사용 (`:106` 검색, `:123` SVG 조회, base `https://api.iconify.design`). plugin-http 의존 **없음** → **그대로 복사**.
- IconMaker도 `iconifyApi.ts:36`에서 fetch 사용, `useIconSearch`가 TanStack Query 래핑(staleTime 7분).
- **권장(선택)**: `searchSvgIcons` 호출을 워크스페이스 패널에서 `useQuery`로 감싸 IconMaker 캐싱 정책과 통일. 필수는 아니며 1차 이식은 자체 fetch 그대로 두고 동작 확인 후 래핑.

## 4. 진입점/네비게이션 통합 (App.tsx)

IconMaker는 라우터 없는 단일 화면(`App.tsx`: `flex flex-col h-screen` = 헤더 + `main flex-1` + 조건부 패널, 탭 없음).

- **확정 방식**: 헤더(`App.tsx:62-133`)에 **"검색 / 에디터" 토글 버튼** 추가, `mainView: 'search' | 'svgWorkspace'` 상태로 `main` 영역을 조건부 렌더링 (`IconGrid` ↔ `SvgIconPanel`).
- `SvgIconPanel`은 `lazy import` 후 `Suspense`로 감싸 렌더링.
- 기존 검색 화면과 공존(데이터 독립). 즐겨찾기/검색 상태(`showOnlyFavorites`, `selectedIcon`)와 충돌 없음.

## 5. 의존성 점검

| 패키지 | 필요 여부 | 비고 |
|--------|----------|------|
| `@tauri-apps/plugin-store` | 이미 있음 | 영속성 |
| `@tauri-apps/plugin-fs` | 이미 있음 | 내보내기 |
| `@tauri-apps/plugin-dialog` | 이미 있음 | 저장 위치 선택 |
| `lucide-react` | 이미 있음 | 아이콘 |
| `@tauri-apps/plugin-http` | **불필요(확정)** | StyleStudio 검색이 브라우저 fetch만 사용 → 추가 안 함 |
| `idb` (IndexedDB) | **불필요** | 이미지 세션 전용. SVG는 텍스트 인라인 저장 |

Rust(Cargo.toml)/Tauri command: SVG 기능은 모두 JS/플러그인으로 처리되므로 **신규 Rust command 불필요**. 기존 `svg_to_png`는 PNG 내보내기가 필요할 때만 재사용.

## 6. 작업 순서 (Phase)

1. **Phase 1 — 순수 모듈 이식**: `src/lib/svgIcon/*` 5개 파일 복사, import 경로 정리. 타입 `svgIcon.ts` 복사 + `SvgWorkspaceData` 개명.
2. **Phase 2 — 영속성**: `storageService`에 `getSvgWorkspace/saveSvgWorkspace` 추가, `useSvgWorkspace` 훅 작성.
3. **Phase 3 — Iconify 호출 통일**: 검색 로직을 IconMaker fetch/Query 방식으로 정합.
4. **Phase 4 — 패널 이식**: `SvgIconPanel.tsx` 복사, props→훅 기반으로 적응, 내보내기를 IconMaker Tauri 저장 경로로 통일.
5. **Phase 5 — 진입점**: App.tsx 뷰 전환/탭 추가, lazy 렌더링.
6. **Phase 6 — 검증**: 워크스페이스 생성/저장/로드, 검색, 스타일 적용, 단일 SVG·스프라이트·HTML 내보내기, 앱 재시작 후 데이터 유지.

## 7. 검증 체크리스트

- [ ] SVG 워크스페이스 진입 → 기본 카테고리 초기화 확인
- [ ] Iconify 검색 동작 (한글 쿼리 확장 포함)
- [ ] 아이콘 수집·카테고리 분류
- [ ] 색상 모드(original/mono/duotone)·마감(flat/outlined/gradient/raised) 실시간 적용
- [ ] 단일 SVG / 스프라이트 / HTML 스니펫 내보내기 (저장 위치 IconMaker 폴더 정책 준수)
- [ ] 앱 재시작 후 `iconmaker.json`에서 워크스페이스 복원
- [ ] 기존 검색/즐겨찾기/내보내기 기능 회귀 없음

## 8. 사전 확인 결과 (확정 완료)

1. **Iconify 호출**: 양쪽 모두 브라우저 `fetch`. StyleStudio `svgIconSearch.ts`는 plugin-http 의존 없음 → **그대로 복사**, plugin-http 추가 불필요.
2. **파일 저장**: StyleStudio=브라우저 a태그 다운로드(`downloadTextFile`), IconMaker=`plugin-dialog save()` + `save_icon_file` command + `Download_Icon` 폴더. → **IconMaker 방식으로 치환**(§3.3). `exportService`에 텍스트 저장 함수 신규 추가.
3. **레이아웃**: 헤더 + `main flex-1` + 조건부 패널, 탭 없음. → **헤더에 "검색/에디터" 토글** 추가, `main` 조건부 렌더링(§4).
