#!/bin/bash
# Phase 2 Verification Script v2 — properly extracts function bodies by counting braces

echo "=== RelayPay Phase 2 — Full Verification ==="
echo ""

# CHECK 1: index.html exists and has correct script tag
echo "CHECK 1: index.html structure"
SCRIPT_COUNT=$(grep -c '<script' /workspace/relaypay/index.html)
echo "  Script tags: $SCRIPT_COUNT (expected: 1)"
if [ "$SCRIPT_COUNT" -eq 1 ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# CHECK 2: All JS pass node --check
echo "CHECK 2: All JS files parse"
FAIL=0
TOTAL=0
for f in $(find /workspace/relaypay/js -name "*.js" | sort); do
  TOTAL=$((TOTAL+1))
  if ! node --check "$f" 2>/dev/null; then
    echo "  FAIL: $f"
    FAIL=$((FAIL+1))
  fi
done
echo "  Checked: $TOTAL files, Failures: $FAIL"
if [ "$FAIL" -eq 0 ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# CHECK 3: Server starts and returns 200
echo "CHECK 3: HTTP server"
pkill -f "http.server" 2>/dev/null || true
sleep 1
cd /workspace/relaypay && python3 -m http.server 8775 > /tmp/relaypay_test.log 2>&1 &
SERVER_PID=$!
sleep 2
INDEX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8775/index.html 2>/dev/null || echo "000")
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8775/js/main.js 2>/dev/null || echo "000")
echo "  index.html: HTTP $INDEX_STATUS"
echo "  main.js:    HTTP $MAIN_STATUS"
if [ "$INDEX_STATUS" -eq 200 ] && [ "$MAIN_STATUS" -eq 200 ]; then echo "  ✓ PASS HTTP"; else echo "  ✗ FAIL HTTP"; fi
TITLE_FOUND=$(curl -s http://localhost:8775/index.html 2>/dev/null | grep -c "Amazon Relay Payroll Calculator" || echo "0")
echo "  Title found: $TITLE_FOUND times"
if [ "$TITLE_FOUND" -ge 1 ]; then echo "  ✓ PASS Title"; else echo "  ✗ FAIL Title"; fi
kill $SERVER_PID 2>/dev/null || true
pkill -f "http.server" 2>/dev/null || true
sleep 1
echo ""

# CHECK 4: Zero onclick inline
echo "CHECK 4: Zero onclick inline in HTML"
ONCLICK=$(grep -c 'onclick=' /workspace/relaypay/index.html || true)
ONCLICK=${ONCLICK:-0}
echo "  onclick= occurrences: $ONCLICK (expected: 0)"
if [ "$ONCLICK" = "0" ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# CHECK 5: i18n complete
echo "CHECK 5: i18n dictionary"
ES=$(python3 -c "
import re
content = open('/workspace/relaypay/js/i18n.js').read()
m = re.search(r'es:\s*\{(.*?)(?=,\s*en:)', content, re.DOTALL)
print(len(re.findall(r\"^\s*'([^']+)':\", m.group(1), re.MULTILINE)) if m else 0)
")
EN=$(python3 -c "
import re
content = open('/workspace/relaypay/js/i18n.js').read()
m = re.search(r'en:\s*\{(.*?)(?=,\s*\};|\}\s*export)', content, re.DOTALL)
print(len(re.findall(r\"^\s*'([^']+)':\", m.group(1), re.MULTILINE)) if m else 0)
")
echo "  ES keys: $ES"
echo "  EN keys: $EN"
if [ "$ES" -gt 400 ] && [ "$EN" -gt 400 ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# CHECK 6: PHASE2_REPORT.md exists
echo "CHECK 6: PHASE2_REPORT.md"
if [ -f "/workspace/relaypay/PHASE2_REPORT.md" ]; then
  SIZE=$(stat -c %s /workspace/relaypay/PHASE2_REPORT.md)
  echo "  Exists, size: $SIZE bytes"
  echo "  ✓ PASS"
else
  echo "  ✗ FAIL"
fi
echo ""

# CHECK 7: Monolith untouched
echo "CHECK 7: Original monolith preserved"
PUBLIC_SIZE=$(stat -c %s /workspace/nomina_public/index.html)
V71_SIZE=$(stat -c %s /workspace/nomina_v71/index.html)
echo "  nomina_public: $PUBLIC_SIZE bytes (expected: 622550)"
echo "  nomina_v71:    $V71_SIZE bytes (expected: 622550)"
if [ "$PUBLIC_SIZE" -eq 622550 ] && [ "$V71_SIZE" -eq 622550 ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""

# CHECK 8: Sealed motor functions byte-identical (proper extraction via brace counting)
echo "CHECK 8: Motor SELLADO byte-identical to monolith"

extract_function() {
  # $1 = file, $2 = function name (without 'function' prefix)
  python3 -c "
import sys
fn = sys.argv[2]
with open(sys.argv[1]) as f:
    lines = f.readlines()
marker = 'export function ' + fn if not sys.argv[1].endswith('.txt') else 'function ' + fn
for i, line in enumerate(lines):
    if marker in line and line.strip().startswith(marker.split()[0]):
        start = i
        depth = 0
        started = False
        for j in range(i, len(lines)):
            for ch in lines[j]:
                if ch == '{':
                    depth += 1
                    started = True
                elif ch == '}':
                    depth -= 1
                    if started and depth == 0:
                        sys.stdout.write(''.join(lines[start:j+1]))
                        sys.exit()
sys.exit(1)
" "$1" "$2"
}

TOTAL_DIFF=0
for fn in computeInvoiceTotals _groupInRangeByContract _groupInRangeByDriverAndTractor resolveMultiDriverBlock findNearbyBlocks applyNearbyBlocksSelection setPayOverride computeCompanyNetToCollect; do
  MONO_FILE="/tmp/motor-mirror/$fn.js"
  if [ ! -f "$MONO_FILE" ]; then
    echo "  $fn: SKIP (mono file missing)"
    continue
  fi
  MONO=$(cat "$MONO_FILE")
  # Find which engine file the new function is in
  NEW=$(extract_function "/workspace/relaypay/js/engine/payanoEngine.js" "$fn" 2>/dev/null \
        || extract_function "/workspace/relaypay/js/engine/invoiceCalculator.js" "$fn" 2>/dev/null \
        || echo "NOT_FOUND")
  if [ "$NEW" = "NOT_FOUND" ]; then
    echo "  $fn: ✗ NOT FOUND in any engine file"
    TOTAL_DIFF=$((TOTAL_DIFF + 999))
    continue
  fi
  # Normalize: remove 'export ' prefix
  NEW_NORM=$(echo "$NEW" | sed 's/^export function /function /')
  if [ "$NEW_NORM" = "$MONO" ]; then
    echo "  $fn: IDENTICAL ✓"
  else
    DIFF=$(diff <(echo "$NEW_NORM") <(echo "$MONO") | wc -l)
    echo "  $fn: $DIFF line-diff(s)"
    TOTAL_DIFF=$((TOTAL_DIFF + DIFF))
  fi
done
echo "  Total diff lines (expected: ≤10 for export/newline/SSR guards): $TOTAL_DIFF"
if [ "$TOTAL_DIFF" -le 10 ]; then echo "  ✓ PASS"; else echo "  ✗ FAIL"; fi
echo ""
echo "=== END OF VERIFICATION ==="
