# SlotKing - 모던 미팅 스케줄링 앱

SlotKing은 미팅 일정을 쉽게 조율할 수 있는 웹 애플리케이션입니다. 다양한 시간대와 일정을 가진 참가자들 간에 최적의 미팅 시간을 찾는 것을 도와줍니다.

## 주요 기능

- 주간 캘린더 뷰로 시간 슬롯 선택
- 드래그 앤 드롭으로 여러 시간 슬롯 선택
- 선택한 시간 슬롯 시각적 표시
- 타임 슬롯 그룹 관리 (추가/삭제)
- 모든 참가자가 투표 가능한 투표 모드
- 실시간 시각적 피드백과 애니메이션

## 기술 스택

- React.js
- TypeScript
- Tailwind CSS
- shadcn/ui 컴포넌트 라이브러리
- date-fns 날짜 처리
- 상태 관리 (React Hooks)
- 애니메이션 효과 (party.js)

## 프로젝트 구조

- `client/`: 프론트엔드 코드
  - `components/`: 재사용 가능한 UI 컴포넌트
  - `pages/`: 페이지 컴포넌트
  - `hooks/`: 커스텀 React 훅
  
- `server/`: 백엔드 코드
  - `routes.ts`: API 엔드포인트
  - `storage.ts`: 데이터 저장소 인터페이스

- `shared/`: 프론트엔드와 백엔드 간 공유 코드
  - `schema.ts`: 데이터 모델 및 유효성 검사 스키마

## 실행 방법

1. 저장소 클론:
   ```bash
   git clone <repository-url>
   cd slotking-calendar-app
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 개발 서버 실행:
   ```bash
   npm run dev
   ```

4. 브라우저에서 `http://localhost:5000` 접속

## 상태 동기화 문제 해결

이 프로젝트에서는 다음과 같은 상태 동기화 관련 문제를 해결했습니다:

1. 타임 슬롯 삭제 시 모든 슬롯이 함께 삭제되는 문제
2. 슬롯 삭제 후 새 슬롯 생성 시 이전 삭제된 슬롯이 다시 나타나는 캐싱 문제

해결책:
- SimpleWeeklyCalendar 컴포넌트를 완전한 제어 컴포넌트로 변환
- 부모 컴포넌트와 자식 컴포넌트 사이의 상태 동기화 로직 개선
- useEffect 훅 의존성 배열 최적화
- 내부 상태 변수 리네이밍(selectionGroups → internalGroups)
- isAddOperation 매개변수를 통한 추가/삭제 작업 구분