# Android app notifications

For 1.2.0 grouping, message actions and call changes, see [chat-and-calls.md](chat-and-calls.md).

Email and Android push use independent delivery services. Email arriving does not
confirm that a phone registered with Firebase Cloud Messaging (FCM).

## Deployment requirements

1. Configure the backend with `FIREBASE_SERVICE_ACCOUNT`, containing the Firebase
   service account JSON for the same project as `android/app/google-services.json`.
   Alternatively, configure `GOOGLE_APPLICATION_CREDENTIALS` to point to a private
   service account file available to the backend. Keep this credential in the
   hosting provider's secret configuration; do not put it in the client, APK or Git.
   Enable the Firebase Cloud Messaging API and give the account permission to send
   FCM messages for that project.
2. Deploy the changed backend and website. The Android APK bundles `client/build`
   and connects to the live backend. Frontend changes require a new APK; a website
   deployment does not automatically replace the installed app's screens.
3. Build and install a new APK. Native notification channels, the small icon and
   permissions require an APK update. Use Node 22+ and Java 21. The GitHub workflow
   now uses Node 22 and fails if Capacitor sync fails. It currently builds a debug
   APK; release signing is outside this notification fix.

The backend logs `[Push] Disabled: missing_credentials` or `invalid_credentials`
when Firebase is unavailable. It no longer returns mock success for an unsent push.
The authenticated `GET /api/auth/push-status` reports whether server credentials
initialized; a successful test send is still needed to check permission/project
matching. FCM acceptance is not proof that Android displayed the notification.

## Android 13 check

1. Open UniCore, allow notifications, and sign in.
2. Open **Settings → App notifications**. Use **Enable / reconnect notifications**
   if the phone has not registered. If Android has blocked permission, use
   **Phone Settings → Apps → UniCore → Notifications**, allow notifications and
   sound/pop-up alerts, then return and reconnect.
3. Tap **Send test notification** and check the phone's notification panel.
   This sends only to the signed-in account's current phone; it sends no email.
4. With two test accounts and a test course, check messages, posts, lecture uploads
   and exam creation while the receiving app is open, then while it is in the
   background with the screen locked. Tapping an alert should open its app route.
5. Sign out on the receiving phone. Its token should be removed from that account.
   Sign in as the other account and confirm alerts follow the new account.

Android controls banners, sounds, lock-screen visibility, Do Not Disturb and
notification-channel settings. An app cannot force a banner when the user or OS
blocks it. Android's force-stop state also prevents normal push delivery until
the app is opened again.

## Covered events and limits

- New community posts, lectures, exams, assignments, messages and existing
  reminder events dispatch push from the Notification model. Bulk notification
  inserts use the same dispatcher. Editing an existing notification does not
  resend it. Invalid device tokens are removed and multiple phones are supported.
- Foreground socket/FCM events with the same notification ID display one alert.
  Immediate local alerts no longer require exact-alarm scheduling.
- Authenticated incoming calls send a short-lived push alert. This is a call
  notification opening the conversation. Continuous ringing, a native answer/
  reject screen, and recovery of a WebRTC call after Android kills the app require
  a separate persistent call-session/native calling implementation.
- Exam creation already creates notifications. The existing scheduler controls
  later reminders; this change does not add a new exact exam-start scheduler or a
  guaranteed background job service.

## Local verification

```powershell
npm --prefix server run test-push
npm --prefix client test -- --watchAll=false --runInBand --cacheDirectory=../scratch/jest-push --runTestsByPath src/services/nativeBridge.test.js
npm --prefix client test -- --watchAll=false --runInBand --cacheDirectory=../scratch/jest-push --runTestsByPath src/services/nativeFiles.test.js
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

The tests isolate Firebase, MongoDB and native APIs. They send no actual push or
email. A device test and live backend configuration check remain necessary.

The build script requires Java 21 and Android SDK 35, builds bundled web assets,
syncs Capacitor, and runs `assembleDebug testDebugUnitTest`. It writes
`release-output/UniCore-1.2.0-debug.apk`. A different debug signing key from an
older APK can prevent updating it in place. Preserve any needed local data before
uninstalling an older build. Production distribution needs a stable signing key.

Android file downloads and generated PDF/Excel/CSV exports now use a system save
picker. Sharing uses Android's share sheet; printing and PDF opening use native
handlers. Camera and microphone permissions are declared for calls. Full offline
editing and persistent native call sessions are not implemented.

Local verification: 9 server push tests and 14 client bridge/file tests passed;
web build and Android debug build passed. APK metadata reports version 1.1.0,
target SDK 35, notification/camera/microphone permissions, bundled index.html and
no remote `server.url`. These checks do not establish delivery to a real phone.
The Render service uses the free plan, which can sleep when idle; scheduled
reminders and prompt call handling require an always-running backend.

References: [Android FCM reception](https://firebase.google.com/docs/cloud-messaging/android/receive-messages),
[Firebase Admin setup](https://firebase.google.com/docs/admin/setup),
[Capacitor push notifications](https://capacitorjs.com/docs/apis/push-notifications).
