# ZaimKarta — резервные копии production

Статус документа: backup-контур установлен на production VPS, внешняя копия и тестовое восстановление подтверждены 14 июля 2026 года.

## Что защищаем

Ежедневно создаются две независимые копии:

- сжатый PostgreSQL dump в custom format: офферы, CPA-ссылки, клики, администраторы, SEO-страницы и системные настройки;
- архив Docker-volume приложения с каталогом `/app/public/uploads/logos`.

Рабочая база и логотипы при создании копии не удаляются и не изменяются.

## Где лежат копии

Закрытый каталог на VPS:

```text
/home/deploy/backups/zaimkarta/
  db/daily/
  db/weekly/
  uploads/daily/
  uploads/weekly/
  logs/
```

Каталог находится вне репозитория и вне `site/public`. Скрипт задаёт права `700` каталогам и `600` файлам: читать их может только пользователь `deploy`.

Внешняя копия автоматически отправляется через `rclone` в закрытую папку Google Drive `ZaimKarta Production Backups`. OAuth-конфигурация хранится только на VPS в `/home/deploy/.config/rclone/rclone.conf` с правами `600` и не добавляется в Git.

## Расписание и срок хранения

- ежедневный запуск: `03:20 UTC` (`09:20` по Омску);
- ежедневные копии: минимум 7 дней;
- по воскресеньям создаётся недельная копия;
- недельные копии и журналы: 28 дней;
- ожидаемая максимальная давность свежей копии: 36 часов.

Сроки нельзя уменьшить ниже 7 и 28 дней без изменения скрипта. Удаление старых файлов ограничено закрытыми подкаталогами и строгими масками имён.

## Установка на VPS

Выполнять от пользователя `deploy`. Установщик не останавливает сайт и не удаляет Docker-volumes. Перед включением cron он создаёт внешнюю копию, показывает dry-run ротации и выполняет тестовое восстановление.

```bash
sudo /home/deploy/backup-setup/install-production-backup.sh
```

Установщик создаёт системное расписание `/etc/cron.d/zaimkarta-backup`:

```cron
20 3 * * * root /usr/local/sbin/zaimkarta-backup run >> /home/deploy/backups/zaimkarta/logs/cron.log 2>&1
```

VPS использует часовой пояс `Etc/UTC`.

## Ежедневная и недельная проверка

Проверка свежести обоих архивов и читаемости dump:

```bash
sudo /usr/local/sbin/zaimkarta-backup check
```

Дополнительные проверки:

```bash
ls -lah /home/deploy/backups/zaimkarta/db/daily
ls -lah /home/deploy/backups/zaimkarta/uploads/daily
tail -n 50 /home/deploy/backups/zaimkarta/logs/cron.log
cat /etc/cron.d/zaimkarta-backup
docker ps
docker compose -f /home/deploy/zaimkarta/deploy/docker-compose.prod.yml ps
```

Посмотреть структуру конкретных архивов:

```bash
docker compose -f /home/deploy/zaimkarta/deploy/docker-compose.prod.yml exec -T db pg_restore --list < /home/deploy/backups/zaimkarta/db/daily/ИМЯ.dump
tar -tzf /home/deploy/backups/zaimkarta/uploads/daily/ИМЯ.tar.gz | head
```

## Резервное ручное скачивание

Команда выполняется на Mac владельца, не на VPS. Она скачивает закрытые папки с копиями и не удаляет серверные файлы:

```bash
mkdir -p "$HOME/ZaimKarta-backups"
scp -r deploy@155.212.223.62:/home/deploy/backups/zaimkarta/db "$HOME/ZaimKarta-backups/"
scp -r deploy@155.212.223.62:/home/deploy/backups/zaimkarta/uploads "$HOME/ZaimKarta-backups/"
```

После скачивания открыть локальные папки и убедиться, что сегодняшние `.dump` и `.tar.gz` имеют ненулевой размер. Это запасной ручной способ; основная внешняя копия уже автоматизирована через Google Drive.

