# UniCore Android live updates

Install the OTA-enabled APK once. Compatible JavaScript, CSS and web assets can
then be delivered through the signed GitHub Releases channel. Updates download
after startup; a kill delay prevents an ordinary trip to the background from
interrupting a call, exam or unfinished form. Fully close and reopen the app to
activate a staged bundle. Settings → App Updates also offers a manual check.

The native updater rolls back a bundle that fails to initialize and confirm
readiness within 15 seconds. Readiness does not depend on API responses. It is
not a guarantee against application logic errors occurring later in a session.

`scripts/ota-runtime.cjs` fingerprints native Java, resources, Android build
configuration and installed Capacitor plugin versions. Native changes produce a
different feed; old APKs do not receive incompatible bundles. Native plugins,
permissions, launcher icons and native splash changes require another APK.

Every envelope uses ECDSA P-256/SHA-256 with a public key shipped in the APK.
The signed payload binds the runtime, app ID, sequence, download URL, size and
SHA-256 digest. The native updater checks the downloaded ZIP checksum. Failed
versions are not staged again; newer signed sequences are required to recover.

The optional Actions publisher needs the repository secret `UNICORE_OTA_SIGNING_KEY`.
Its private PEM backup is in ignored `.system_generated/ota/signing-key.pem` on
the development machine. Keep a secure backup; never commit or publish it.
Only the public JWK is committed. Rotating trust keys requires a new APK.

`live-update.yml` publishes compatible UI changes pushed to `main` after tests
and the production build pass. It also supports manual workflow dispatch.
The repository signing secret was configured with explicit owner approval.
The local publishing command also works without transferring the private key.
Local publication after a production web build:

```powershell
# Provide GH_TOKEN securely through the existing GitHub credential flow.
node scripts/publish-live-update.cjs
```

Release tags `ota-<runtime>-<sequence>` are immutable bundle archives. The
`live-updates` release holds one signed JSON channel asset per native runtime.
No Capgo account, subscription or device telemetry endpoint is configured.
To roll back a functional but unwanted UI, revert only the reviewed UI files on
the current native runtime and publish a new sequence. Do not edit or reuse an
old bundle ZIP.
