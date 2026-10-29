"""Builds the instructor submission ZIP: Database/, Backend/ and Frontend/ only.

Project-level files (README.md, docker-compose.yml, .env.example, .gitignore) are copied into
Backend/project-root/ inside the archive so the three-folder submission is self-sufficient.
Excludes dependencies, builds, uploads, real .env files and logs, and fails if anything looks like a secret.

Usage (from the repository root):  python scripts/build_submission_zip.py ["../Ameer Zubedat.zip"]
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "Ameer Zubedat.zip"))
FOLDERS = ("Database", "Backend", "Frontend")
ROOT_FILES = ("README.md", "docker-compose.yml", ".env.example", ".gitignore")
EXCLUDED_DIRS = {"node_modules", "dist", "uploads", "coverage", ".vite", ".tmp", "project-root"}
SECRET_PATTERNS = [re.compile(rb"AIza[0-9A-Za-z_\-]{30,}"), re.compile(rb"sk-ant-[0-9A-Za-z_\-]{20,}")]


def excluded(name: str) -> bool:
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        return True
    return name.endswith((".tsbuildinfo", ".log")) or name in {".DS_Store", "Thumbs.db"}


def check_secret(path: str) -> None:
    with open(path, "rb") as handle:
        data = handle.read()
    for pattern in SECRET_PATTERNS:
        if pattern.search(data):
            raise SystemExit(f"Refusing to package {path}: it looks like it contains an API key")


def main() -> None:
    count = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for top in FOLDERS:
            for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, top)):
                dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDED_DIRS)
                for name in sorted(filenames):
                    if excluded(name):
                        continue
                    full = os.path.join(dirpath, name)
                    check_secret(full)
                    archive.write(full, os.path.relpath(full, ROOT).replace(os.sep, "/"))
                    count += 1
        for name in ROOT_FILES:
            full = os.path.join(ROOT, name)
            check_secret(full)
            archive.write(full, f"Backend/project-root/{name}")
            count += 1
    print(f"{OUT}: {count} files, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
