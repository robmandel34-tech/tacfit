#!/usr/bin/env bash
# Adds Heart Rate Variability (HRV / heartRateVariabilitySDNN) support to the
# @perfood/capacitor-healthkit native iOS plugin.
#
# WHY THIS EXISTS
# ----------------
# The published plugin (1.3.x) has NO case for HRV in its Swift `getSampleType`
# / `getTypes` / unit-mapping code, so any HRV read is rejected with
# "Must provide sampleName" / returns nil — even though the user clearly has
# HRV data in Apple Health. HRV is the single strongest readiness signal
# (0.30 weight in server/readiness-service.ts), so we patch the plugin to read
# it (HKQuantityTypeIdentifier.heartRateVariabilitySDNN, unit: ms).
#
# node_modules is gitignored and Codemagic runs a fresh `npm install`, so this
# script must run on EVERY build, AFTER install and BEFORE `pod install`
# (CocoaPods compiles the Swift from node_modules).
#
# Idempotency is per-insertion (NOT a coarse "any HRV token present" early
# exit): each of the three insertions is skipped only if its exact snippet is
# already present, and a final verification ALWAYS asserts all three are in
# place. That way a future plugin version with partial/different HRV support
# cannot silently false-pass with incomplete support.
set -euo pipefail

PLUGIN_SWIFT="node_modules/@perfood/capacitor-healthkit/ios/Plugin/CapacitorHealthkitPlugin.swift"

if [ ! -f "$PLUGIN_SWIFT" ]; then
  echo "ERROR: HealthKit plugin Swift not found at $PLUGIN_SWIFT" >&2
  echo "       Did 'npm install' run first?" >&2
  exit 1
fi

python3 - "$PLUGIN_SWIFT" <<'PY'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# Each tuple: (anchor to insert after, full replacement, the inserted snippet
# used both as the "already applied?" marker and as the final verification).
SAMPLE_TYPE_MARKER = (
    '        case "heartRateVariabilitySDNN":\n'
    '            return HKQuantityType.quantityType(forIdentifier: HKQuantityTypeIdentifier.heartRateVariabilitySDNN)!\n'
)
TYPES_MARKER = (
    '            case "heartRateVariabilitySDNN":\n'
    '                types.insert(HKQuantityType.quantityType(forIdentifier: HKQuantityTypeIdentifier.heartRateVariabilitySDNN)!)\n'
)
UNIT_MARKER = (
    '                } else if sampleName == "heartRateVariabilitySDNN" {\n'
    '                    unit = HKUnit.secondUnit(with: .milli)\n'
    '                    unitName = "ms"\n'
)

insertions = [
    # 1) getSampleType: map the HRV sampleName string to the HealthKit type.
    (
        '        case "restingHeartRate":\n'
        '            return HKQuantityType.quantityType(forIdentifier: HKQuantityTypeIdentifier.restingHeartRate)!\n',
        SAMPLE_TYPE_MARKER,
    ),
    # 2) getTypes: include HRV in the authorization (read) request.
    (
        '            case "restingHeartRate":\n'
        '                types.insert(HKQuantityType.quantityType(forIdentifier: HKQuantityTypeIdentifier.restingHeartRate)!)\n',
        TYPES_MARKER,
    ),
    # 3) generateOutput: report HRV in milliseconds. MUST sit before the generic
    #    minute/count compatibility branches or HRV (a time quantity) would be
    #    converted to minutes.
    (
        '                } else if sampleName == "oxygenSaturation" {\n'
        '                    unit = HKUnit.percent()\n'
        '                    unitName = "percent"\n',
        UNIT_MARKER,
    ),
]

changed = False
for anchor, marker in insertions:
    if marker in src:
        continue  # this specific insertion already applied
    if src.count(anchor) != 1:
        sys.stderr.write(
            "ERROR: expected exactly 1 match for an HRV anchor but found "
            f"{src.count(anchor)}. The plugin source may have changed; update "
            "scripts/patch-healthkit-hrv.sh.\n"
        )
        sys.exit(1)
    src = src.replace(anchor, anchor + marker)
    changed = True

# Always verify ALL three insertions are present, even if nothing changed this
# run — guards against partial/upstream HRV support slipping through.
problems = []
if SAMPLE_TYPE_MARKER not in src:
    problems.append("getSampleType HRV case")
if TYPES_MARKER not in src:
    problems.append("getTypes HRV auth case")
if UNIT_MARKER not in src:
    problems.append('HRV millisecond unit branch (before generic minute branch)')

# The unit branch must come before any generic minute compatibility branch.
minute_idx = src.find("compatibleWith: HKUnit.minute()")
unit_idx = src.find(UNIT_MARKER)
if unit_idx == -1 or (minute_idx != -1 and unit_idx > minute_idx):
    problems.append("HRV unit branch is missing or ordered after the minute branch")

if problems:
    sys.stderr.write(
        "ERROR: HRV patch verification failed: " + "; ".join(problems) + "\n"
    )
    sys.exit(1)

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("HRV patch applied and verified:", path)
else:
    print("HRV patch already fully present and verified:", path)
PY
