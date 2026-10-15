# Performance and course notifications

API requests save notifications to a MongoDB outbox instead of waiting for Firebase.
Four concurrent delivery tasks process indexed, leased jobs, prioritizing chats.
Interrupted leases can be recovered after two minutes; failures retry with backoff,
up to five attempts. After that, the row remains `failed` for inspection rather
than being silently reported delivered. Delivery is at least once; native event
IDs suppress repeated phone alerts. Old notification rows are not replayed.

Chat sidebar statistics use one aggregation, replacing two message queries per
person. Socket messages update the current conversation directly. The lightweight
read endpoint marks only displayed incoming IDs and avoids reloading all message
history. Successful sends reuse the server acknowledgement. Lecture/assignment
lists omit base64 file bodies; file-view/download routes retain their content.
Class notification creation uses one bulk insert rather than serial delivery.

Recipients are resolved from the saved course's code, department and session,
with its level/term from the course catalog. Approved registrations, scoped
enrollments and approved retakes must match that cohort. Blocked/non-student
accounts are excluded. Sessionless legacy courses require explicit membership
as well as verified level/term. Unknown or ambiguous metadata produces a clear
error before new content is saved. There is no department/all-students fallback.
Scheduled reminders use the same resolver and skip/report unresolved cohorts.
Both push and email share this audience. Existing notifications are retained.

This deployment stays on one Render Free instance, as requested. Render already
provides its public proxy; another proxy in front of one instance cannot add
backend capacity. Free-instance idle spin-down and network/database latency
remain. Multi-instance deployment would also require shared Socket.IO transport,
shared call-session state and shared uploads before it could preserve current
call/file behavior. No paid plan, additional instance or external queue was added.

Local tests isolate Firebase/database adapters and check audience isolation,
bounded delivery/retries, sidebar query count, read authorization, and message
acknowledgement rendering. They do not establish real-phone latency or a measured
production speedup. Test send time on a warm backend and after an idle period
separately; use two course cohorts to verify real device delivery.
