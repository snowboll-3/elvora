# ELVORA V1 — Architecture Snapshot
VERSION: V1
DATE: 2026-02-22
STATUS: LOCKED (Backend Stable, API v0.1 Structured)

---

## 1) Core Concept
Elvora V1 is an audit and validation layer above operational events.
Modes:
- shadow
- validate
- record-only

Event model:
- append-only
- server timestamp
- SHA-256 hash verification

---

## 2) Integration API v0.1

### Authentication
POST /auth/token

### Event Ingestion
POST /events
GET /events?since=timestamp
GET /sse/events (optional)

Event types:
- scan
- move
- temperature
- robot_status
- system_status
- error

### Inventory Context
GET /inventory/item/{id}
GET /inventory/location/{id}
POST /inventory/move

### Task Validation
POST /tasks/validate
Output:
- APPROVED
- BLOCKED
- WARNING

### Compliance Engine
POST /compliance/check
Checks:
- HACCP
- FEFO/FIFO
- ADR
- zone restriction
- rule pack validation

Output:
- PASS
- FAIL
- risk_score

### Audit & Export
GET /audit/export
Formats:
- JSON
- CSV
- PDF

### Mode Control
GET /system/mode
POST /system/mode

Modes:
- shadow
- validate
- record-only

---

## 3) Operational Continuity
- Health endpoint
- Event buffer
- Local queue
- Sync after recovery

---

## 4) Trial Logic
- 90 days
- Starts at first real event
- Backend countdown
- trial_start_timestamp logged

---

## 5) Post-Trial Behaviour
If expired:
- mode -> record-only
- validation disabled
- blocking disabled
Event logging remains active.

---

## 6) AI Activation Flow
- Detect trial_expired
- Calculate pricing (Option A)
- Generate tier
- Unlock features
- Log activation event

---

## 7) Data Governance
Standard retention: 30 days
Optional early deletion: 3-10 days

Before deletion:
- Full export
- Deletion certificate
- Audit compliance check

---

## 8) Implemented (This Channel)
- Append-only NDJSON log
- SHA-256 hash verification
- Write key protection
- Read key protection
- Health endpoint
- Event read endpoint
- Log rotation (scheduled)
- PM2 stable (MASTER path)
- ENV locked
- Master consolidation complete

---

END OF SNAPSHOT
