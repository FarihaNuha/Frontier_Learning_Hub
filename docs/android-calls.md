# Android calls and Back navigation

These web/signalling fixes target the existing OTA-enabled 1.4.11 APK; no native
permissions, plugins or Android resources were changed.

The follow-up 1.4.12 APK also corrects incoming Android notification expiry.
The server sends a relative ringing lifetime for the web UI and its current
time alongside the push expiry. Native notification receipt derives a bounded
duration from those server timestamps, then uses elapsed realtime for the
notification, incoming activity and Answer action. It does not compare server
UTC against an incorrectly set device clock. FCM TTL and call-ended controls
bound delayed pushes; the backend still validates that an answered call exists.
Duplicate socket recovery events share one portal with Answer/Decline, and the
independent AuthContext incoming-call toast listener has been removed.

The web app owns one authenticated signalling connection per session. It asks
the server for pending calls after reconnecting or returning to the foreground.
Ringing sessions retain their 45-second expiry while a recipient's WebView is
asleep. Active calls tolerate a brief signalling disconnect; reconnecting replays
the answer and queued ICE candidates. Answering attaches local tracks to the
offered audio/video transceivers, including the video section used for sharing.

System Back closes the selected conversation before navigating out of Messages.
Changing the route clears conversation state and invalidates outstanding reads,
so a late network response cannot reopen the chat.

## Relay configuration

STUN alone cannot provide connectivity through every carrier NAT/firewall.
Configure an owned TURN relay on the backend. Existing `TURN_URLS` with
`TURN_SECRET` or `TURN_USERNAME`/`TURN_CREDENTIAL` remain supported.

The authenticated `/api/community/calls/config` endpoint issues HMAC TURN
credentials lasting 7,500 seconds, covering the two-hour call limit. The shared
TURN secret remains on the backend. The inspected Render service had no TURN
variables; it currently provides STUN only.

The user requested Render only and no paid service. No Cloudflare subscription
or key was created and no Cloudflare integration is included. Render web
services expose HTTP traffic through a public proxy, not the public TURN
listener and relay port ranges required by a TURN server. Code improvements
cannot guarantee connectivity through every carrier NAT/firewall without a
working relay. Do not claim that all Android 11+ phones/networks were verified.

## Device verification still required

On two signed-in 1.4.11 phones, allow notifications and microphone/camera when
requested. Check both call directions with the recipient in the foreground,
background and lock screen. Answer audio and video calls, confirm sound in both
directions, share/stop sharing, switch Wi-Fi/mobile data, and decline/end calls.
Repeat on Android 11, 12, 13 and newer vendor devices. Check notification channel
sound/pop-up settings, full-screen call permission (Android 14+) and vendor
battery restrictions when a banner is suppressed. Force-stopped apps cannot be
made to receive calls by a JavaScript update. A TURN credential response is not
proof of successful media relay: verify actual relay candidates and two-device
media after activation.
