# Next Steps

## 1. stream-json 입력 프로토콜 검증
- 현재 `{ type: "user", message: { role: "user", content: "..." } }` 형식 사용 중
- 멀티턴 대화가 실제로 동작하는지 테스트 필요
- `session_id` 관리 (init에서 받은 ID를 후속 메시지에 사용)

## 2. tool 권한 요청/응답 구현
- 현재 UI에서 y/n 입력은 받지만 실제로 Claude 프로세스에 응답을 보내지 않음
- stream-json에서 tool 승인/거부 응답 형식 확인 및 구현

## 3. 스트리밍 토큰 표시
- `--include-partial-messages` 플래그 추가 완료
- `stream_event` / `content_block_delta` 파싱 및 실시간 텍스트 업데이트 구현

## 4. UX 개선
- 입력 히스토리 (↑/↓ 키)
- 멀티라인 입력
- 출력 스크롤
- Ctrl+C 정리 (프로세스 종료 확인)

## 5. 스테이트리스 모드 (컨텍스트 최소화)
- 세션을 유지하지 않고 매 질의마다 새 Claude 프로세스를 호출
- 컨텍스트가 매번 0에서 시작 → 토큰 절약, 응답 속도 향상
- 필요한 맥락은 md 파일에서 읽어서 질의에 포함
- 보존할 결과만 md 파일에 append
- 용도: 반복적인 단발 질의, 메모 기반 워크플로우
