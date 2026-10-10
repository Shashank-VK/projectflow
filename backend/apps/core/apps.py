"""App configuration for the shared ProjectFlow core app.

Also enforces the review-addendum requirement that SQLite deployments run in
WAL mode with serialized writes: every new SQLite connection is configured via
the ``connection_created`` signal with:

- ``PRAGMA journal_mode=WAL`` — writers don't block readers and concurrent
  writers are coordinated instead of failing with "database is locked".
- ``PRAGMA busy_timeout=5000`` — serialized writes: a writer waits up to 5s
  for the lock instead of failing immediately.
- ``PRAGMA synchronous=NORMAL`` — safe durability tradeoff under WAL.
- ``PRAGMA foreign_keys=ON`` — enforce FK constraints.

PostgreSQL connections are untouched.
"""
from __future__ import annotations

import logging

from django.apps import AppConfig
from django.db.backends.signals import connection_created

logger = logging.getLogger(__name__)


def _configure_sqlite(connection, **kwargs) -> None:
    if connection.vendor != "sqlite":
        return
    # WAL is a no-op on :memory: databases (and in-memory is per-connection
    # anyway); only tune file-backed connections.
    db_name = connection.settings_dict.get("NAME")
    if db_name in (None, ":memory:"):
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.execute("PRAGMA foreign_keys=ON;")
    except Exception:  # pragma: no cover - best effort hardening
        logger.exception("Failed to apply SQLite WAL pragmas on new connection")


class CoreConfig(AppConfig):
    name = "apps.core"
    verbose_name = "ProjectFlow Core"

    def ready(self) -> None:
        connection_created.connect(
            _configure_sqlite, dispatch_uid="projectflow.sqlite_wal"
        )
