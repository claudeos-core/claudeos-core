# CLAUDE.md — sample-project

> 한국어 샘플 CLAUDE.md (validator 테스트용).

## 1. Role Definition (역할 정의)

당신은 이 저장소의 시니어 개발자로서 코드 작성, 수정, 리뷰를 담당합니다. 응답은 한국어로 작성해야 합니다.
PostgreSQL 관계형 저장소 위에 올라간 Node.js Express REST API 서버.

## 2. Project Overview (프로젝트 개요)

| 항목 | 값 |
|---|---|
| 언어 | TypeScript 5.4 |
| 프레임워크 | Express 4.19 |
| 빌드 도구 | tsc |
| 패키지 매니저 | npm |
| 서버 포트 | 3000 |
| 데이터베이스 | PostgreSQL 15 |
| ORM | Prisma 5 |
| 테스트 러너 | Vitest |

## 3. Build & Run Commands (빌드 / 실행 명령)

```bash
npm install
npm run dev
npm run build
npm test
```

`package.json` 스크립트를 유일한 정답으로 취급합니다.

## 4. Core Architecture (핵심 아키텍처)

### 전체 구조

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### 데이터 흐름

1. 요청이 라우터에 도달.
2. 미들웨어가 인증을 검증.
3. 서비스가 비즈니스 로직 수행.
4. Prisma가 DB 읽기/쓰기.
5. 응답을 직렬화.

### 핵심 패턴

- **레이어드**: router → service → repository.
- **DTO 검증**: 라우터 경계에서 zod 스키마.
- **에러 미들웨어**: 중앙 집중식 에러 처리.

## 5. Directory Structure (디렉토리 구조)

```
sample-project/
├─ src/
└─ tests/
```

**자동 생성**: 없음.
**테스트 범위**: `tests/`가 `src/`를 미러링.
**빌드 출력**: `dist/`.

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills 참조)

### Standard (단일 정보 출처)

| 경로 | 설명 |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | 프로젝트 개요 |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | 문서 작성 가이드 |

### Rules (자동 로드 가드레일)

| 경로 | 설명 |
|---|---|
| `.claude/rules/00.core/*` | 코어 룰 |
| `.claude/rules/60.memory/*` | L4 메모리 가드 |

### Skills (자동화 절차)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (직접 읽지 않을 파일)

| 경로 | 이유 |
|---|---|
| `claudeos-core/guide/` | 사람이 읽는 문서 |
| `dist/` | 빌드 출력 |
| `node_modules/` | 의존성 |

## 8. Common Rules & Memory (L4) (공통 룰 & 메모리 (L4))

### 공통 룰 (모든 편집 시 자동 로드)

| 룰 파일 | 역할 | 핵심 강제 |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | 문서 작성 룰 | paths 필수, 하드코딩 금지 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 작업 룰 | 사실 기반, 편집 전 Read 필수 |

자세한 내용은 `claudeos-core/standard/00.core/04.doc-writing-guide.md` 참고.

### L4 메모리 (온디맨드 참조)

장기 컨텍스트 (결정 / 실패 / 압축 / 자동 제안)는 `claudeos-core/memory/`에 저장됩니다.
`paths`로 자동 로드되는 rules와 달리, 이 레이어는 **온디맨드**로 참조됩니다.

#### L4 메모리 파일

| 파일 | 목적 | 동작 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 설계 결정의 근거 | Append-only. 세션 시작 시 훑어봄. |
| `claudeos-core/memory/failure-patterns.md` | 반복되는 에러 | 세션 시작 시 검색. |
| `claudeos-core/memory/compaction.md` | 4단계 압축 정책 | 정책 변경 시에만 수정. |
| `claudeos-core/memory/auto-rule-update.md` | 룰 변경 제안 | 검토하고 수용. |

#### 메모리 워크플로

1. 세션 시작 시 failure-patterns 스캔.
2. 최근 결정 훑어보기.
3. 새 결정을 append.
4. 반복되는 에러를 pattern-id로 등록.
5. 400줄 접근 시 compact 실행.
6. rule-update 제안 검토.

## 9. 메모리 (L4)

> 자동 로드되는 공통 가드레일과 온디맨드 참조 장기 메모리 파일.

### 공통 룰 (모든 편집 시 자동 로드)

| 룰 파일 | 역할 |
|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | 문서 작성 룰 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 작업 룰 |

### L4 메모리 파일

| 파일 | 목적 | 동작 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 설계 결정의 근거 | Append-only. |
| `claudeos-core/memory/failure-patterns.md` | 반복되는 에러 | 세션 시작 시 검색. |
| `claudeos-core/memory/compaction.md` | 4단계 압축 정책 | 정책 변경 시에만 수정. |
| `claudeos-core/memory/auto-rule-update.md` | 룰 변경 제안 | 검토. |
