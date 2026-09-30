#!/usr/bin/env bash
# Adds Apple Health "Mindful Minutes" (HKCategoryTypeIdentifier.mindfulSession)
# support to the @perfood/capacitor-healthkit native iOS plugin.
#
# WHY THIS EXISTS
# ----------------
# Meditation / breathing / prayer apps (Apple Mindfulness, Headspace, Calm,
# Hallow, ...) record sessions as *category samples*, not workouts, so the
# workout sync never sees them. The published plugin (1.3.x) has no
# "mindfulSession" case in `getSampleType` / `getTypes` / `generateOutput`, so
# the read is rejected with "Error in sample name". We patch the plugin to
# authorize + read the samples and emit one row per session (uuid, start/end,
# duration, source app). The client (client/src/lib/healthkit.ts) turns each
# into a synced entry under the raw type HEALTHKIT_MINDFUL_SESSION_TYPE.
#
# node_modules is gitignored and Codemagic runs a fresh `npm install`, so this
# script must run on EVERY build, AFTER install and BEFORE `pod install`
# (CocoaPods compiles the Swift from node_modules). Same idempotency model as
# scripts/patch-healthkit-hrv.sh: each insertion is skipped only if its exact
# snippet is present, and a final verification always asserts all three exist.
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

# Each tuple: (anchor to insert after, inserted snippet). The snippet doubles as
# the "already applied?" marker and as the final verification.
SAMPLE_TYPE_MARKER = (
    '        case "mindfulSession":\n'
    '            return HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier.mindfulSession)!\n'
)
TYPES_MARKER = (
    '            case "mindfulSession":\n'
    '                types.insert(HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier.mindfulSession)!)\n'
)
# One output row per session. `duration` stays in HOURS for consistency with
# the plugin's sleep/workout rows; `durationSec` is the value the client uses.
OUTPUT_MARKER = (
    '            } else if sampleName == "mindfulSession" {\n'
    '                guard let sample = result as? HKCategorySample else {\n'
    '                    return nil\n'
    '                }\n'
    '                let mindfulInterval = sample.endDate.timeIntervalSince(sample.startDate)\n'
    '                let constructedSample: [String: Any] = [\n'
    '                    "uuid": sample.uuid.uuidString,\n'
    '                    "timeZone": getTimeZoneString(sample: sample) as String,\n'
    '                    "startDate": ISO8601DateFormatter().string(from: sample.startDate),\n'
    '                    "endDate": ISO8601DateFormatter().string(from: sample.endDate),\n'
    '                    "duration": mindfulInterval / 3600,\n'
    '                    "durationSec": mindfulInterval,\n'
    '                    "source": sample.sourceRevision.source.name,\n'
    '                    "sourceBundleId": sample.sourceRevision.source.bundleIdentifier,\n'
    '                    "device": getDeviceInformation(device: sample.device),\n'
    '                ]\n'
    '                output.append(constructedSample)\n'
)

insertions = [
    # 1) getSampleType: map the "mindfulSession" sampleName to the category type.
    (
        '        case "sleepAnalysis":\n'
        '            return HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier.sleepAnalysis)!\n',
        SAMPLE_TYPE_MARKER,
    ),
    # 2) getTypes: a dedicated "mindfulSession" read scope for requestAuthorization.
    (
        '            case "activity":\n'
        '                types.insert(HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier.sleepAnalysis)!)\n'
        '                types.insert(HKWorkoutType.workoutType())\n',
        TYPES_MARKER,
    ),
    # 3) generateOutput: emit category-sample rows. Inserted right after the
    #    sleepAnalysis branch, before the workoutType branch, so the generic
    #    HKQuantitySample fallthrough (which would return nil) is never reached.
    (
        '                output.append(constructedSample)\n'
        '            } else if sampleName == "workoutType" {\n',
        None,  # handled specially below (insert BEFORE the workoutType else-if)
    ),
]

changed = False
for anchor, marker in insertions:
    if marker is None:
        # Special case: the output branch goes BETWEEN the sleep branch's
        # `output.append(constructedSample)` and the workoutType `else if`.
        if OUTPUT_MARKER in src:
            continue
        if src.count(anchor) != 1:
            sys.stderr.write(
                "ERROR: expected exactly 1 match for the mindful output anchor but "
                f"found {src.count(anchor)}. The plugin source may have changed; "
                "update scripts/patch-healthkit-mindful.sh.\n"
            )
            sys.exit(1)
        replacement = (
            '                output.append(constructedSample)\n'
            + OUTPUT_MARKER
            + '            } else if sampleName == "workoutType" {\n'
        )
        src = src.replace(anchor, replacement)
        changed = True
        continue
    if marker in src:
        continue  # this specific insertion already applied
    if src.count(anchor) != 1:
        sys.stderr.write(
            "ERROR: expected exactly 1 match for a mindful anchor but found "
            f"{src.count(anchor)}. The plugin source may have changed; update "
            "scripts/patch-healthkit-mindful.sh.\n"
        )
        sys.exit(1)
    src = src.replace(anchor, anchor + marker)
    changed = True

# Always verify ALL three insertions are present, even if nothing changed this
# run — guards against partial/upstream support slipping through.
problems = []
if SAMPLE_TYPE_MARKER not in src:
    problems.append("getSampleType mindfulSession case")
if TYPES_MARKER not in src:
    problems.append("getTypes mindfulSession auth case")
if OUTPUT_MARKER not in src:
    problems.append("generateOutput mindfulSession branch")

# The output branch must sit inside generateOutput, before the workoutType
# branch (otherwise the sample would fall through to the HKQuantitySample cast).
out_idx = src.find(OUTPUT_MARKER)
workout_idx = src.find('} else if sampleName == "workoutType" {')
gen_idx = src.find("func generateOutput(")
if out_idx == -1 or gen_idx == -1 or out_idx < gen_idx or (workout_idx != -1 and out_idx > workout_idx):
    problems.append("mindfulSession output branch is missing or misplaced")

if problems:
    sys.stderr.write(
        "ERROR: Mindful Minutes patch verification failed: " + "; ".join(problems) + "\n"
    )
    sys.exit(1)

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("Mindful Minutes patch applied and verified:", path)
else:
    print("Mindful Minutes patch already fully present and verified:", path)
PY
