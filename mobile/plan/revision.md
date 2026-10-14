CacaoScan — AUDIT REQ_TRIGGER FAULT_QUEUE_FULL

AUDIT / PLAN ONLY.

Do NOT modify files.
Do NOT stage.
Do NOT commit.
Do NOT push.

==================================================
NEW PHYSICAL RESULT
==================================================

The previous fix was implemented:

onEntryDetected()
-> LIFE_WAIT_CAMERA
-> dispatchOldestCameraBean()

After flashing, physical IR1 test produced:

[BEAN 8] DETECTED
[BEAN 8] WAIT_CAMERA
[FAULT] FAULT_QUEUE_FULL
[FAULT] FAULT_QUEUE_FULL
... repeated

There was NO:

[BEAN 8] CLASSIFY_QUEUED

and therefore no automatic /trigger reached Flask.

Manual Flask /trigger was already proven working.

==================================================
GOAL
==================================================

Find exactly why dispatchOldestCameraBean() cannot enqueue REQ_TRIGGER.

Do NOT increase queue size or redesign anything until the cause is
proven.

Audit ONLY:

firmware/models/ver_1/CacaoScan_AI.ino


==================================================
TRACE requestQueue COMPLETELY
==================================================

Report:

1. Where requestQueue is declared.

2. Exact xQueueCreate call:
   - queue length
   - item size

3. Exact request struct/type stored in the queue.

4. Every xQueueSend / xQueueSendToBack / xQueueSendToFront writer to
   requestQueue.

5. Every xQueueReceive consumer.

6. Whether machine command polling uses requestQueue or bypasses it.

7. Whether any request is inserted during setup/startup before IR1.

8. Whether a failed/unfinished old request can remain in requestQueue.

9. Whether edgeHttpTask can become blocked long enough that the queue
   remains full.

10. Whether the task was successfully created and is actually running.

11. Whether the queue handle can be null.

12. Whether dispatchOldestCameraBean() currently reports the same
    FAULT_QUEUE_FULL for:
    - requestQueue == nullptr
    - actual xQueueSend failure

If those two causes share the same fault, distinguish them in the audit.


==================================================
IMPORTANT PHYSICAL CLUE
==================================================

The firmware is simultaneously able to poll:

GET /machine/command/next?machine_id=CS-0001

in the previously validated setup.

Determine whether that proves edgeHttpTask is alive, or whether command
polling occurs through a separate path/task.


==================================================
REPEATED FAULT PRINTS
==================================================

Audit why:

[FAULT] FAULT_QUEUE_FULL

prints repeatedly after one IR1 event.

Determine whether:

A. dispatchOldestCameraBean() is being called repeatedly,

or

B. a latched global fault is merely printed repeatedly elsewhere.

Do not change that behavior yet; just identify it.


==================================================
DO NOT CHANGE
==================================================

Do not change:

- queue capacity
- IR debounce
- bean timing
- servo control
- conveyor control
- command polling
- network recovery
- edge_server.py
- mobile
- YOLO

until the root cause is identified.


==================================================
RETURN
==================================================

A. exact requestQueue declaration and creation
B. queue length and item size
C. all producers
D. all consumers
E. queue state expected immediately after boot
F. whether edgeHttpTask is definitely alive
G. why the first automatic REQ_TRIGGER gets FAULT_QUEUE_FULL
H. why the fault line repeats
I. smallest safe fix
J. exact file(s) that would change
K. physical verification procedure
L. confirm no files changed
M. confirm nothing staged/committed/pushed