#!/bin/zsh
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "Hot Sour Soup Manager needs Python 3."
  echo ""
  echo "Install it from https://www.python.org/downloads/ or with Homebrew:"
  echo "brew install python"
  echo ""
  echo "No .NET Framework is required."
  echo ""
  read "?Press Return to close this window."
  exit 1
fi

if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo ""
  echo "Something is already using port 8000."
  echo "Opening the manager in that existing local server."
  echo ""
  open "http://localhost:8000/manage_website/"
  read "?Press Return to close this window."
  exit 0
fi

echo ""
echo "Starting Hot Sour Soup Manager..."
echo "Keep this window open while using the manager."
echo ""

(sleep 2 && open "http://localhost:8000/manage_website/") &
python3 -m http.server 8000
