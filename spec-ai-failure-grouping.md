---
title: "PRD: AI Failure Grouping"
status: Draft
date: 2026-03-06
version: "1.0"
product: Test Portal
tags: [PRD, AI, grouping, automation, feature-spec]
---

# PRD: AI Failure Grouping

> [!info] Контекст
> Automation engineer смотрит на 20+ падений в execution и вручную разбирает какие из них связаны. `error-analyzer.ts` уже делает similarity matching по тексту, но не видит семантику. `testAnalysisService` уже написал `analysisDescription` для каждого падения — это дистиллированный сигнал, готовый ко второму проходу. Идея: взять описания падений одной категории, кластеризовать LLM-ом, вернуть suggested Assumptions.

---

## 1. Problem Statement

После каждого execution с падениями automation engineer делает одно и то же: открывает каждую ошибку, читает, решает — это новый баг или то же что и в прошлый раз? Если похожие — вручную создаёт Assumption и линкует к Issue.

При 5 падениях это терпимо. При 30 — это 20 минут механической работы прежде чем он вообще начнёт чинить.

`error-analyzer.ts` пытается помочь через string similarity, но работает только если stack traces текстуально похожи. Два теста могут упасть по одной причине — например, оба валятся из-за протухшего auth токена — но в совершенно разных местах кода с разными сообщениями. Алгоритм их не свяжет.

AI может, потому что у него уже есть `analysisDescription` — короткое семантическое объяснение каждого падения, которое `testAnalysisService` уже сгенерировал при ingest. Второй проход по этим описаниям стоит дёшево и работает на смысле, а не на тексте.

---

## 2. Goals

- Automation engineer получает готовые группы падений с одной suggested root cause — не занимается сортировкой вручную.
- Suggested Assumptions создаются автоматически и ждут подтверждения — существующий workflow не меняется, просто заполняется.
- Второй LLM-вызов работает на уже дистиллированных данных, а не на сырых stack traces — предсказуемая стоимость и токены.

---

## 3. Non-Goals

| # | Что не делаем | Почему |
|---|--------------|--------|
| 1 | Автоматически подтверждать Assumptions | Automation engineer должен проверить — у него есть контекст которого у AI нет |
| 2 | Группировать все категории сразу | Запускаем по одной категории (обычно Bug). Environment-падения часто все про одно и не нуждаются в группировке |
| 3 | Запускать автоматически после каждого ingest | On-demand. Не каждый execution требует группировки, и стоимость LLM-вызова не должна быть обязательной |
| 4 | Создавать новые Issues | Только линковать к существующим. Создание Issue — отдельное решение человека |
| 5 | Работать без существующих `analysisDescription` | Если `testAnalysisService` не отработал (>50% non-passing threshold) — фича недоступна для этого execution |

---

## 4. Как это работает

### Входные данные

Для заданного `executionId` и `category` (например, `Bug`):

```
ResultError_1: { analysisDescription: "Auth token expired before test completed, login step returned 401" }
ResultError_2: { analysisDescription: "Database connection reset during query, likely connection pool exhausted" }
ResultError_3: { analysisDescription: "Auth service returned 401, token validation failed in middleware" }
ResultError_4: { analysisDescription: "Timeout waiting for element on checkout page, likely slow render" }
ResultError_5: { analysisDescription: "JWT validation rejected token, auth header missing in downstream call" }
```

### Что делает алгоритм (первый проход)

`error-analyzer.ts` быстро прогоняет similarity matching по `message` + `callStack` — формирует черновые кластеры-кандидаты по текстовой близости. Это фильтр, не финальный ответ.

### Что делает LLM (второй проход)

