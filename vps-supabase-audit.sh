set -eu

old_root=/root/supabase
event_root=/root/evento-supabase
invite_root=/root/convite-supabase
services='db rest imgproxy storage auth meta realtime studio kong functions'

[ -d "$old_root/docker" ] || { echo 'Old Supabase directory not found'; exit 1; }
[ ! -e "$event_root" ] || { echo 'Event destination already exists'; exit 1; }
[ ! -e "$invite_root" ] || { echo 'Invite destination already exists'; exit 1; }

echo '=== PRESERVE EVENT STATE ==='
event_tables_before=$(docker exec convite-supabase-db psql -U postgres -d postgres -Atc "select count(*) from pg_tables where schemaname='public'")
echo "event_tables_before=$event_tables_before"
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/supabase-config-backups/$stamp
cp -a "$old_root/docker/docker-compose.yml" "$old_root/docker/.env" /root/supabase-config-backups/$stamp/

echo '=== STOP AND RENAME EVENT STACK ==='
cd "$old_root/docker"
docker compose -p convite-supabase down
mv "$old_root" "$event_root"
cd "$event_root/docker"
sed -i 's/^name: supabase$/name: evento-supabase/' docker-compose.yml
sed -i 's/convite-supabase/evento-supabase/g' docker-compose.yml
sed -i 's/realtime-dev\.supabase-realtime/evento-supabase-realtime/g' docker-compose.yml

docker volume create evento-supabase_db-config >/dev/null
docker run --rm -v convite-supabase_db-config:/from:ro -v evento-supabase_db-config:/to alpine:latest sh -c 'cp -a /from/. /to/'

docker compose up -d $services

echo '=== WAIT EVENT STACK ==='
i=0
until docker exec evento-supabase-db pg_isready -U postgres >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -ge 40 ] && exit 1; sleep 2
done
event_tables_after=$(docker exec evento-supabase-db psql -U postgres -d postgres -Atc "select count(*) from pg_tables where schemaname='public'")
[ "$event_tables_before" = "$event_tables_after" ]
echo "event_tables_after=$event_tables_after"

echo '=== CREATE ISOLATED INVITE STACK ==='
cp -a "$event_root/docker" "$invite_root"
cd "$invite_root"
mv volumes/db/data volumes/db/data.event-source-backup
mkdir -p volumes/db/data
if [ -d volumes/storage ]; then mv volumes/storage volumes/storage.event-source-backup; fi
mkdir -p volumes/storage
sed -i 's/^name: evento-supabase$/name: convite-supabase/' docker-compose.yml
sed -i 's/evento-supabase/convite-supabase/g' docker-compose.yml
sed -i 's/^KONG_HTTP_PORT=.*/KONG_HTTP_PORT=8200/' .env
sed -i 's/^KONG_HTTPS_PORT=.*/KONG_HTTPS_PORT=8545/' .env
sed -i 's/^POSTGRES_PORT=.*/POSTGRES_PORT=5432/' .env
sed -i 's|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://2.25.183.40:8200|' .env
sed -i 's|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://2.25.183.40:8200|' .env
sed -i 's/^STUDIO_DEFAULT_PROJECT=.*/STUDIO_DEFAULT_PROJECT=Convite App/' .env
sed -i 's/^DASHBOARD_USERNAME=.*/DASHBOARD_USERNAME=convite-admin/' .env
sh utils/generate-keys.sh --update-env >/dev/null

docker compose up -d $services

echo '=== WAIT INVITE STACK ==='
i=0
until docker exec convite-supabase-db pg_isready -U postgres >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -ge 40 ] && exit 1; sleep 2
done
i=0
until curl -fsS --max-time 5 http://127.0.0.1:8200/storage/v1/status >/dev/null; do
  i=$((i+1)); [ "$i" -ge 40 ] && exit 1; sleep 2
done

echo '=== APPLY INVITE SCHEMA ==='
docker exec -i convite-supabase-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres < /root/convite-app/schema.sql

echo '=== POINT APP TO NEW INVITE STACK ==='
new_anon=$(sed -n 's/^ANON_KEY=//p' .env)
new_service=$(sed -n 's/^SERVICE_ROLE_KEY=//p' .env)
sed -i 's|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=http://2.25.183.40:8200|' /root/convite-app/.env.local
sed -i "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$new_anon|" /root/convite-app/.env.local
if grep -q '^SUPABASE_SERVICE_ROLE_KEY=' /root/convite-app/.env.local; then
  sed -i "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$new_service|" /root/convite-app/.env.local
else
  printf '\nSUPABASE_SERVICE_ROLE_KEY=%s\n' "$new_service" >> /root/convite-app/.env.local
fi

cd /root/convite-app
docker compose up -d --build convite-app

echo '=== WAIT APP ==='
i=0
until curl -fsS --max-time 5 http://127.0.0.1:3002/api/settings >/dev/null; do
  i=$((i+1)); [ "$i" -ge 30 ] && { docker logs --tail 100 convite-app; exit 1; }; sleep 2
done

echo '=== RESULT ==='
echo "backup=/root/supabase-config-backups/$stamp"
echo "event_tables=$event_tables_after"
echo "invite_tables=$(docker exec convite-supabase-db psql -U postgres -d postgres -Atc \"select count(*) from pg_tables where schemaname='public'\")"
