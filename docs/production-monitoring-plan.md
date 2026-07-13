# ZaimKarta — мониторинг production MVP

Статус: внешний uptime настроен 14 июля 2026 года; серверный health-check подготовлен локально и требует установки на VPS и подключения бесплатного HTTP-монитора.

## Простая схема

Мониторинг состоит из двух независимых частей:

1. UptimeRobot смотрит на сайт снаружи. Он заметит падение сайта, HTTPS или всего VPS, даже если сам сервер полностью выключен.
2. `/usr/local/sbin/zaimkarta-health-check` работает на VPS и проверяет ресурсы, Docker, бэкапы и недавние HTTP-ошибки. Если всё хорошо, он обновляет служебный marker внутри контейнера приложения. Бесплатный HTTP-монитор проверяет `/api/health/server`: свежий marker даёт `200`, ошибка или marker старше 12 минут — `503` и email от UptimeRobot.

Prometheus, Grafana, Loki, Sentry и платные сервисы на этапе MVP не добавляются.

## Внешние проверки

В UptimeRobot созданы HTTP(s)-мониторы с интервалом 5 минут:

| Название/адрес | Что подтверждает |
| --- | --- |
| `https://zaimkarta.ru/` | Главная и HTTPS доступны через Caddy |
| `https://zaimkarta.ru/robots.txt` | Сайт отвечает и SEO-инфраструктура доступна |
| `https://zaimkarta.ru/admin/login` | Страница входа в админку доступна без входа в аккаунт |
| `https://zaimkarta.ru/sitemap.xml` | Sitemap формируется и отвечает |
| `https://zaimkarta.ru/api/health/server` | Серверная проверка ресурсов, Docker и бэкапов недавно успешно прошла |

Первые четыре монитора уже созданы. Пятый HTTP-монитор добавляется после установки route и health-check. Ожидаемый ответ — `200`. Уведомления выбраны на email `chrk.omsk@gmail.com`. Получение тестового alert нужно подтвердить до закрытия этапа.

Реальный `/go/[slug]` во внешний мониторинг не добавляется: регулярная проверка могла бы создавать ложные CPA-клики. Режим техработ и `/go` проверяются отдельно по журналам и безопасному fallback-сценарию.

## Серверные проверки

Скрипт `deploy/scripts/health-check-production.sh` устанавливается как:

```text
/usr/local/sbin/zaimkarta-health-check
```

Быстрая проверка выполняется каждые 5 минут и контролирует:

- заполнение системного диска, предупреждение от 80%;
- минимум 5 ГБ свободного места на файловой системе бэкапов;
- использование RAM, предупреждение от 90%;
- load average, порог `2.0 × количество CPU`;
- `app` и `db` в состоянии `healthy`;
- `caddy` в состоянии `running`;
- три и более перезапуска одного контейнера между соседними проверками;
- ответы `200` для четырёх HTTPS-адресов через Caddy;
- возраст локальных DB и uploads-бэкапов не более 36 часов;
- количество `4xx`, `5xx` и `/go` `429` в Caddy-логах за последние 10 минут.

Начальные пороги HTTP-аномалий:

- `5xx`: 5 за 10 минут;
- все `4xx`: 100 за 10 минут;
- `/go` со статусом `429`: 20 за 10 минут.

Это стартовые MVP-пороги. После появления реального трафика их нужно пересмотреть по фактическому фону. Скрипт считает только события и не копирует URL, IP, user-agent или query-параметры в свой лог.

## Контроль бэкапов

Каждый день в `04:32 UTC`, после backup cron в `03:20 UTC`, запускается:

```bash
sudo /usr/local/sbin/zaimkarta-health-check backup
```

Эта команда вызывает существующую проверку:

```bash
sudo /usr/local/sbin/zaimkarta-backup check
```

Она подтверждает:

- свежесть dump PostgreSQL;
- свежесть архива uploads/logos;
- читаемость dump и структуру uploads-архива;
- наличие соответствующих файлов в закрытой папке Google Drive через `rclone check`.

Если глубокая проверка упала, создаётся постоянный внутренний флаг. Быстрые проверки удаляют health marker, пока следующая глубокая проверка не пройдёт успешно. Поэтому сбой бэкапа не «забывается» через пять минут.

## Расписание и файлы

Установщик создаёт `/etc/cron.d/zaimkarta-health`:

```cron
*/5 * * * * root /usr/local/sbin/zaimkarta-health-check quick >/dev/null 2>&1
32 4 * * * root /usr/local/sbin/zaimkarta-health-check backup >/dev/null 2>&1
```

Файлы на VPS:

```text
/usr/local/sbin/zaimkarta-health-check  исполняемый скрипт
/etc/zaimkarta-health.conf              закрытая конфигурация, права 600
/etc/cron.d/zaimkarta-health            расписание
/var/log/zaimkarta-health.log           понятный журнал результатов
/var/lib/zaimkarta-health/              закрытое техническое состояние
```

Health endpoint не показывает значения CPU, RAM, диска, IP или логи. Он возвращает только `ok` или `unavailable`, имеет `no-store` и закрыт от индексации.

## Установка на VPS

Скопировать два скрипта в закрытый временный каталог `/home/deploy/health-setup`, затем выполнить:

```bash
sudo /home/deploy/health-setup/install-production-health-check.sh
```

После этого:

```bash
sudo /usr/local/sbin/zaimkarta-health-check all
sudo crontab -l
cat /etc/cron.d/zaimkarta-health
tail -n 100 /var/log/zaimkarta-health.log
curl -i https://zaimkarta.ru/api/health/server
```

Затем добавить в UptimeRobot обычный бесплатный HTTP(s)-монитор `ZaimKarta server health` для `https://zaimkarta.ru/api/health/server` с интервалом 5 минут. Платный `Cron job / Heartbeat monitoring` не используется.

`sudo crontab -l` может не показывать задания из `/etc/cron.d`; поэтому обязательно смотреть и сам файл `/etc/cron.d/zaimkarta-health`.

## Проверка уведомлений

Безопасный порядок:

1. В UptimeRobot отправить тестовое уведомление для email-контакта, если интерфейс предлагает такую кнопку.
2. Убедиться, что письмо пришло и не попало в спам.
3. Запустить `sudo /usr/local/sbin/zaimkarta-health-check all` и убедиться, что `/api/health/server` отвечает `200`, а монитор зелёный.
4. Для проверки аварийного alert временно задать health-монитору заведомо отсутствующий URL либо использовать тестовую функцию UptimeRobot. Не останавливать сайт, cron, базу и production-контейнеры ради теста.
5. Сразу вернуть расписание и дождаться recovery-уведомления.

## Ограничения MVP

- UptimeRobot показывает доступность общего server health endpoint, но подробная причина находится в `/var/log/zaimkarta-health.log`.
- Проверка нагрузки использует моментальный load average, а не полноценный временной график.
- Анализ логов считает общие всплески; отдельные пороги по каждому offer slug появятся после накопления реального трафика.
- Нет централизованного хранения логов за пределами VPS.
- Нет Telegram; выбран email владельца.
- Большую DDoS-атаку мониторинг обнаружит, но сам не остановит.

## Когда считать этап закрытым

Этап 8 закрыт только после выполнения всех пунктов:

- пять HTTP-мониторов зелёные;
- email test alert реально получен;
- health-check установлен на VPS;
- HTTP-монитор server health настроен и зелёный;
- ручной `all` и backup check проходят;
- первый запуск из cron подтверждён по журналу;
- владелец знает аварийный runbook.
