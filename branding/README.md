# UniCore brand assets

`unicore-logo.png` is the original logo supplied by the project owner.
Run `powershell -ExecutionPolicy Bypass -File scripts/update-brand-icons.ps1 -LogoPath branding/unicore-logo.png`
to regenerate launcher icons, the color notification logo, and web manifest icons.
The generator resizes the original artwork without changing its design.

Android notifications use the simplified cap/U/book vector `ic_stat_unicore`
for the monochrome status bar and themed launcher icon. Native message, general,
incoming-call, and screen-sharing notifications also supply the color logo.
Android controls its final placement, tint, and visibility.

Launcher and notification drawable resources are packaged inside the APK.
An installed 1.2.0 APK cannot receive these resources through a backend or web
deployment. Install 1.2.1 to receive them. Updating in place requires the same
application ID and signing certificate; debug certificates from different
GitHub runners/local builds are not guaranteed to match. This branding change
does not add an OTA updater or a persistent release signing key.
