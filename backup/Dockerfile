FROM alpine/git:latest as base
FROM alpine/curl:latest as curl
FROM postgres:14-alpine

RUN apk add --no-cache bash dcron && \
    mkdir -p /etc/cron.d /var/log/cron && \
    chmod 0755 /var/log/cron

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

RUN echo "0 2 * * * /usr/local/bin/backup.sh > /proc/1/fd/1 2>/proc/1/fd/2" > /etc/cron.d/backup-schedule && \
    chmod 0644 /etc/cron.d/backup-schedule

# crear directorio de backups y permisos
RUN mkdir -p /backups && chmod 0775 /backups

# Asegurar que crond se ejecute como root (la imagen postgres puede cambiar el usuario por defecto)
USER root

CMD ["crond", "-f", "-L", "/var/log/cron"]