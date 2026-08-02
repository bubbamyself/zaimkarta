-- Publish the three approved calculators without depending on production seed runs.
-- Existing rows with the same slugs are updated in place; unrelated SEO data is untouched.

INSERT INTO "SeoTool" (
    "id",
    "slug",
    "type",
    "status",
    "name",
    "title",
    "description",
    "config",
    "defaultBlock",
    "createdAt",
    "updatedAt"
)
VALUES
    (
        'zk-tool-repayment-date-v1',
        'repayment-date-calculator',
        'REPAYMENT_DATE_CALCULATOR',
        'ACTIVE',
        'Калькулятор даты возврата',
        'Калькулятор даты возврата займа',
        'Укажите дату получения денег и срок займа. Калькулятор покажет ориентировочную дату возврата.',
        $json${"version":1,"defaults":{"termDays":30},"limits":{"termMinDays":1,"termMaxDays":365},"quickTerms":[7,14,21,30],"labels":{"startDate":"Когда вы получили деньги?","termDays":"На какой срок вы взяли займ?","termUnit":"дней"},"result":{"titleTemplate":"Вернуть займ: {date}","pastText":"Расчетная дата возврата уже прошла. Проверьте актуальный статус займа в личном кабинете кредитора.","todayText":"Расчетная дата возврата приходится на сегодня.","futureTextTemplate":"До расчетной даты осталось {days}.","weekendWarning":"Расчетная дата приходится на выходной. Возможность переноса платежа зависит от условий договора и правил кредитора."},"cta":{"text":"Посмотреть предложения","target":"offers"},"riskNotice":{"text":"Расчет носит справочный характер. Точная дата возврата, порядок исчисления срока и условия платежа указаны в договоре займа и личном кабинете кредитора."}}$json$::jsonb,
        $json${"id":"tool-1","type":"tool","blockId":"repayment-date-main"}$json$::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'zk-tool-loan-comparison-v1',
        'loan-comparison',
        'COMPARISON',
        'ACTIVE',
        'Сравнение двух займов',
        'Сравнение двух займов',
        'Сравните два оффера по сумме, сроку, региону и ключевым условиям без выбора победителя.',
        $json${"version":1,"defaults":{"amount":10000,"termDays":14,"priority":"none"},"limits":{"amountMin":1000,"amountMax":100000,"termMinDays":1,"termMaxDays":365},"steps":{"amount":1000,"termDays":1},"quickAmounts":[5000,10000,15000,30000],"quickTerms":[7,14,21,30],"priorities":[{"value":"none","label":"Без приоритета"},{"value":"min_overpayment","label":"Минимальная ориентировочная переплата"},{"value":"fast_decision","label":"Быстрое решение"},{"value":"payout_method","label":"Удобный способ получения"},{"value":"simple_requirements","label":"Минимум требований"}],"labels":{"firstOffer":"Первый оффер","secondOffer":"Второй оффер","amount":"Сумма займа","termDays":"Срок займа","priority":"Что важнее"},"result":{"title":"Сравнение по выбранным параметрам","sameCostText":"По доступным данным существенной разницы в стоимости не найдено.","notAvailableText":"Оффер не подходит под выбранные параметры."},"rows":["eligibility","overpayment","totalReturn","psk","decisionTime","payoutMethods","repaymentMethods","documents","requirements","warnings","conditionsCheckedAt"],"cta":{"text":"Перейти к предложению","target":"offer"},"riskNotice":{"text":"Расчет носит справочный характер и выполнен по опубликованным диапазонам ставок. Точные ставка, ПСК, сумма возврата и другие условия определяются кредитором индивидуально и указываются в договоре. Решение о выдаче займа принимает кредитор. Оцените свои финансовые возможности и риски."}}$json$::jsonb,
        $json${"id":"tool-1","type":"tool","blockId":"comparison-main"}$json$::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'zk-tool-overdue-loan-v1',
        'overdue-loan-calculator',
        'OVERDUE_LOAN_CALCULATOR',
        'ACTIVE',
        'Калькулятор просрочки',
        'Калькулятор просрочки по займу',
        'Ориентировочно рассчитайте структуру задолженности по данным из договора и личного кабинета кредитора.',
        $json${"version":1,"defaults":{"principalDebt":10000,"accruedInterestAtDueDate":0,"dailyRate":0.8,"annualPenaltyRate":0,"dailyPenaltyRate":0,"interestMode":"unknown"},"limits":{"principalDebtMin":0,"principalDebtMax":1000000,"accruedInterestMin":0,"accruedInterestMax":1000000,"dailyRateMin":0,"dailyRateMax":5,"annualPenaltyRateMin":0,"annualPenaltyRateMax":100,"dailyPenaltyRateMin":0,"dailyPenaltyRateMax":5},"labels":{"dueDate":"Дата платежа по договору","calculationDate":"Дата расчета","principalDebt":"Непогашенный основной долг","accruedInterestAtDueDate":"Начисленные проценты на дату платежа","interestMode":"После просрочки договорные проценты продолжают начисляться?","dailyRate":"Дневная ставка по договору","annualPenaltyRate":"Годовая ставка неустойки","dailyPenaltyRate":"Дневная ставка неустойки","contractDate":"Дата заключения договора","originalPrincipalAmount":"Первоначальная сумма займа","initialTermDays":"Первоначальный срок займа, дней","otherCharges":"Другие начисления для проверки лимита"},"hints":{"partialPayments":"Если вы уже вносили частичные платежи, укажите актуальные остатки из личного кабинета или расчета кредитора.","dailyRate":"Дневную ставку ищите на первой странице договора или в индивидуальных условиях.","penalty":"Ставку и тип неустойки проверьте в индивидуальных условиях договора.","limit":"Без первоначального срока нельзя определить применимость общего лимита для договоров сроком до года.","unknownInterestMode":"Проверьте в договоре, продолжают ли начисляться проценты после даты платежа."},"result":{"title":"Ориентировочная структура задолженности по введенным данным","formulaTitle":"Примененная формула"},"links":[],"riskNotice":{"text":"Расчет является ориентировочным и выполняется по введенным вами данным. Точная задолженность зависит от условий договора, даты его заключения, истории платежей, продлений и решений кредитора или суда. Проверьте сумму в личном кабинете и запросите расчет задолженности у кредитора. Инструмент не предназначен для расчета обязательств пайщиков КПК."}}$json$::jsonb,
        $json${"id":"tool-1","type":"tool","blockId":"overdue-loan-main"}$json$::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("slug") DO UPDATE
SET
    "type" = EXCLUDED."type",
    "status" = EXCLUDED."status",
    "name" = EXCLUDED."name",
    "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "config" = EXCLUDED."config",
    "defaultBlock" = EXCLUDED."defaultBlock",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SeoPage" (
    "id",
    "slug",
    "status",
    "pageType",
    "intent",
    "title",
    "description",
    "h1",
    "intro",
    "contentBlocks",
    "riskNotice",
    "displayPriority",
    "publishedAt",
    "updatedByUserAt",
    "createdAt",
    "updatedAt"
)
VALUES
    (
        'zk-page-loan-comparison-v1',
        'sravnenie-dvuh-zaymov',
        'PUBLISHED',
        'SERVICE',
        'SERVICE',
        'Сравнение двух займов — ZaimKarta',
        'Сравните два займа по сумме, сроку, региональной доступности, ПСК, способам получения и другим условиям.',
        'Сравнение двух займов',
        'Выберите два предложения и укажите сумму со сроком. Сервис покажет, проходят ли офферы по параметрам и чем они отличаются.',
        $json$[{"id":"tool-1","type":"tool","blockId":"comparison-main"},{"id":"risk-1","type":"riskNotice"}]$json$::jsonb,
        'Интерактивный сервис носит справочный характер. Перед оформлением займа проверьте договор, ПСК, комиссии, штрафы и порядок продления.',
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'zk-page-repayment-date-v1',
        'kalkulyator-daty-vozvrata-zayma',
        'PUBLISHED',
        'SERVICE',
        'SERVICE',
        'Калькулятор даты возврата займа — ZaimKarta',
        'Рассчитайте ориентировочную дату возврата займа по дате получения денег и сроку в днях.',
        'Калькулятор даты возврата займа',
        'Укажите дату получения денег и срок займа. Калькулятор покажет ориентировочную дату возврата без сохранения введенных данных.',
        $json$[{"id":"tool-1","type":"tool","blockId":"repayment-date-main"},{"id":"offers-1","type":"offers","title":"Предложения после расчета даты"},{"id":"risk-1","type":"riskNotice"}]$json$::jsonb,
        'Интерактивный сервис носит справочный характер. Перед оформлением займа проверьте договор, ПСК, комиссии, штрафы и порядок продления.',
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'zk-page-overdue-loan-v1',
        'kalkulyator-prosrochki-po-zaymu',
        'PUBLISHED',
        'SERVICE',
        'SERVICE',
        'Калькулятор просрочки по займу — ZaimKarta',
        'Рассчитайте ориентировочную структуру задолженности при просрочке по данным договора и личного кабинета.',
        'Калькулятор просрочки по займу',
        'Укажите даты, остаток основного долга и условия начисления. Калькулятор покажет ориентировочную структуру задолженности без сохранения введенных сумм.',
        $json$[{"id":"tool-1","type":"tool","blockId":"overdue-loan-main"},{"id":"offers-1","type":"offers","title":"Предложения и полезные сервисы"},{"id":"risk-1","type":"riskNotice"}]$json$::jsonb,
        'Интерактивный сервис носит справочный характер. Точную задолженность и порядок начислений проверяйте в договоре, личном кабинете и расчете кредитора.',
        3,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("slug") DO UPDATE
SET
    "status" = EXCLUDED."status",
    "pageType" = EXCLUDED."pageType",
    "intent" = EXCLUDED."intent",
    "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "h1" = EXCLUDED."h1",
    "intro" = EXCLUDED."intro",
    "contentBlocks" = EXCLUDED."contentBlocks",
    "riskNotice" = EXCLUDED."riskNotice",
    "displayPriority" = EXCLUDED."displayPriority",
    "publishedAt" = COALESCE("SeoPage"."publishedAt", CURRENT_TIMESTAMP),
    "updatedByUserAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SeoPageTool" (
    "id",
    "pageId",
    "toolId",
    "position",
    "blockId",
    "variant",
    "createdAt",
    "updatedAt"
)
SELECT
    relation."id",
    page."id",
    tool."id",
    10,
    relation."blockId",
    'FULL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    VALUES
        ('zk-page-tool-comparison-v1', 'sravnenie-dvuh-zaymov', 'loan-comparison', 'comparison-main'),
        ('zk-page-tool-repayment-v1', 'kalkulyator-daty-vozvrata-zayma', 'repayment-date-calculator', 'repayment-date-main'),
        ('zk-page-tool-overdue-v1', 'kalkulyator-prosrochki-po-zaymu', 'overdue-loan-calculator', 'overdue-loan-main')
) AS relation("id", "pageSlug", "toolSlug", "blockId")
JOIN "SeoPage" AS page ON page."slug" = relation."pageSlug"
JOIN "SeoTool" AS tool ON tool."slug" = relation."toolSlug"
ON CONFLICT ("pageId", "blockId") DO UPDATE
SET
    "toolId" = EXCLUDED."toolId",
    "position" = EXCLUDED."position",
    "variant" = EXCLUDED."variant",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Comparison needs every active offer. The other calculators show up to three
