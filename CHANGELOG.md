# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-30

### Added
- **SVG 워크스페이스(에디터 탭)**: StyleStudio의 SVG 세션 기능을 단일 패널로 이식
  - 카테고리별 아이콘 수집·관리, 캐주얼 게임용 기본 카테고리 20종
  - 카테고리 선택 시 영어 추천 검색어 자동 입력 (한글보다 정확)
  - SVG/PNG/스프라이트/HTML 스니펫 내보내기, SVG·HTML·CSS 복사
- **스타일 효과 시스템** (SVG 필터 기반, HTML·PNG 호환):
  - 그림자, 외부/내부 발광, 베벨(양각/음각) — 각 색상·강도 조절
  - 외곽선 효과 (색상·굵기), 그림자는 외곽선 포함·내부 발광은 콘텐츠 기준
  - 색상 모드(원본/단색/투톤)와 마감(그레디언트/입체)을 단일 스타일 셀렉터로 통합
- **커스텀 색상 선택기**: 108색 팔레트 팝업 + 직접 선택/HEX 입력
- **전체 설정 백업/복원**: 즐겨찾기·내보내기 설정·SVG 워크스페이스를 JSON으로 백업·복구
- 검색/에디터 뷰 전환 토글, 그리드 컬럼 비율에 맞춘 이미지 스케일

### Changed
- 그리드 슬라이더를 검색 결과 라인으로 이동, 헤더 탭 중앙 정렬
- 탭별 불필요한 컨트롤 비활성화 (에디터 탭에서 검색 전용 컨트롤 숨김)

## [0.1.2] - 2026-02-05

### Fixed
- PNG 내보내기 버그 수정

## [0.1.1] - 2026-02-05

### Added
- GitHub Actions CI/CD 파이프라인 구축
- Tauri Updater를 통한 자동 업데이트 시스템
- 버전 관리 자동화 스크립트 (`npm run version:bump`)
- 업데이트 다이얼로그 UI 컴포넌트

### Changed
- 앱 아이콘 디자인 변경 및 모든 플랫폼 아이콘 업데이트
- 개발 워크플로우 개선

## [0.1.0] - 2026-02-05

### Added
- 초기 프로젝트 설정
- Iconify API 기반 아이콘 검색 기능
- 즐겨찾기 기능
- SVG/PNG 내보내기 기능
- 일괄 내보내기 기능
- 설정 관리 (기본 폴더, 내보내기 옵션)
- 다크 모드 지원

[unreleased]: https://github.com/zzamjak-cloud/IconMaker/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/zzamjak-cloud/IconMaker/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/zzamjak-cloud/IconMaker/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/zzamjak-cloud/IconMaker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zzamjak-cloud/IconMaker/releases/tag/v0.1.0
