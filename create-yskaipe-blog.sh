#!/usr/bin/env bash

# =============================================================
#  create-yskaipe-blog-structure.sh
#  Creates the folder structure for yskaipe.com simple static blog
# =============================================================

set -euo pipefail

ROOT="yskaipe-blog"

echo "Creating YSKAIPE blog structure → ./${ROOT}/"

mkdir -p "${ROOT}"/{posts,public}

# Root level files (empty for now — replace with your real content)
touch "${ROOT}/index.html"
touch "${ROOT}/about.html"
touch "${ROOT}/favicon.ico"          # ← optional, you can replace later

# Posts (with minimal placeholder HTML so files aren't completely empty)
cat > "${ROOT}/posts/welcome-to-yskaipe.html" << 'END'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to YSKAIPE – Placeholder</title>
</head>
<body>
  <h1>Welcome to YSKAIPE</h1>
  <p>Placeholder post — replace this with real content.</p>
</body>
</html>
END

cat > "${ROOT}/posts/human-ai-teaming-2026.html" << 'END'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Human-AI Teaming in 2026 – Placeholder</title>
</head>
<body>
  <h1>Human-AI Teaming in 2026</h1>
  <p>Placeholder post — replace this with real content.</p>
</body>
</html>
END

# Public assets
# Create empty file as placeholder (replace with your real .jpg)
touch "${ROOT}/public/yskaipe-logo-a1.jpg"

echo ""
echo "Created folder structure:"
echo "───────────────────────────────────────────────"
tree "${ROOT}" || find "${ROOT}" | sort
echo "───────────────────────────────────────────────"
echo ""
echo "Done!"
echo ""
echo "Next steps:"
echo "  1. cd ${ROOT}"
echo "  2. Replace placeholder content in index.html, about.html, and posts/*.html"
echo "  3. Put your real logo → public/yskaipe-logo-a1.jpg"
echo "  4. (optional) Add / replace favicon.ico"
echo "  5. Test locally: python3 -m http.server 8000   (or any static server)"
echo ""

exit 0
