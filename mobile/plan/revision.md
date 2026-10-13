CacaoScan — PHASE 1 MACHINE CONTROL IMPLEMENTATION AUDIT

AUDIT ONLY.

Do NOT modify files.
Do NOT stage.
Do NOT commit.
Do NOT push.

Inspect the ACTUAL implemented code in:

firmware/models/ver_1/CacaoScan_AI.ino
Cacao_Server/edge_server.py

Do not redesign the approved architecture.

Check these implementation details:


1. FLASK CONCURRENCY

POST /machine/command may wait up to 8 seconds for an ESP32 ACK.

During that wait, Flask must still be able to serve:

GET /machine/command/next
POST /machine/command/ack

Confirm:

- Flask is running threaded/concurrently enough for this flow.
- /machine/command does NOT hold a mutex/lock for the entire wait.
- shared command state is protected from races.
- /next and /ack can acquire the command-state lock while the original
  POST is waiting.

Show the relevant locking/waiting code.


2. TIMEOUT VS ACK RACE

Audit the case where ACK arrives at almost the same time as the
8-second caller timeout.

Confirm there is one deterministic winner:

- if ACK resolves first -> acknowledged result
- if timeout resolves first -> timeout, ACK cannot revive it

If Flask rejects a late START ACK, confirm the ESP32 worker receives
that rejection and issues the one-time conveyor fail-safe STOP.


3. 64-BIT COMMAND IDENTITY

Trace command_stream_id through the whole implementation:

Python generation
-> JSON serialization
-> ESP32 parsing
-> CommandRequest
-> loop deduplication
-> CommandResult
-> JSON ACK back to Flask

Confirm it remains full 64-bit throughout.

Look specifically for accidental use of:

int
atoi
strtol
32-bit unsigned long
%u / %lu

where uint64_t / strtoull / equivalent is required.

Show the actual types and parsing/formatting used.


4. COMMAND POLLING STARVATION

Current report says command polling occurs after the bean queue has
been idle for 250 ms.

Determine whether a continuously busy classification queue can prevent
START/PAUSE/STOP polling indefinitely.

STOP is operational, not an emergency stop, so a currently active HTTP
request may impose a bounded delay. However, bean traffic must NOT
starve command polling indefinitely.

Confirm either:

A. command polling is guaranteed periodic/priority even with bean
   requests queued,

or

B. identify the exact starvation problem and propose the smallest
   correction.

Do not implement it yet.


5. GPIO OWNERSHIP

Confirm that outside initial setup:

only the main loop calls setConveyor()

and edgeHttpTask never directly writes GPIO46.

Confirm:

LOW  = physical conveyor RUNNING
HIGH = physical conveyor STOPPED


6. FAIL-SAFE PATH

Confirm Wi-Fi/verified-edge loss is noticed by logic that still runs
while normal machine state is RUNNING.

Confirm:

RUNNING + not calibration + network/edge loss
-> setConveyor(false)
-> STOPPED

But:

calibrationMode == true
-> network loss alone does NOT stop local calibration.


7. PYTHON VALIDATION

Run at minimum:

python -m py_compile Cacao_Server/edge_server.py

Report whether it passes.


Return only:

A. Flask concurrency result
B. timeout/ACK race result
C. 64-bit identity trace
D. command starvation result
E. GPIO ownership result
F. fail-safe result
G. Python compile result
H. any blocking issue that must be fixed before the empty-belt test
I. confirm no files changed
J. confirm nothing staged/committed/pushed