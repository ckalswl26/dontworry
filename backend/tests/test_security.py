"""API 키가 소스코드/README/프론트엔드 번들 어디에도 하드코딩되지 않았는지 검증한다."""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# 사용자가 채팅으로 전달한 실제 키 값 일부 (커밋되면 절대 안 되는 문자열들)
FORBIDDEN_LITERALS = [
    "QNsnM63WWJt3L3OaulxGvjvG79wmFWaBHcdjfwc3B7gaDa6oO5EzOxdehTlav8vF1115aCkM5",
    "feb79f4f650b9aab8fa1218499db49b1",
    "B6SZ7O808K9RA2C1I71E",
]

SKIP_DIRS = {".git", "node_modules", ".next", "__pycache__", ".venv", "venv", "dist", "build"}

# 실제 키를 담도록 만들어진 로컬 전용 파일 (.gitignore로 커밋 자체가 막혀 있다 -
# test_gitignore_excludes_env_files 참고). 이 검사는 "커밋될 수 있는 파일"만 대상으로 한다.
SKIP_FILENAMES = {".env", ".env.local", ".env.production"}

THIS_FILE = Path(__file__).resolve()


def _iter_text_files():
    for path in PROJECT_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path == THIS_FILE:
            continue
        if path.name in SKIP_FILENAMES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".ico", ".pdf", ".woff", ".woff2"}:
            continue
        yield path


def test_no_forbidden_api_key_literals_in_repo():
    offenders = []
    for path in _iter_text_files():
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except (OSError, UnicodeDecodeError):
            continue
        for literal in FORBIDDEN_LITERALS:
            if literal in content:
                offenders.append((str(path), literal[:12]))
    assert offenders == [], f"Forbidden API key literal(s) found in repo: {offenders}"


def test_env_example_has_no_real_values():
    env_example = PROJECT_ROOT / "backend" / ".env.example"
    content = env_example.read_text(encoding="utf-8")
    for line in content.splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, _, value = line.partition("=")
            if "KEY" not in key.upper():
                continue  # non-secret defaults (e.g. CORS origins) are fine to document
            assert value.strip() == "", f"{key} should be empty in .env.example, got a value"


def test_gitignore_excludes_env_files():
    gitignore = PROJECT_ROOT / ".gitignore"
    content = gitignore.read_text(encoding="utf-8")
    for pattern in [".env", ".env.local", ".env.production"]:
        assert pattern in content
