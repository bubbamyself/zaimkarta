#!/bin/sh

set -eu

umask 077

CONFIG_TARGET=/etc/zaimkarta-metrika-offline.conf
RUNNER_TARGET=/usr/local/sbin/zaimkarta-metrika-offline-sync
CRON_TARGET=/etc/cron.d/zaimkarta-metrika-offline
LOG_FILE=/var/log/zaimkarta-metrika-offline.log

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Установщик нужно запустить через sudo"
command -v docker >/dev/null 2>&1 || fail "Не найдена команда docker"

if [ ! -f "$CONFIG_TARGET" ]; then
  config_tmp=$(mktemp /etc/zaimkarta-metrika-offline.conf.XXXXXX)
  {
    printf '%s\n' 'PROJECT_DIR=/home/deploy/zaimkarta/deploy'
    printf '%s\n' 'COMPOSE_FILE=docker-compose.prod.yml'
  } > "$config_tmp"
  install -o root -g root -m 600 "$config_tmp" "$CONFIG_TARGET"
  rm -f -- "$config_tmp"
else
  chown root:root "$CONFIG_TARGET"
  chmod 600 "$CONFIG_TARGET"
fi

. "$CONFIG_TARGET"
[ -d "$PROJECT_DIR" ] || fail "Не найден каталог $PROJECT_DIR"
[ -f "$PROJECT_DIR/$COMPOSE_FILE" ] || fail "Не найден Compose $PROJECT_DIR/$COMPOSE_FILE"
docker compose -f "$PROJECT_DIR/$COMPOSE_FILE" config --services \
  | grep -qx app || fail "В production Compose не найден сервис app"

runner_tmp=$(mktemp /usr/local/sbin/zaimkarta-metrika-offline-sync.XXXXXX)
cat > "$runner_tmp" <<'RUNNER'
#!/bin/sh
set -eu
. /etc/zaimkarta-metrika-offline.conf
cd "$PROJECT_DIR"
exec docker compose -f "$COMPOSE_FILE" exec -T app npm run metrika:offline:sync
RUNNER
install -o root -g root -m 700 "$runner_tmp" "$RUNNER_TARGET"
rm -f -- "$runner_tmp"

if [ -f "$LOG_FILE" ]; then
  chown root:root "$LOG_FILE"
  chmod 600 "$LOG_FILE"
else
  install -o root -g root -m 600 /dev/null "$LOG_FILE"
fi

cron_tmp=$(mktemp /etc/zaimkarta-metrika-offline.cron.XXXXXX)
{
  printf '%s\n' 'SHELL=/bin/sh'
  printf '%s\n' 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  printf '%s\n' '*/15 * * * * root /usr/local/sbin/zaimkarta-metrika-offline-sync >> /var/log/zaimkarta-metrika-offline.log 2>&1'
} > "$cron_tmp"
install -o root -g root -m 644 "$cron_tmp" "$CRON_TARGET"
rm -f -- "$cron_tmp"

logrotate_tmp=$(mktemp /etc/logrotate.d/zaimkarta-metrika-offline.XXXXXX)
{
  printf '%s\n' '/var/log/zaimkarta-metrika-offline.log {'
  printf '%s\n' '  weekly'
  printf '%s\n' '  rotate 8'
  printf '%s\n' '  compress'
  printf '%s\n' '  missingok'
  printf '%s\n' '  notifempty'
  printf '%s\n' '  create 0600 root root'
  printf '%s\n' '}'
} > "$logrotate_tmp"
install -o root -g root -m 644 "$logrotate_tmp" /etc/logrotate.d/zaimkarta-metrika-offline
rm -f -- "$logrotate_tmp"

printf '%s\n' 'Cron офлайн-конверсий установлен. Экспорт останется выключенным, пока флаг в production env равен false.'
