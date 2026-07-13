#!/bin/sh

set -eu

umask 077

SOURCE_DIR=${SOURCE_DIR:-/home/deploy/backup-setup}
BACKUP_SOURCE="$SOURCE_DIR/backup-production.sh"
RCLONE_SOURCE="$SOURCE_DIR/rclone"
RCLONE_CONFIG_SOURCE=${RCLONE_CONFIG_SOURCE:-/home/deploy/.config/rclone/rclone.conf}
BACKUP_TARGET=/usr/local/sbin/zaimkarta-backup
RCLONE_TARGET=/usr/local/bin/rclone
CONFIG_TARGET=/etc/zaimkarta-backup.conf
CRON_TARGET=/etc/cron.d/zaimkarta-backup

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Установщик нужно запустить через sudo"
[ -f "$BACKUP_SOURCE" ] || fail "Не найден $BACKUP_SOURCE"
[ -x "$RCLONE_SOURCE" ] || fail "Не найден исполняемый $RCLONE_SOURCE"
[ -s "$RCLONE_CONFIG_SOURCE" ] || fail "Не найден настроенный rclone config"

sh -n "$BACKUP_SOURCE"
"$RCLONE_SOURCE" version >/dev/null

install -o root -g root -m 700 "$BACKUP_SOURCE" "$BACKUP_TARGET"
install -o root -g root -m 755 "$RCLONE_SOURCE" "$RCLONE_TARGET"

config_tmp=$(mktemp /etc/zaimkarta-backup.conf.XXXXXX)
cron_tmp=$(mktemp /etc/zaimkarta-backup.cron.XXXXXX)
cleanup() {
  rm -f -- "$config_tmp" "$cron_tmp"
}
trap cleanup EXIT HUP INT TERM

write_config() {
  allow_remote_delete=$1
  {
    printf '%s\n' 'PROJECT_DIR=/home/deploy/zaimkarta/deploy'
    printf '%s\n' 'COMPOSE_FILE=docker-compose.prod.yml'
    printf '%s\n' 'BACKUP_ROOT=/home/deploy/backups/zaimkarta'
    printf '%s\n' 'BACKUP_OWNER=deploy:deploy'
    printf '%s\n' 'RCLONE_BIN=/usr/local/bin/rclone'
    printf '%s\n' 'RCLONE_CONFIG=/home/deploy/.config/rclone/rclone.conf'
    printf "%s\n" "OFFSITE_REMOTE='zkdrive:ZaimKarta Production Backups'"
    printf '%s\n' 'REQUIRE_OFFSITE_COPY=1'
    printf '%s\n' "ALLOW_REMOTE_DELETE=$allow_remote_delete"
    printf '%s\n' 'DAILY_RETENTION_DAYS=7'
    printf '%s\n' 'WEEKLY_RETENTION_DAYS=28'
    printf '%s\n' 'REMOTE_DAILY_RETENTION_DAYS=7'
    printf '%s\n' 'REMOTE_WEEKLY_RETENTION_DAYS=28'
  } > "$config_tmp"
  install -o root -g root -m 600 "$config_tmp" "$CONFIG_TARGET"
}

write_config 0

mkdir -p /home/deploy/backups/zaimkarta/logs
chown -R deploy:deploy /home/deploy/backups/zaimkarta
chmod 700 /home/deploy/backups/zaimkarta /home/deploy/backups/zaimkarta/logs
install -o deploy -g deploy -m 600 /dev/null /home/deploy/backups/zaimkarta/logs/cron.log
chmod 600 "$RCLONE_CONFIG_SOURCE"
chown deploy:deploy "$RCLONE_CONFIG_SOURCE"

printf '%s\n' 'Создаю первый production-бэкап и внешнюю копию...'
"$BACKUP_TARGET" run
printf '%s\n' 'Проверяю свежесть локальной и внешней копии...'
"$BACKUP_TARGET" check
printf '%s\n' 'Показываю remote retention без удаления...'
"$BACKUP_TARGET" retention-dry-run
printf '%s\n' 'Проверяю восстановление в отдельный временный контейнер...'
"$BACKUP_TARGET" restore-test

write_config 1

{
  printf '%s\n' 'SHELL=/bin/sh'
  printf '%s\n' 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  printf '%s\n' '20 3 * * * root /usr/local/sbin/zaimkarta-backup run >> /home/deploy/backups/zaimkarta/logs/cron.log 2>&1'
} > "$cron_tmp"
install -o root -g root -m 644 "$cron_tmp" "$CRON_TARGET"

printf '%s\n' 'Backup-контур установлен: cron включён, внешняя ротация разрешена после dry-run, restore-test пройден.'
