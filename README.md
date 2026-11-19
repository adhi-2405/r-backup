# CODE CLASH — BORDERLAND PROTOCOL

A single-instance, no-database Node.js + Express event platform for VECODERS Technical Club. It serves the participant and admin pages from one process, grades on the server, and persists a JSON snapshot to disk.

## What is included

- `server.js` — participant sessions, server-authoritative timers, grading, admin APIs, SSE updates and JSON persistence.
- `config.js` — environment-based event configuration.
- `questions.json` — server-only Round 1 answer keys and the final three Round 2 cases, accepted answers and hints. Never move this file into `public/`.
- `content.js` — backward-compatible server-side alias to `questions.json`.
- `core.js` — validation, normalization, scoring, qualification and tie-breaking helpers.
- `public/index.html` — one single-page frontend containing the landing, login, waiting room, game, admin, leaderboard and winners views.
- `public/style.css` — all frontend styling.
- `public/script.js` — frontend navigation and browser-side interactions (plain JavaScript; no React).
- `scripts/seed-test.js` — creates 12 rehearsal-only participants in a separate data directory.
- `scripts/loadtest.js` — destructive 100-client end-to-end rehearsal script.
- `test/` — unit and HTTP integration tests.

## Requirements and setup

Use Node.js 20 or newer.

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set a strong, private `ADMIN_PASSWORD`. Keep `.env` out of source control. Then:

```powershell
npm test
npm start
```

When the server starts, the terminal prints the participant, admin and health-check URLs. Open these routes on the computer running the server (they are views inside the same `index.html` page):

- Participant landing page: `http://localhost:3000`
- Admin console: `http://localhost:3000/admin`
- Public leaderboard: `http://localhost:3000/#leaderboard` (visible only when enabled by the admin)
- Winners: `http://localhost:3000/#winners` (available after publishing)

`localhost` is a local address, not a public internet URL. To let participants connect from other devices, deploy the app to a host and use its HTTPS domain, or make the local server reachable on the event network with appropriate firewall rules.

## Event timing and grading

### Round 1 — THE GAUNTLET

- 30 multiple-choice questions; each has a **20-second maximum** in production.
- Each participant gets a fixed random question order and a random option order.
- Selecting an option saves a draft. Pressing **Submit answer → Next question** records the answer with a server timestamp, grades it immediately and opens the next question immediately.
- If the participant does not submit, the server locks the question at 20 seconds, grades the saved selection (or zero if blank), and advances automatically.
- A participant can finish early by submitting early. The overall round hard-closes after 10 minutes unless the host ends it earlier.
- Scores: Easy 1, Medium 1.5, Hard 1.9; maximum 40 points.
- Both rounds record browser visibility, window-focus and fullscreen-exit signals with timestamps. A first event warns the participant; repeated events are flagged for admin review. In Round 1, the second event locks the remaining questions pending review. In Round 2, the participant can continue while the event is flagged for review. A website cannot reliably detect OS-level split-screen, other monitors or second devices. No screen recording or browsing-history collection is performed.

### Round 2 — LAB LOCKDOWN

- Finalists are assigned one of the final cases: **The Shared Folder**, **The Student Portal**, or **The Conference Wi-Fi**. Assignment is balanced as evenly as possible.
- Each case has four short-answer questions worth 4, 4, 6 and 6 points.
- Each question has a **five-minute maximum**. Pressing Submit records the answer and server timestamp, grades it immediately, and opens the next question without waiting for the timer.
- If the participant does not submit, the server locks the question at five minutes and grades the latest saved answer (or zero if blank).
- One optional hint is available per question. It costs one point only if the submitted answer is correct. The hint reveal is stored on the server.
- Speed adds no points. For equal totals, the tie-break order is higher Round 2 score, then the earlier timestamp of the last correct Round 2 answer, then an admin-recorded sudden-death decision.
- The same browser visibility, window-focus and fullscreen-exit monitoring applies in Round 2. Repeated events are flagged for admin review; they do not automatically stop a Round 2 attempt.

## Configuration

| Variable | Default | Purpose |
|---|---:|---|
| `ADMIN_PASSWORD` | required | Admin password. Admin login is unavailable if blank. |
| `PORT` | `3000` | HTTP port. |
| `FINALISTS` | `12` | Default finalist cutoff; ties at the cutoff also qualify. |
| `DATA_DIR` | `./data` | Directory containing `state.json`. Use a persistent volume in deployment. |
| `REHEARSAL_MODE` | `0` | Set to `1` for 5-second Round 1 and 20-second Round 2 question slots. |
| `R1_SLOT_SECONDS` | `20` | Optional explicit Round 1 slot override. Normally leave unset. |
| `TRUST_PROXY` | `0` | Set to `1` only behind a trusted reverse proxy. |

