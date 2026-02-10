# claude-skin

Claude Code CLI를 React Ink로 감싸서 터미널 UI를 커스터마이징하는 프로젝트.

## 왜 만드는가

- Claude Code에서 **한글 입력 시 커서 위치가 틀어지는 버그**가 있음
- Claude Code는 Bun 단일 바이너리로 번들되어 있어서 내부 Ink 버전을 직접 패치할 수 없음
- Ink PR [#866](https://github.com/vadimdemedes/ink/pull/866)에서 `useCursor()` 훅으로 CJK IME 커서 문제가 해결됨 (이미 머지됨)
- 공식 반영을 기다리기보다, 직접 최신 Ink로 UI를 만들어 해결

## 핵심 아이디어

- Claude Code CLI를 child process로 실행
- `claude --print --output-format stream-json --input-format stream-json` (공식 플래그)
- stdin/stdout 파이프로 통신 → **기존 구독 요금 그대로 사용**
- React Ink로 터미널 UI 렌더링 → 한글 커서 수정 + UI 자유 커스터마이징

## 검토한 대안들

| 방식 | 과금 | 안정성 | 채택 |
|------|------|--------|------|
| `@anthropic-ai/claude-agent-sdk` | API 토큰 과금 (비쌈) | 공식, 안정적 | X |
| `--sdk-url` WebSocket (Companion 방식) | 구독 유지 | 비공식 숨겨진 플래그, 막힐 수 있음 | X |
| `--print --stream-json` stdin/stdout | 구독 유지 | 공식 플래그, 안정적 | O |

## 기술 스택

- **Bun** - 런타임
- **React Ink** (최신, useCursor 포함) - 터미널 UI
- **TypeScript**

## MVP 범위

1. React Ink 앱 세팅
2. Claude CLI child process 연결 (stream-json)
3. 입력 → 스트리밍 응답 표시
4. `useCursor()`로 한글 커서 수정

## 참고

- [Ink PR #866 - IME cursor positioning](https://github.com/vadimdemedes/ink/pull/866)
- [Companion 프로젝트](https://github.com/The-Vibe-Company/companion) - `--sdk-url` 방식의 웹 UI 래퍼
- Companion 소스: `~/j/companion`
