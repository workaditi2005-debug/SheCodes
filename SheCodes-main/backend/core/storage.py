from __future__ import annotations

import json
import os
import threading
from copy import deepcopy
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Callable

from core.settings import settings


class JsonStore:
    def __init__(self, path: Path, default_factory: Callable[[], Any]):
        self.path = path
        self.default_factory = default_factory
        self._lock = threading.RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def read(self) -> Any:
        with self._lock:
            if not self.path.exists():
                return self.default_factory()
            try:
                with self.path.open("r", encoding="utf-8") as handle:
                    return json.load(handle)
            except (json.JSONDecodeError, OSError):
                return self.default_factory()

    def write(self, data: Any) -> Any:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.path.parent,
                delete=False,
            ) as handle:
                json.dump(data, handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
                temp_name = handle.name
            # Robust replace with retry for Windows file locking / OneDrive sync

            import time
            success = False
            for attempt in range(5):
                try:
                    os.replace(temp_name, self.path)
                    success = True
                    break
                except PermissionError:
                    time.sleep(0.05 * (attempt + 1))

            if not success:
                try:
                    import shutil
                    shutil.copyfile(temp_name, self.path)
                    os.unlink(temp_name)
                except Exception:
                    os.replace(temp_name, self.path)

            return deepcopy(data)


    def update(self, mutator: Callable[[Any], Any]) -> Any:
        with self._lock:
            current = self.read()
            next_value = mutator(current)
            if next_value is None:
                next_value = current
            return self.write(next_value)


users_store = JsonStore(settings.data_dir / "users.json", dict)
sessions_store = JsonStore(settings.data_dir / "sessions.json", dict)
results_store = JsonStore(settings.data_dir / "results.json", dict)
messages_store = JsonStore(settings.data_dir / "messages.json", list)
content_store = JsonStore(
    settings.data_dir / "custom_content.json",
    lambda: {"passages": [], "word_sets": []},
)
game_sessions_store = JsonStore(settings.data_dir / "game_sessions.json", list)
memory_bank_store = JsonStore(settings.data_dir / "memory_bank.json", list)
reminders_store = JsonStore(settings.data_dir / "reminders.json", list)
routine_logs_store = JsonStore(settings.data_dir / "routine_logs.json", list)
sync_receipts_store = JsonStore(settings.data_dir / "sync_receipts.json", dict)
audit_store = JsonStore(settings.data_dir / "audit_log.json", list)
consent_store = JsonStore(settings.data_dir / "consents.json", dict)
rhythm_songs_store = JsonStore(settings.data_dir / "rhythm_songs.json", list)
rhythm_sessions_store = JsonStore(settings.data_dir / "rhythm_recall_sessions.json", list)

