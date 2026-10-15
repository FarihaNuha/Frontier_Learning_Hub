// Durable outbox: API requests persist notifications; bounded background workers
// deliver them. Expiring leases recover interrupted work after a process restart.
const createDispatcher = ({ claim, deliver, complete, concurrency = 4, now = () => Date.now(), schedule = setImmediate }) => {
  let running = 0, claiming = false, scheduled = false;
  const wake = () => {
    if (scheduled) return;
    scheduled = true;
    schedule(() => { scheduled = false; void drain(); });
  };
  const drain = async () => {
    if (claiming) return;
    claiming = true;
    try {
      while (running < concurrency) {
        const job = await claim(new Date(now()));
        if (!job) break;
        running++;
        void (async () => {
          let delivered = false;
          try { const result = await deliver(job); delivered = result.deviceCount === 0 || result.acceptedCount === result.deviceCount; }
          catch (error) { console.error("[Push] Delivery attempt failed:", error.message); }
          try {
            const attempt = job.pushAttempts || 1;
            await complete(job, {
              pushStatus: delivered ? "delivered" : attempt >= 5 ? "failed" : "pending",
              pushNextAttempt: new Date(now() + Math.min(300000, 5000 * 2 ** attempt)),
            });
          } catch (error) { console.error("[Push] Could not finish delivery lease:", error.message); }
          finally { running--; wake(); }
        })();
      }
    } catch (error) { console.error("[Push] Could not claim delivery:", error.message); }
    finally { claiming = false; }
  };
  return { wake, drain };
};

let dispatcher, timer;
const getDispatcher = () => {
  if (dispatcher) return dispatcher;
  const Notification = require("../models/Notification");
  const { sendUserPushNotification } = require("./fcmService");
  dispatcher = createDispatcher({
    claim: date => Notification.findOneAndUpdate({
      pushStatus: { $in: ["pending", "sending"] }, pushNextAttempt: { $lte: date },
    }, { $set: { pushStatus: "sending", pushNextAttempt: new Date(date.getTime() + 120000) }, $inc: { pushAttempts: 1 } },
    { returnDocument: "after", sort: { pushPriority: 1, pushNextAttempt: 1 } })
      .select("+pushData +pushStatus +pushNextAttempt +pushAttempts").lean(),
    deliver: doc => sendUserPushNotification(doc.userId, {
      title: doc.title, body: doc.message,
      data: { ...doc.pushData, notificationId: String(doc._id), type: doc.type || "general" },
      link: doc.link || "/notifications",
    }),
    complete: (job, values) => Notification.updateOne({ _id: job._id, pushStatus: "sending", pushAttempts: job.pushAttempts }, { $set: values }),
  });
  return dispatcher;
};
exports.wake = () => getDispatcher().wake();
exports.start = () => {
  if (timer) return;
  const worker = getDispatcher(); worker.wake();
  timer = setInterval(worker.wake, 5000); timer.unref();
};
exports.createDispatcher = createDispatcher;
