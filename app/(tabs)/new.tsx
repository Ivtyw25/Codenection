/**
 * Placeholder for the centre `+` slot.
 *
 * Never rendered. The tab bar needs a registered route to hang a button on, but
 * capture is a full-screen route outside the tab group — so the `tabPress`
 * listener in `(tabs)/_layout.tsx` calls `preventDefault()` and pushes
 * `/capture` instead. If you ever see this screen, that listener has come
 * unbound.
 */
export default function NewCapturePlaceholder() {
  return null;
}
