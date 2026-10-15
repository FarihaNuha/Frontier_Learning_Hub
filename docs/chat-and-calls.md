# Android chat 1.2.0

Install the 1.2.0 APK on both phones. Sign in and use Settings > App notifications
> Enable / reconnect notifications. New registrations advertise `native-v2`;
older APKs retain the previous visible Firebase payload until they are upgraded.

## Notification delivery

The new Android Firebase service is the only renderer for `native-v2` phones.
Socket events update chat and in-app state without creating Android alerts.
Data messages use high priority and display immediately in native code, even
when the WebView is not running (Android force-stop still blocks delivery).

Unread messages from each sender share one stable notification. Android
MessagingStyle shows the recent 20 previews and an unread count. Android decides
how many lines fit on screen. Event/message IDs are deduplicated across restarts;
reading a conversation clears its notification. A read timestamp prevents a
delayed older push from bringing it back, while preserving newer unread messages.
Logout/account changes clear stored previews and notifications. An open visible
conversation suppresses new phone alerts for that conversation.

## Message actions

Tap a bubble, long-press/right-click, or use its three-dot menu. Reply quotes a
message in the same conversation. Forward copies only a message the sender can
access and does not expose the original sender to the recipient. Reactions allow
one emoji per person; choosing it again removes it. Sender edits and retractions
sync to both participants. Delete for me hides only that person's copy.
Retractions retain a deleted-message placeholder; existing downloaded files cannot
be revoked. Read receipts synchronize by the latest message actually fetched.
Client-generated request IDs prevent a retry from inserting the same message again.

## Calls and relay configuration

Calls use an app-wide overlay, authenticated signaling, server call IDs, busy
checks, 45-second ringing timeouts, queued ICE candidates and explicit media
cleanup. A ringing call can be recovered when the receiving app opens/reconnects
before it expires. Accepting on one device dismisses it on other devices.
Android screen sharing uses MediaProjection with the system consent dialog and a
visible foreground capture service. It sends bounded 960px/6fps frames through
the WebRTC video sender, including in audio calls. Desktop capture uses
getDisplayMedia. Stopping capture restores the camera/video sender.

Android incoming calls use a separate call channel and Answer/Decline actions.
A full-screen incoming-call activity can appear on the lock screen; Android
chooses whether a banner or full-screen UI is appropriate. On Android 14+, enable
full-screen call access through Settings > App notifications > Incoming call
screen settings. Answer opens/reconnects the app and recovers the ringing session;
Decline uses a short-lived token limited to that recipient and that call, without
storing a login token in Android preferences. End/answer pushes dismiss ringing
UI and prevent delayed push messages from resurrecting it.

The existing Render environment has no TURN configuration. STUN alone cannot
reliably connect every pair of mobile/carrier/restricted networks. Configure a
TURN provider or a coturn server using Render's secret environment fields:

- `TURN_URLS`: comma-separated provider URLs, preferably UDP plus TCP/TLS on 443.
- Either `TURN_SECRET`: coturn REST authentication shared secret (the backend
  generates one-hour HMAC credentials for the signed-in user).
- Or `TURN_USERNAME` and `TURN_CREDENTIAL`: credentials issued by the provider.

Do not commit credentials. The authenticated `/api/community/calls/config`
endpoint returns client ICE credentials with `Cache-Control: no-store`; TURN
credentials must reach the WebRTC client to connect. Temporary credentials are
preferred. A TURN provider/cloud account and any spending require owner setup.
No public anonymous TURN servers or sample credentials are embedded.

Media still uses WebRTC in Capacitor, not a native Android Telecom/foreground
audio/video call service. Keep the app open during calls. Reliable ongoing calls
after Android kills the WebView are not supplied by this release.
Render's free service can also sleep and loses in-memory call sessions on restart.

## Verification

Run `npm --prefix server run test-push`, `npm --prefix server run test-chat` and:

```powershell
npm --prefix client test -- --watchAll=false --runInBand --cacheDirectory=../scratch/jest-push --runTestsByPath src/services/nativeBridge.test.js src/services/nativeFiles.test.js src/contexts/CallContext.test.jsx src/pages/MessagePage.test.jsx
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

Automated tests isolate credentials/database/media and send no real messages.
On two consenting test accounts: send several different messages while the other
phone is locked, verify one row per chat and no repeated copies, open the chat,
then send another message. Exercise reply, forward with an attachment, reaction
replacement/removal, edit, both delete scopes, and seen status. Check audio/video
calls in both directions, answer from another page, decline, timeout, hangup,
microphone/camera denial, and the same Wi-Fi versus two different mobile networks.
Real device media/FCM tests remain necessary; unit tests cannot prove them.

References: [FCM reception](https://firebase.google.com/docs/cloud-messaging/android/receive-messages),
[Android MessagingStyle](https://developer.android.com/reference/androidx/core/app/NotificationCompat.MessagingStyle).