## Тестовое восстановление PostgreSQL

Опасное правило: никогда не выполнять `pg_restore` в production-базу `zaimkarta`. Проверка проводится только во временном контейнере, который не подключён к production Compose и не публикует порт наружу.

Пример безопасной проверки свежего dump:

```bash
sudo /usr/local/sbin/zaimkarta-backup restore-test
```

Скрипт сам создаёт изолированный контейнер без сети и опубликованных портов, проверяет таблицы и удаляет только тестовый контейнер. Ниже сохранён ручной порядок для аварийной диагностики:

```bash
BACKUP_FILE=/home/deploy/backups/zaimkarta/db/daily/ИМЯ.dump
docker run --name zaimkarta-backup-restore-test -e POSTGRES_PASSWORD=temporary-restore-password -e POSTGRES_DB=restore_test -d postgres:17-alpine
docker exec zaimkarta-backup-restore-test sh -c 'until pg_isready -U postgres -d restore_test; do sleep 1; done'
docker exec -i zaimkarta-backup-restore-test pg_restore --exit-on-error --no-owner --no-acl -U postgres -d restore_test < "$BACKUP_FILE"
docker exec zaimkarta-backup-restore-test psql -U postgres -d restore_test -c '\dt'
docker exec zaimkarta-backup-restore-test psql -U postgres -d restore_test -Atc "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Offer','AffiliateOffer','OfferClick','AdminUser','SeoPage','SystemSetting') ORDER BY tablename;"
```

Ожидаются все шесть таблиц: `AdminUser`, `AffiliateOffer`, `Offer`, `OfferClick`, `SeoPage`, `SystemSetting`. Удалять тестовый контейнер можно только после записи результата проверки и только по явному решению владельца:

```bash
docker stop zaimkarta-backup-restore-test
docker rm zaimkarta-backup-restore-test
```

Проверка архива логотипов не требует восстановления поверх рабочих файлов:

```bash
mkdir -p /tmp/zaimkarta-uploads-restore-test
tar -xzf /home/deploy/backups/zaimkarta/uploads/daily/ИМЯ.tar.gz -C /tmp/zaimkarta-uploads-restore-test
find /tmp/zaimkarta-uploads-restore-test/uploads/logos -maxdepth 1 -type f -print
```

## Что делать при аварии

1. Не запускать пустой seed и не восстанавливать dump поверх рабочей базы вслепую.
2. Остановить изменения данных через режим `ТЕХРАБОТЫ`, если админка или сайт ещё доступны.
3. Сохранить текущий аварийный диск/volume как отдельную копию у провайдера.
4. Скачать внешний архив на новый или очищенный сервер.
5. Сначала повторить восстановление во временную базу и проверить ключевые таблицы.
6. Только после подтверждения владельца планировать замену production-базы и возврат логотипов.
7. После восстановления проверить админку, офферы, SEO-страницы, режим техработ и несколько записей кликов.

## Секреты и запреты

Для локального dump новые секреты не нужны: `pg_dump` читает `POSTGRES_USER`, `POSTGRES_DB` и пароль внутри уже запущенного контейнера. Значения не печатаются в лог.

Нельзя:

- хранить архивы в `site/public` или `public/uploads`;
- добавлять пароль базы, S3/SFTP-ключи или настоящий env в Git;
- выполнять `docker compose down -v`;
- удалять production-volume;
- восстанавливать dump поверх production-базы без отдельного плана и подтверждения;
- считать локальную копию на том же VPS достаточной защитой.

## Текущий итог

Backup-контур установлен и проверен: SSH-доступ работает, локальная и внешняя копии созданы, Google Drive подключён, cron настроен, remote retention прошёл dry-run, тестовое восстановление подтвердило 6 ключевых таблиц. После первого автоматического запуска нужно проверить `cron.log` и появление свежей пары файлов на Google Drive.
