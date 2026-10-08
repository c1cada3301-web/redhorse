from __future__ import annotations

import os
import sys
from pathlib import Path

# Настройки читаются при импорте app — окружение задаём до него.
_DATA = Path(__file__).parent / ".data"
_DATA.mkdir(exist_ok=True)
os.environ.setdefault("DALA_ENV", "production")
os.environ.setdefault("DALA_DATABASE_URL", f"sqlite+aiosqlite:///{_DATA / 'test.db'}")
os.environ.setdefault("DALA_ADMIN_PASSWORD", "")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
