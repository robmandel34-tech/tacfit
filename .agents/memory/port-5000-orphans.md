---
name: Port 5000 orphan processes
description: Dev server restarts crashing with EADDRINUSE — how to diagnose and why
---

Workflow restarts sometimes left the previous dev server alive holding port 5000,
so every new start crashed with `EADDRINUSE` and the whole backend was down
(users see "sending a message doesn't work" etc. — always check workflow status
first when "X stopped working" right after a restart).

**Why:** the server had no SIGTERM handler, so the workflow's stop signal didn't
reliably terminate the tsx/node child. A graceful-shutdown handler (server.close +
forced exit after 5s) was added to `server/index.ts`; restarts have been clean since.

**How to apply:** if it recurs, `lsof`/`fuser`/`ss` are unreliable in this
container — use `ps aux | grep "tsx server"` to find the orphan PIDs, `kill -9`
them, then restart the workflow.
