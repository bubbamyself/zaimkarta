# Prompt: SeoTool MVP Implementation

```text
Мы продолжаем проект ZaimKarta.

Контекст:
ZaimKarta — это моя SEO-витрина микрозаймов. Я сам выбираю офферы в CPA-сетях, сам добавляю их в админку и сам решаю, какие офферы показывать на сайте.

Проект НЕ является:
- маркетплейсом для CPA-сетей;
- кабинетом рекламодателей;
- форумом;
- сервисом отзывов;
- личным кабинетом заемщика;
- CMS уровня WordPress.

Что уже есть:
1. Админка офферов.
2. CPA-переход `/go/[slug]`.
3. SEO-страницы:
   - `SeoPage`;
   - `SeoPageOffer`;
   - `SeoPageFaqItem`;
   - типы `CATEGORY / ARTICLE / SERVICE`;
   - статусы `DRAFT / PUBLISHED / PAUSED / ARCHIVED`;
   - публичная `/[slug]`;
   - базовая админка SEO-страниц;
   - выбор офферов;
   - порядок офферов;
   - FAQ.

Принятое продуктовое решение:
ZaimKarta развивается как SEO-система с reusable-интерактивными инструментами.

Нужно разделить:
- `SeoPage` — публичная SEO-страница;
- `SeoTool` — переиспользуемый интерактивный инструмент;
- `SeoPageTool` — подключение инструмента к странице;
- `SeoPage.contentBlocks` — простая JSON-структура тела страницы;
- `SeoPageOffer` — контекстная связь страницы с оффером.

Интерактивные инструменты не откладываем на потом. Они являются ядром SEO-системы.

Цель текущего этапа:
Реализовать первый рабочий слой интерактивного ядра:
1. модель данных;
2. seed двух инструментов;
3. публичные компоненты калькулятора и чек-листа;
4. подключение инструмента к SEO-странице;
5. минимальный renderer `contentBlocks`;
6. минимальную админку “Интерактивные инструменты”.

Не нужно делать весь большой roadmap сразу.

Работай как senior engineer и PM/CTO. Сначала изучи текущую структуру проекта, Prisma-схему, seed, публичную `/[slug]`, админку SEO-страниц и текущие компоненты офферов. Потом реализуй изменения в стиле текущего кода.

Требования к базе:

1. Добавить enum:

```prisma
enum SeoToolStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum SeoToolType {
  OVERPAYMENT_CALCULATOR
  APPLICATION_CHECKLIST
  MINI_OFFER_PICKER
  LOAN_TYPE_QUIZ
  COMPARISON
}

enum SeoToolVariant {
  FULL
  COMPACT
  INLINE
}

enum SeoPageIntent {
  COMMERCIAL
  INFORMATIONAL
  SERVICE
  MIXED
}
```

2. Добавить `SeoTool`:

```prisma
model SeoTool {
  id           String        @id @default(cuid())
  slug         String        @unique
  type         SeoToolType
  status       SeoToolStatus @default(DRAFT)
  name         String
  title        String
  description  String?
  config       Json
  defaultBlock Json?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  pageTools    SeoPageTool[]

  @@index([type])
  @@index([status])
}
```

3. Добавить `SeoPageTool`:

```prisma
model SeoPageTool {
  id        String         @id @default(cuid())
  pageId    String
  toolId    String
  position  Int            @default(100)
  blockId   String?
  variant   SeoToolVariant @default(FULL)
  title     String?
  intro     String?
  config    Json?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  page      SeoPage        @relation(fields: [pageId], references: [id], onDelete: Cascade)
  tool      SeoTool        @relation(fields: [toolId], references: [id], onDelete: Restrict)

  @@index([pageId, position])
  @@index([toolId])
  @@unique([pageId, blockId])
}
```

4. Расширить `SeoPage`:
- `intent SeoPageIntent?`;
- `contentBlocks Json?`;
- relation `tools SeoPageTool[]`.

5. Расширить `SeoPageOffer`:
- `badge String?`;
- `note String?`;
- `ctaText String?`;
- `highlight Boolean @default(false)`.

Seed:
1. Создать `overpayment-calculator`.
2. Создать `application-checklist`.
3. Создать демо `SERVICE`-страницы для каждого инструмента.
4. Подключить калькулятор к одной существующей подборке, например `zaimy-na-kartu`.
5. Не ломать существующие seed-офферы и SEO-страницы.

Калькулятор переплаты:

Config:

```json
{
  "version": 1,
  "defaults": {
    "amount": 10000,
    "termDays": 14,
    "dailyRate": 0.8
  },
  "limits": {
    "amountMin": 1000,
    "amountMax": 100000,
    "termMinDays": 1,
    "termMaxDays": 365,
    "dailyRateMin": 0,
    "dailyRateMax": 1
  },
  "steps": {
    "amount": 1000,
    "termDays": 1,
    "dailyRate": 0.1
  },
  "labels": {
    "amount": "Сумма займа",
    "termDays": "Срок, дней",
    "dailyRate": "Ставка в день"
  },
  "result": {
    "title": "Ориентировочный расчет",
    "formulaNote": "Расчет примерный и не является условиями договора.",
    "showTotalReturn": true,
    "showOverpayment": true,
    "showDailyCost": true
  },
  "cta": {
    "text": "Посмотреть предложения",
    "target": "offers"
  },
  "offers": {
    "source": "page",
    "limit": 3,
    "fallback": "active"
  },
  "riskNotice": {
    "text": "Расчет показывает ориентировочную переплату. Точные условия, полная стоимость займа, комиссии, штрафы и порядок продления нужно проверять в договоре конкретной МФО перед подписанием."
  }
}
```

Формула MVP:

```ts
interest = amount * (dailyRate / 100) * termDays
totalReturn = amount + interest
dailyCost = interest / termDays
```

Важно:
Калькулятор не должен обещать точный расчет договора. Он показывает ориентировочную переплату.

Чек-лист готовности к заявке:

Использовать 5 вопросов:
1. Паспорт под рукой и данные актуальны?
2. Есть именная банковская карта?
3. Понимаете, из каких средств будете возвращать займ?
4. Посчитали примерную переплату?
5. Готовы внимательно прочитать договор перед подписанием?

Каждый вопрос:
- Да = 2;
- Не уверен / примерно / постараюсь = 1;
- Нет = 0.

Результаты:
- 80-100%: хорошо подготовились;
- 40-79%: есть что проверить;
- 0-39%: лучше не спешить.

Публичные компоненты:
1. `OverpaymentCalculator`
   - client component;
   - amount, termDays, dailyRate;
   - live result;
   - CTA к офферам;
   - risk notice;
   - не собирать персональные данные.

2. `ApplicationChecklist`
   - client component;
   - вопросы с вариантами;
   - результат после выбора;
   - советы по слабым пунктам;
   - CTA;
   - risk notice;
   - не сохранять результат пользователя.

Renderer:
Сделать минимальный renderer для `SeoPage.contentBlocks`.

Поддержать блоки:
- `paragraph`;
- `heading`;
- `list`;
- `callout`;
- `offers`;
- `tool`;
- `faq`;
- `riskNotice`;
- `cta`.

Логика `tool` block:

```ts
for each block in seoPage.contentBlocks:
  if block.type === "tool":
    pageTool = seoPage.tools.find(item => item.blockId === block.blockId)
    if !pageTool -> public: hide, admin preview: warning
    if pageTool.tool.status !== "ACTIVE" -> public: hide
    mergedConfig = deepMerge(pageTool.tool.config, pageTool.config)
    render by pageTool.tool.type
