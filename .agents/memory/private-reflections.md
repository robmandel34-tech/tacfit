---
name: Private reflections on activities
description: How private session reflections stay private in feeds
---
Verified-session reflections can be marked private (`textInputPrivate`). The rule: privacy is enforced SERVER-SIDE — every feed endpoint that returns activities must strip `textInput` for viewers other than the author (redaction helper applied per feed viewer). Never rely on the client hiding it.
**Why:** UI-only hiding leaks the text to anyone reading the API response.
**How to apply:** any NEW endpoint that returns activity rows must run the same redaction before responding.
