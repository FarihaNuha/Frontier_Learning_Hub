// Render off-screen first: switching files while the parser is loading must
// never let the previous document overwrite the newly selected one.
export function renderWordPreview(blob, container, onError = console.error) {
  let cancelled = false;
  const staging = document.createElement("div");
  import("docx-preview")
    .then(docx => cancelled ? undefined : docx.renderAsync(blob, staging, null, {
      className: "docx-preview", inWrapper: true, ignoreWidth: false, ignoreHeight: false,
    }))
    .then(() => { if (!cancelled) container.replaceChildren(...staging.childNodes); })
    .catch(error => { if (!cancelled) onError(error); });
  return () => { cancelled = true; };
}
