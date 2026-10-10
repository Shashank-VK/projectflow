#!/bin/sh
set -e

# Wait for PostgreSQL to be ready if DATABASE_URL indicates a postgres database
if [ -n "$DATABASE_URL" ] && [ "$(echo "$DATABASE_URL" | grep -v '^sqlite')" ]; then
  echo "Waiting for PostgreSQL database to be reachable..."
  python << 'EOF'
import os
import sys
import time
import urllib.parse
import socket

db_url = os.environ.get("DATABASE_URL", "")
parsed = urllib.parse.urlparse(db_url)
host = parsed.hostname or "localhost"
port = parsed.port or 5432

start = time.time()
connected = False
while time.time() - start < 60:
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        connected = True
        print(f"Database at {host}:{port} is reachable.")
        break
    except (socket.error, OSError):
        time.sleep(1)

if not connected:
    print(f"Timed out waiting for database at {host}:{port}", file=sys.stderr)
    sys.exit(1)
EOF
fi

# Run migrations automatically if not explicitly disabled
if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "Applying database migrations..."
  python manage.py migrate --noinput
fi

exec "$@"
