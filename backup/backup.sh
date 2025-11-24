DB_NAME=$PGDATABASE
DB_USER=$PGUSER
DB_HOST=$PGHOST
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/${DB_NAME}_${TIMESTAMP}.sql"

echo "========================================"
echo "Iniciando backup de $DB_NAME a las $TIMESTAMP"
echo "========================================"

PGPASSWORD=$PGPASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup exitoso: $BACKUP_FILE"
else
  echo "❌ Error durante el backup."
fi
echo "========================================"