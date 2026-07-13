#!/bin/sh

set -eu

umask 077

SOURCE_DIR=${SOURCE_DIR:-/home/deploy/health-setup}
HEALTH_SOURCE="$SOURCE_DIR/health-check-production.sh"
HEALTH_TARGET=/usr/local/sbin/zaimkarta-health-check
CONFIG_TARGET=/etc/zaimkarta-health.conf
CRON_TARGET=/etc/cron.d/zaimkarta-health
STATE_DIR=/var/lib/zaimkarta-health
LOG_FILE=/var/log/zaimkarta-health.log

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Установщик нужно запустить через sudo"
[ -f "$HEALTH_SOURCE" ] || fail "Не найден $HEALTH_SOURCE"
sh -n "$HEALTH_SOURCE"

install -o root -g root -m 700 "$HEALTH_SOURCE" "$HEALTH_TARGET"
mkdir -p "$STATE_DIR"
chown root:root "$STATE_DIR"
chmod 700 "$STATE_DIR"
if [ -f "$LOG_FILE" ]; then
  chown root:root "$LOG_FILE"
  chmod 600 "$LOG_FILE"
else
  install -o root -g root -m 600 /dev/null "$LOG_FILE"
fi

if [ ! -f "$CONFIG_TARGET" ]; then
  config_tmp=$(mktemp /etc/zaimkarta-health.conf.XXXXXX)
  cleanup() {
    rm -f -- "$config_tmp"
  }
  trap cleanup EXIT HUP INT TERM
  {
    printf '%s\n' 'PROJECT_DIR=/home/deploy/zaimkarta/deploy'
    printf '%s\n' 'COMPOSE_FILE=docker-compose.prod.yml'
    printf '%s\n' 'BACKUP_ROOT=/home/deploy/backups/zaimkarta'
    printf '%s\n' 'BACKUP_COMMAND=/usr/local/sbin/zaimkarta-backup'
    printf '%s\n' 'SITE_URL=https://zaimkarta.ru'
    printf '%s\n' 'HEALTH_MARKER_FILE=/tmp/zaimkarta-health-ok'
    printf '%s\n' 'DISK_WARNING_PERCENT=80'
    printf '%s\n' 'MEMORY_WARNING_PERCENT=90'
    printf '%s\n' 'MAX_LOAD_PER_CPU_X100=200'
    printf '%s\n' 'MIN_BACKUP_FREE_KB=5242880'
    printf '%s\n' 'MAX_BACKUP_AGE_HOURS=36'
    printf '%s\n' 'MAX_RESTARTS_PER_RUN=3'
    printf '%s\n' 'LOG_LOOKBACK=10m'
    printf '%s\n' 'MAX_5XX_PER_WINDOW=5'
    printf '%s\n' 'MAX_4XX_PER_WINDOW=100'
    printf '%s\n' 'MAX_GO_429_PER_WINDOW=20'
  } > "$config_tmp"
  install -o root -g root -m 600 "$config_tmp" "$CONFIG_TARGET"
else
  chown root:root "$CONFIG_TARGET"
  chmod 600 "$CONFIG_TARGET"
  printf '%s\n' "Существующий $CONFIG_TARGET сохранён без перезаписи."
fi

cron_tmp=$(mktemp /etc/zaimkarta-health.cron.XXXXXX)
cleanup_cron() {
  rm -f -- "$cron_tmp" "${config_tmp:-}"
}
trap cleanup_cron EXIT HUP INT TERM
{
  printf '%s\n' 'SHELL=/bin/sh'
  printf '%s\n' 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  printf '%s\n' '*/5 * * * * root /usr/local/sbin/zaimkarta-health-check quick >/dev/null 2>&1'
  printf '%s\n' '32 4 * * * root /usr/local/sbin/zaimkarta-health-check backup >/dev/null 2>&1'
} > "$cron_tmp"
install -o root -g root -m 644 "$cron_tmp" "$CRON_TARGET"

printf '%s\n' 'Запускаю полную read-only проверку без остановки сайта...'
if "$HEALTH_TARGET" all; then
  printf '%s\n' 'Health-check установлен, cron включён, текущие проверки пройдены.'
else
  printf '%s\n' 'Health-check установлен, но обнаружил проблему. Посмотрите сообщения выше и лог.'
  exit 1
fi

printf '%s\n' 'Добавьте в бесплатный UptimeRobot HTTP-монитор: https://zaimkarta.ru/api/health/server'
