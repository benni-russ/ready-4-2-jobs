#!/bin/sh
cd "$(dirname "$0")" || exit 1
open -a "Google Chrome" "app/index.html" 2>/dev/null || open -a "Microsoft Edge" "app/index.html" 2>/dev/null || open "app/index.html"