Берём `analysisDescription` всех ResultError-ов в категории + черновые кластеры от алгоритма. LLM:
1. Подтверждает или пересматривает алгоритмические группы
2. Ловит семантически близкие ошибки которые алгоритм разнёс (например, #1, #3, #5 выше — все про auth)
3. Для каждой группы пишет короткое `groupDescription`: "Auth token expiry — 3 failures, likely same root cause"

### Выходные данные

```json
{
  "groups": [
    {
      "groupDescription": "Auth token expiry — JWT validation failing across multiple tests",
      "confidence": 0.91,
      "resultErrorIds": ["err_1", "err_3", "err_5"],
      "suggestedIssueQuery": "auth token"
    },
    {
      "groupDescription": "Database connection pool exhausted",
      "confidence": 0.85,
      "resultErrorIds": ["err_2"]
    },
    {
      "groupDescription": "UI render timeout on checkout",
      "confidence": 0.78,
      "resultErrorIds": ["err_4"]
    }
  ]
}
```

Каждая группа → `suggestedAssumptions[]` для ошибок внутри, если пользователь принимает — создаются `Assumption`-записи в БД через существующий flow.

---

## 5. Requirements

### P0 — Must Have

| ID | Требование | Acceptance Criteria |
|----|-----------|---------------------|
| P0-1 | **POST /api/v2/executions/:id/group-failures** | Принимает `{ category: "Bug" }`. Возвращает массив групп с `groupDescription`, `confidence`, `resultErrorIds`. Требует: все ResultError-ы в категории имеют `analysisDescription`. |
| P0-2 | **Hybrid pipeline** | Сначала `error-analyzer.ts` — текстовые кластеры-кандидаты. Потом LLM-проход по `analysisDescription` с кластерами как hint. LLM может объединять и разбивать кластеры. |
| P0-3 | **Prompts на `analysisDescription`, не на raw stack traces** | В LLM-запрос идут только `resultErrorId` + `analysisDescription`. Stack traces — не передаются. Держит токены предсказуемыми. |
| P0-4 | **Graceful degradation** | Если LLM недоступен или таймаут (8 с) — возвращаем алгоритмические кластеры от `error-analyzer.ts` с `source: "algorithmic"`. Endpoint никогда не возвращает 500 из-за AI. |
| P0-5 | **Guard: минимум 2 ошибки в категории** | Если в категории < 2 ResultError-ов — возвращаем `{ groups: [], reason: "insufficient_failures" }`. Нет смысла группировать одно падение. |
| P0-6 | **Guard: analysisDescription должны существовать** | Если хотя бы у 50% ResultError-ов нет `analysisDescription` — возвращаем `{ groups: [], reason: "analysis_not_complete" }`. Ждём пока `testAnalysisService` отработает. |
| P0-7 | **Результат не персистируется** | Группировка — это suggestion на момент запроса, не хранимое состояние. Пользователь сам решает принять или нет. |
| P0-8 | **Принятие группы → Assumptions** | POST /api/v2/executions/:id/group-failures/accept — принимает `{ groupResultErrorIds: [...], issueId }` и создаёт Assumptions через существующий `assumptionService`. |

### P1 — Nice to Have

| ID | Требование | Описание |
|----|-----------|---------|
| P1-1 | **suggestedIssueQuery в ответе** | LLM генерирует короткий поисковый запрос для каждой группы — чтобы UI мог автоматически подставить его в поиск по Issues при выборе к чему линковать. |
| P1-2 | **Группировка по нескольким категориям** | Параметр `categories: ["Bug", "Script"]` вместо одной. LLM получает более широкий контекст. |
| P1-3 | **MCP tool: `group-execution-failures`** | AI-агенты могут запускать группировку программно и затем сразу подтверждать Assumptions. |
| P1-4 | **Кэширование результата** | Хранить последний результат группировки для execution в памяти (Redis или in-memory) на 10 минут — повторный запрос не тратит LLM-токены. |

### P2 — Future

- Автоматический запуск группировки после ingest если число Bug-падений > N (configurable threshold).
- Feedback loop: если automation engineer регулярно разбивает группы которые LLM объединил — учитывать это в промпте.
- Интеграция с Issues: если у группы `suggestedIssueQuery` и есть точное совпадение в существующих Issues — автоматически предложить конкретный Issue, не просто запрос.

---

## 6. Prompt design

```
Ты анализируешь падения тестов. Тебе даны описания ошибок (уже обработанные AI)
из одного test execution. Сгруппируй их по вероятной общей root cause.

Ошибки:
{{#each errors}}
[{{id}}] {{analysisDescription}}
{{/each}}

Черновые группы от similarity алгоритма (используй как hint, не как правило):
{{algorithmicClusters}}

Верни JSON строго в формате:
{
  "groups": [
    {
      "resultErrorIds": ["id1", "id2"],
      "groupDescription": "краткое описание общей причины, 1 предложение",
      "confidence": 0.0-1.0,
      "suggestedIssueQuery": "2-3 слова для поиска по issues"
    }
  ]
}

Правила:
- Каждый id должен быть ровно в одной группе
- Одиночные ошибки без пары тоже включай как группу из 1 элемента
- confidence отражает уверенность что это одна root cause, не качество описания
- suggestedIssueQuery — на языке оригинальных описаний
```

> [!note] Structured output через LangChain
> Использовать тот же паттерн что в `testAnalysisService` — LangChain structured output с Zod-схемой. Гарантирует валидный JSON без постобработки.

---

## 7. Файлы

```
src/services/
  failureGroupingService.ts     CREATE  orchestration: error-analyzer → LLM → merge

src/prompts/
  failure-grouping.ts           CREATE  промпт + Zod output schema

src/controllers/
  executionController.ts        MODIFY  добавить groupFailures(), acceptGroup()

src/routes/
  executionRoutes.ts            MODIFY  POST /:id/group-failures, POST /:id/group-failures/accept

src/lib/openapi/
  executionGrouping.ts          CREATE  OpenAPI schemas

src/mcp/tools/
  executions.ts                 MODIFY  добавить group-execution-failures (P1)

__tests__/services/
  failureGroupingService.test.ts  CREATE  guards, graceful degradation, merge logic
```

---

## 8. Open Questions

| # | Вопрос | Блокирует? |
|---|-------|-----------|
| OQ-1 | Передавать ли `errorQualityScore` в промпт как дополнительный сигнал? Плохо описанная ошибка может дать неточную группировку, и LLM мог бы это учитывать. | Нет |
| OQ-2 | Сколько ResultError-ов максимум в одном LLM-запросе? При 100+ падениях нужен batching или pre-filter. | Да — до implementation |
| OQ-3 | Логировать ли использование группировки в LangSmith (как `testAnalysisService`)? Для оценки качества групп со временем. | Нет |

---

> *Gap подтверждён в `reports/report.md` ("most frequently failing test cases") и в архитектуре `error-analyzer.ts` — алгоритмическая similarity не покрывает семантику.*
