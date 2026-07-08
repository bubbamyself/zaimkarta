# Локальный запуск на Windows

Обновлено: 2026-06-17

Документ фиксирует рабочий запуск ZaimKarta на Windows-компьютере.

Проверенная конфигурация:

- Windows 10 Pro 22H2;
- Docker Desktop;
- Node.js;
- PostgreSQL через `docker-compose.yml`;
- сайт из папки `site/`;
- локальный адрес: `http://localhost:3000`.

## Первый запуск

Открыть PowerShell в корне репозитория:

```powershell
cd C:\Users\Lenovo\Documents\Codex\zaimkarta
```

Запустить локальную базу данных:

```powershell
docker compose up -d
```

Если команда `docker compose` не работает, можно использовать старый вариант:

```powershell
docker-compose up -d
```

Перейти в приложение:

```powershell
cd C:\Users\Lenovo\Documents\Codex\zaimkarta\site
```

Создать локальный `.env`, если его еще нет:

```powershell
copy .env.example .env
```

Установить зависимости:

```powershell
npm.cmd install
```

Подготовить Prisma и базу:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

Запустить сайт:

```powershell
npm.cmd run dev
```

После запуска открыть:

```text
http://localhost:3000
```

## Повторный запуск

Если зависимости и база уже подготовлены:

```powershell
cd C:\Users\Lenovo\Documents\Codex\zaimkarta
docker compose up -d

cd C:\Users\Lenovo\Documents\Codex\zaimkarta\site
npm.cmd run dev
```

Терминал с `npm.cmd run dev` нужно оставить открытым, пока нужен локальный сайт.

## Особенность PowerShell

На Windows PowerShell может блокировать `npm.ps1` из-за Execution Policy. В этом случае вместо `npm` нужно использовать:

```powershell
npm.cmd
```

Например:

```powershell
npm.cmd run dev
```

## Что считается рабочим результатом

- Docker Desktop запущен;
- контейнер PostgreSQL поднят из `docker-compose.yml`;
- Next.js dev server запущен через `npm.cmd run dev`;
- `http://localhost:3000` открывается в браузере.

## Обновление 2026-07-09: проверка регионального фильтра

После применения всех миграций локальная база должна содержать поле `Offer.restrictedRegionCodes`.

Для проверки новой фичи:

1. Открыть `http://localhost:3000`.
2. Выбрать регион регистрации в публичном попапе.
3. Открыть `http://localhost:3000/admin`.
4. В редакторе оффера добавить регион в блоке `Региональные ограничения`.
5. Вернуться на витрину и проверить, что оффер скрывается для выбранного региона.
6. Проверить `/go/[slug]`: restricted-оффер не должен отправлять пользователя в CPA-сеть.

Если после обновления схемы появляются ошибки Prisma, выполнить:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```
