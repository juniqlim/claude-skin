# claude-skin

Claude Code CLI의 터미널 UI를 자유롭게 커스터마이징하는 프로젝트.

## 왜 만드는가

- Claude Code의 터미널 UI는 고정되어 있어서 변경할 수 없음
- 테마, 레이아웃, 단축키 등을 내 취향에 맞게 바꾸고 싶음
- Claude CLI를 child process로 감싸고, React Ink로 UI를 직접 렌더링

## 핵심 아이디어

- Claude Code CLI를 child process로 실행
- `claude --print --output-format stream-json --input-format stream-json` (공식 플래그)
- stdin/stdout 파이프로 통신 → 기존 구독 요금 그대로 사용
- React Ink로 터미널 UI 렌더링 → UI 자유 커스터마이징

## 기술 스택

- **Bun** - 런타임
- **React Ink** - 터미널 UI
- **TypeScript**