```

Правила:
- `SeoTool.config` — базовая правда;
- `SeoPageTool.config` — локальный override;
- `SeoPageTool.title` переопределяет `SeoTool.title`;
- `SeoPageTool.intro` переопределяет `SeoTool.description`;
- `variant` управляет размером компонента.

Админка:
Добавить раздел “Интерактивные инструменты”.

MVP-функции:
- список инструментов;
- создать инструмент;
- редактировать инструмент;
- статус;
- тип;
- базовый config;
- где используется;
- preview можно сделать минимальным или отложить, если слишком раздувает задачу.

Важно:
Для MVP можно сделать формы проще. Если типовые формы слишком велики, допустимо временно использовать textarea для JSON config, но с валидацией и понятной ошибкой. Лучше, если для калькулятора и чек-листа будут хотя бы базовые typed поля.

Подключение инструмента к SEO-странице:
В редактор SEO-страницы добавить блок “Интерактивные сервисы”:
- выбрать существующий инструмент;
- variant: FULL / COMPACT / INLINE;
- локальный заголовок;
- локальный intro;
- position;
- blockId;
- удалить подключение со страницы без удаления инструмента.

Если у страницы есть `contentBlocks`, место инструмента задается блоком:

```json
{
  "id": "tool-1",
  "type": "tool",
  "blockId": "overpayment-main"
}
```

Проверки:
Для `SeoTool`:
- slug указан;
- name указан;
- title указан;
- type указан;
- config валиден для типа;
- riskNotice есть в config;
- ACTIVE нельзя сохранить с невалидным config;
- ARCHIVED нельзя поставить, если инструмент используется на опубликованных страницах.

Для `SeoPage`:
- опубликованная страница не использует DRAFT/PAUSED/ARCHIVED инструменты;
- если в `contentBlocks` есть `tool`, должен существовать `SeoPageTool.blockId`;
- SERVICE-страница должна иметь хотя бы один ACTIVE инструмент;
- CATEGORY и ARTICLE могут не иметь инструментов.

Что не делать сейчас:
- mini offer picker;
- loan type quiz;
- comparison tool;
- личные кабинеты;
- сбор персональных данных;
- сохранение результатов;
- сложную аналитику;
- A/B-тесты;
- CPA API;
- visual builder;
- отзывы;
- форум;
- рейтинговую систему.

Проверить:
- Prisma migration;
- Prisma generate;
- seed;
- `npm run lint`;
- `npm run build`.

Ожидаемый результат:
1. Я могу открыть админку и увидеть раздел “Интерактивные инструменты”.
2. Я могу создать/редактировать калькулятор или чек-лист.
3. Я могу подключить инструмент к SEO-странице.
4. Публичная SEO-страница рендерит инструмент.
5. У калькулятора работает расчет.
6. У чек-листа работает scoring.
7. Неактивный инструмент не ломает публичную страницу.
8. Существующий CPA-flow `/go/[slug]` не сломан.
```
