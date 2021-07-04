#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

git add -A
git commit -m '_'
git rev-parse --short HEAD > "$SCRIPT_DIR/current_sha.txt"
echo "export default \"$(cat $SCRIPT_DIR/current_sha.txt)\"" > "$SCRIPT_DIR/current_sha.js"
git add -A
git commit -m '_'
git push origin main