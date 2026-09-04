# Don't ₩orry (돈워리)

외국인 근로자(우선 E-9 베트남 페르소나)를 위한 출국 준비 금융·행정 안내 서비스.
사용자의 자연어 질문 → Rule Engine 판정 → Workflow(처리순서) → 금융상품 매칭 → AI 재무 브리핑까지
이어지는 실제 동작하는 MVP입니다.

## 서비스 구조

```
frontend/  Next.js 14 (App Router, TypeScript, Tailwind) — PWA, 모바일 우선 UI
backend/   FastAPI (Python) — Rule Engine, Workflow Engine, 외부 API 연동, AI 서비스
```

LLM은 (1) 자연어 → 구조화(F1), (2) 정해진 Action Catalog 안에서의 우선순위 랭킹(F10) 두 곳에만
쓰입니다. 자격판정·기간·서류·금융계산·신호등은 전부 결정론적 코드(Rule Engine / Calculator)가
계산하며, LLM이 이 결과를 뒤집거나 새로운 규칙을 만들 수 없습니다.

## 기능 (MVP)

| 코드 | 기능 |
|---|---|
| F1 | 다국어(한/영/베트남어) 자연어 질문 → 구조화 (`/api/intent`) |
| F2 | 업무별 GREEN/AMBER/RED/N-A 신호등 판정 (`/api/rules/evaluate`) |
| F3 | REQUIRED_BEFORE/RECOMMENDED_BEFORE 기반 처리순서 계산 (`/api/departure/plan`) |
| F4 | 필요서류 체크리스트 · 준비도(%) (`/api/documents/readiness`) |
| F5 | 외국인 전용/서민금융 whitelist + 금감원 공시 상품 조회 (`/api/finance/*`) |
| F6 | 체류기간 자산목표 플래너 (`/api/planner/calculate`, `/api/scenario`) |
| F7 | 출국 D-Day 금융체크 (`/api/dday/{date}`) |
| F8 | 은행원용 사전상담 카드 (프론트엔드 화면, 서버에 저장하지 않음) |
| F10 | AI 통합 재무 브리핑 — Crisis Signal → Action Catalog → 제한된 AI 랭킹 (`/api/briefing`) |

국민연금 반환일시금(`pension_engine.py`)과 E-9 체류/사증 규칙(`immigration_engine.py`)은
별도 Rule Engine 모듈로 분리되어 있습니다. **국적만으로 반환일시금 대상에서 제외하지 않으며**,
판정 우선순위는 체류자격(비자) 기반 → 사회보장협정 → 상응성 순서입니다.

## 기술 스택

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS, PWA(`manifest.json`)
- Backend: FastAPI + Pydantic v2
- Rule data: JSON seed (`backend/data/seed/`)
- LLM: Anthropic API (`claude-sonnet-5`), 키 없으면 결정론적 fallback으로 자동 대체
- 외부 API: 금융감독원 FINE Open API (예금/적금 상품)

## 환경변수

### backend/.env (`.env.example` 참고)

```
FSS_API_KEY=              # 금융감독원 FINE Open API 인증키
ANTHROPIC_API_KEY=        # Anthropic API 키 (없으면 규칙 기반 fallback 사용)
ECOS_API_KEY=              # 한국은행 ECOS Open API 인증키
JUSTICE_STATS_API_KEY=     # 법무부 체류외국인 통계 공공데이터포털 인증키
CORS_ALLOW_ORIGINS=http://localhost:3000
APP_ENV=development
```

### frontend/.env.local (`.env.example` 참고)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**API 키는 절대 커밋하지 마세요.** `.gitignore`에 `.env*`가 등록되어 있고,
`backend/tests/test_security.py`가 저장소 전체를 스캔해 실제 키 값이 섞여 들어가지
않았는지 자동 검증합니다.

## 로컬 실행

### Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # 값 채우기
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000` 접속 → 온보딩에서 "데모로 체험하기"를 누르면 응우옌 민(베트남,
E-9, 출국 D-40) 데모 페르소나로 전체 플로우를 바로 확인할 수 있습니다.

## Rule Engine 구조

- `backend/app/rules/engine.py` — 출국 관련 공통 Rule Graph(신호등 계산 + 위상정렬 워크플로우)
- `backend/app/rules/pension_engine.py` — 국민연금 반환일시금 (비자기반 → 사회보장협정 → 상응성)
- `backend/app/rules/immigration_engine.py` — E-9 체류·사증 세부 규칙 (2026-09-01 매뉴얼 기준),
  결과는 `CONFIRMED / CONDITIONAL / ADDITIONAL_REVIEW / EXTERNAL_RULESET_REQUIRED / NOT_SUPPORTED` 중 하나
- `backend/app/services/action_catalog_service.py` — F10 Crisis Signal → 고정 Action Catalog 매핑

모든 Rule 노드/결과는 `source_id`를 가지며, `/api/sources/{source_id}`에서 원문 출처·신뢰도
등급(`authority_grade`)·최종 확인일을 조회할 수 있습니다.

## AI 역할과 GUARD

- `backend/app/services/ai_service.py`
  - `extract_intent`: 자연어 → `intent_candidates`(사전 정의된 task_type 중에서만 선택)
  - `rank_actions`: Action Catalog 후보 안에서만 최대 3개 우선순위 랭킹. **Catalog 밖의
    action_id를 반환하면 GUARD가 거부하고 규칙 기반 fallback 우선순위를 사용합니다**
    (`tests/test_ai_service_guard.py`로 검증).
  - `ANTHROPIC_API_KEY`가 없거나 호출이 실패해도 앱은 죽지 않고 결정론적 결과로 대체됩니다.

## Source Registry

`backend/data/seed/source_registry.json`에 모든 원문 출처(기관/URL/신뢰도등급/최종확인일)가
등록되어 있습니다. `status: ENDED`인 데이터(예: 근로자햇살론, 2025-12-31 보증 종료)는
상품 추천 결과에서 자동으로 제외됩니다(`product_service.get_whitelisted_products`).

## 테스트

```bash
cd backend
./.venv/Scripts/python.exe -m pytest -q
```

핵심 회귀 테스트:
- 베트남 + E-9 + NPS 가입 → 국적 때문에 반환일시금 대상에서 제외되지 않음
- E-8 연수취업(과거) vs E-8 계절근로 결과가 다름
- E-9 근무처 변경 1회/3회 한도 규칙
- 출국예정신고 → 출국예정사실확인서 선행 관계
- 귀국비용보험 필요서류 목록
- 자산목표 플래너 계산
- 금감원 API 응답 정규화(baseList/optionList 병합)
- `ENDED` 금융상품 추천 제외
- Action Catalog 밖 LLM 액션 GUARD 차단
- API 키가 프론트엔드 빌드 산출물에 노출되지 않음

## 배포

- Frontend → Vercel 권장 (`frontend/` 를 루트로 지정, 환경변수 `NEXT_PUBLIC_API_BASE_URL`
  에 배포된 백엔드 URL 입력)
- Backend → Render/Railway/Fly.io 등 권장 (`backend/` 를 루트로 지정, 시작 명령
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, 환경변수는 위 목록 참고)

배포 완료 후 실제 접속 URL은 이 섹션에 갱신합니다.

## API 엔드포인트 요약

```
GET  /api/health
GET  /api/demo/persona
POST /api/intent
POST /api/rules/evaluate
POST /api/departure/plan
GET  /api/immigration/rules
GET  /api/immigration/rules/{rule_id}
POST /api/pension/evaluate
POST /api/documents/readiness
GET  /api/finance/deposits
GET  /api/finance/savings
GET  /api/finance/whitelist
POST /api/planner/calculate
POST /api/scenario
GET  /api/dday/{departure_date}
POST /api/briefing
GET  /api/sources
GET  /api/sources/{source_id}
```