## Admin guide

1. Open `/admin` and authenticate with `ADMIN_PASSWORD`. The health endpoint is `/health`.
2. Registration is open by default. Use **Close registration** / **Open registration** before Round 1 if needed.
3. Optional: paste a CSV with `name,registerno,department` columns and upload the roster. If a roster is loaded, register number, name and department must match.
4. Start Round 1. Participants receive a short five-second host countdown.
5. Use **End Round 1** to close it early, or allow its 10-minute maximum to expire.
6. Resolve all pending monitoring reviews before qualifying. Review records include the round and event timestamp.
7. Choose the finalist count and apply qualification. All ties at the cutoff qualify. The three cases are assigned in a balanced random order.
8. Start Round 2. Use End Round 2 only if the host must close it early. Review wrong answers in the Round 2 Answer Review area; accepting an answer requires a reason and updates the accepted list for that question.
9. The submission log shows the participant, round, question, submitted answer, server time, grading result and awarded points. The leaderboard shows each Round 2 question result.
10. Use score correction, restore/disqualify, recovery login and sudden-death controls only with a clear reason. Admin actions are written to the audit log.
11. Export results CSV, violations CSV and a full JSON backup. Enable the public leaderboard when appropriate.
12. Publish winners after Round 2 is complete. Reset requires typing `RESET` and permanently clears the event state.

## Rehearsal

The normal event state is never pre-seeded. To create a separate rehearsal state with 12 fake participants:

```powershell
npm run seed:test
$env:DATA_DIR="./data/rehearsal"
$env:REHEARSAL_MODE="1"
npm start
```

This uses `data/rehearsal/state.json`, not `data/state.json`. Use the rehearsal directory only for practice; delete it when finished.

For a destructive 100-client rehearsal, use a disposable local server and separate rehearsal data. Set `REHEARSAL_MODE=1`, configure `ADMIN_PASSWORD`, start the server, then in another terminal:

```powershell
$env:LOADTEST_CONFIRM="YES"
npm run loadtest
```

The load test resets the event state it is connected to, creates 100 simulated participants, submits all 30 Round 1 questions and all four Round 2 questions, and checks the final score and winners. **Never run it against live event data.** It tests early submission and concurrency; it is not a security audit or a guarantee of unlimited capacity.

## Deployment notes

For Railway or Render:

- Build/install command: `npm install`
- Start command: `npm start`
- Set `ADMIN_PASSWORD` as a secret.
- Attach a persistent writable volume and set `DATA_DIR` to its mount path.
- Keep exactly one running application replica. This implementation uses in-memory live state plus a JSON snapshot and is not a multi-instance distributed system.
- Use HTTPS for participant traffic. Set `TRUST_PROXY=1` only when the hosting provider's reverse proxy is trusted and configured.

No deployment has been performed by this project build; no public website URL exists until you deploy it.

## Verification and limitations

The pure helper tests cover login validation, scoring totals, answer normalization, hint penalties, qualification ties, timing helpers and tie-breaking. The HTTP integration tests run only after the project dependencies are installed. The 100-client load test is provided but must be run on a disposable server before event day.

The JSON file store is designed for one server instance with a persistent disk. For production use, rehearse registration, recovery, pause/resume, both rounds, answer review, exports, restart recovery and winner publication in the same hosting environment you will use on event day. Passing automated tests does not prove the absence of all defects.

## Event-day checklist

- [ ] Set a strong `ADMIN_PASSWORD`; never share it with participants.
- [ ] Confirm Node.js 20+, install dependencies and run `npm test`.
- [ ] Confirm the persistent `DATA_DIR` volume is mounted and writable.
- [ ] Verify `REHEARSAL_MODE=0` and Round 1 is 20 seconds per question.
- [ ] Run a complete rehearsal with test accounts, including early submit and timeout paths in both rounds.
- [ ] Test duplicate login refusal and one-time recovery.
- [ ] Test the roster with one valid and one invalid participant.
- [ ] Test monitoring warning in both rounds, pending review, restore and disqualification.
- [ ] Verify every Round 2 case, hint penalty, accepted answer and admin answer review.
- [ ] Check the admin submission log, CSV exports and JSON backup.
- [ ] Confirm the public leaderboard is hidden until the host enables it.
- [ ] Keep an independent backup of `state.json` after major stages.
- [ ] Do not reset until results and backups are secured.
