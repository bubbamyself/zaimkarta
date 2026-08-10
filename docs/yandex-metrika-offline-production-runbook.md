# Автоматическая выгрузка офлайн-конверсий Яндекс Метрики

## Граница данных

- Старые конверсии не загружаются и не ставятся в очередь задним числом.
- Очередь начинает наполняться только новыми postback после выпуска нового кода.
- Старые клики не содержат `metrikaClientId`, поэтому поздний postback по старому клику будет сохранён в LeadGid-аналитике, но офлайн-событие будет безопасно отмечено как пропущенное.
- Не запускать отдельный backfill и не изменять старые строки `OfferClick` или `AffiliateConversion`.

## До production-деплоя

В закрытом `/home/deploy/zaimkarta/deploy/production.env.server` должны быть строки:

```env
YANDEX_METRIKA_COUNTER_ID=110922978
YANDEX_METRIKA_OAUTH_TOKEN=
YANDEX_METRIKA_OFFLINE_EXPORT_ENABLED=false
```

OAuth-токен владелец счётчика создаёт в браузере и вручную сохраняет на VPS. Токен нельзя отправлять в чат, GitHub, журналы или переменную с префиксом `NEXT_PUBLIC_`.

Первый деплой выполняется только с `YANDEX_METRIKA_OFFLINE_EXPORT_ENABLED=false`. Штатный deploy-скрипт:

1. проверит номер счётчика и значение выключателя;
2. пересоберёт только `app`;
3. применит миграцию;
4. автоматически установит cron `/etc/cron.d/zaimkarta-metrika-offline`;
5. не включит выгрузку и не отправит данные в Яндекс.

## Проверка после первого деплоя

На VPS проверить:

```bash
sudo cat /etc/cron.d/zaimkarta-metrika-offline
sudo ls -l /usr/local/sbin/zaimkarta-metrika-offline-sync
sudo tail -n 50 /var/log/zaimkarta-metrika-offline.log
sudo docker compose -f /home/deploy/zaimkarta/deploy/docker-compose.prod.yml exec -T app npm run metrika:offline:sync
```

Последняя команда при выключенном флаге должна показать:

```text
Metrika offline sync finished { outcome: 'disabled', uploaded: 0 }
```

В админке в разделе аналитики должен отображаться блок «Выгрузка конверсий в Яндекс Метрику».

## Контролируемое включение

1. Дождаться нового настоящего клика после деплоя и настоящего postback LeadGid. Не создавать фиктивную заявку.
2. Убедиться в админке, что событие появилось в состоянии «Ожидают отправки».
3. В закрытом `production.env.server` заполнить OAuth-токен и заменить только:

```env
YANDEX_METRIKA_OFFLINE_EXPORT_ENABLED=true
```

4. Пересоздать только контейнер приложения, чтобы он получил обновлённое окружение:

```bash
cd /home/deploy/zaimkarta/deploy
sudo docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app
sudo docker compose -f docker-compose.prod.yml ps
```

PostgreSQL, Caddy и volumes не пересоздавать.

5. Выполнить одну контролируемую синхронизацию:

```bash
sudo /usr/local/sbin/zaimkarta-metrika-offline-sync
```

6. Проверить админку и безопасный журнал. Сначала событие перейдёт в «Ждут обработки». Следующие запуски проверят статус загрузки; обработка в Яндексе может занять до двух часов.
7. После подтверждения оставить флаг `true`. Cron продолжит выгрузку автоматически каждые 15 минут.

## Обычная автоматическая работа

После включения ручные действия не требуются:

```text
новый postback LeadGid
→ запись в постоянную очередь PostgreSQL
→ cron каждые 15 минут
→ UTF-8 CSV в API Яндекс Метрики
→ проверка статуса обработки
→ результат в админке
```

Сетевые ошибки, HTTP 429 и ошибки Яндекса 5xx повторяются с увеличивающимся интервалом. Повторный одинаковый postback не создаёт второе событие.

## Безопасное выключение

При проблеме заменить в закрытом env:

```env
YANDEX_METRIKA_OFFLINE_EXPORT_ENABLED=false
```

Затем пересоздать только `app` той же командой `up -d --no-deps --force-recreate app`.

Это остановит новые загрузки в Яндекс, но не остановит CPA-переходы, LeadGid postback и сохранение очереди. PostgreSQL, Caddy и volumes не удалять.