-- existing active offers after the result. No offer fields or CPA links change.
INSERT INTO "SeoPageOffer" (
    "id",
    "seoPageId",
    "offerId",
    "position",
    "createdAt",
    "updatedAt"
)
SELECT
    'zk-comparison-offer-' || md5(offer."id"),
    page."id",
    offer."id",
    ROW_NUMBER() OVER (ORDER BY offer."displayPriority", offer."createdAt", offer."id")::integer,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "SeoPage" AS page
CROSS JOIN "Offer" AS offer
WHERE page."slug" = 'sravnenie-dvuh-zaymov'
  AND offer."status" = 'ACTIVE'
ON CONFLICT ("seoPageId", "offerId") DO UPDATE
SET
    "position" = EXCLUDED."position",
    "updatedAt" = CURRENT_TIMESTAMP;

WITH ranked_offers AS (
    SELECT
        offer."id",
        ROW_NUMBER() OVER (ORDER BY offer."displayPriority", offer."createdAt", offer."id")::integer AS position
    FROM "Offer" AS offer
    WHERE offer."status" = 'ACTIVE'
), target_pages AS (
    SELECT "id", "slug"
    FROM "SeoPage"
    WHERE "slug" IN (
        'kalkulyator-daty-vozvrata-zayma',
        'kalkulyator-prosrochki-po-zaymu'
    )
)
INSERT INTO "SeoPageOffer" (
    "id",
    "seoPageId",
    "offerId",
    "position",
    "createdAt",
    "updatedAt"
)
SELECT
    'zk-calculator-offer-' || md5(page."id" || offer."id"),
    page."id",
    offer."id",
    offer.position,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM target_pages AS page
CROSS JOIN ranked_offers AS offer
WHERE offer.position <= 3
ON CONFLICT ("seoPageId", "offerId") DO UPDATE
SET
    "position" = EXCLUDED."position",
    "updatedAt" = CURRENT_TIMESTAMP;
