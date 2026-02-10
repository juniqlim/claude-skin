# claude-skin MVP 구현 플랜

## Context
Claude Code에서 한글 입력 시 커서 위치가 틀어지는 버그를 해결하기 위해, 최신 Ink(useCursor 포함)로 터미널 UI를 직접 만들어 Claude CLI를 감싼다.

## 기술 스택
- Bun + TypeScript + React Ink 6.6.0 + React 19 + string-width

## 구현 단계

### 1. 프로젝트 초기화
- `bun init`, `bun add ink react react-dom string-width`
- `tsconfig.json` (jsx: react-jsx, strict, ES2022)
- 진입점: `src/index.tsx`

### 2. Claude CLI child process 연결 (`src/claude-process.ts`)
- `Bun.spawn`으로 `claude --print --output-format stream-json --input-format stream-json --verbose` 실행
- stdout NDJSON 파싱 → 이벤트 콜백
- stdin으로 user message / control_response 전송
- 핵심 메시지 타입 처리:
  - `system/init` → session_id 저장
  - `assistant` → content 표시
  - `stream_event` → 실시간 토큰 스트리밍
  - `control_request (can_use_tool)` → 권한 요청 UI
  - `result` → 완료 표시

### 3. React Ink UI (`src/App.tsx`)
- **입력 영역**: `useInput` + `useCursor` + `string-width`로 한글 커서 정확히 위치
- **출력 영역**: 스트리밍 텍스트 표시
- **권한 요청**: tool 사용 승인/거부 프롬프트 (y/n)

### 4. 테스트
- `src/__tests__/claude-process.test.ts` — NDJSON 파싱 단위 테스트 (mock stdin/stdout)
- 수동 테스트: 실제 `claude` CLI 연결하여 한글 입력 확인

## 파일 구조
```
claude-skin/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.tsx          # 진입점 (render)
│   ├── App.tsx            # 메인 UI 컴포넌트
│   ├── claude-process.ts  # CLI child process 관리
│   ├── types.ts           # stream-json 메시지 타입
│   └── __tests__/
│       └── claude-process.test.ts
```

## 검증
1. `bun test` — NDJSON 파싱 테스트 통과
2. `bun src/index.tsx` — 앱 실행, 한글 입력 시 커서 위치 정상 확인
3. 간단한 질문 전송 → 스트리밍 응답 수신 확인
4. tool 권한 요청 → y/n 응답 → 정상 동작 확인
