import type { ReactNode } from "react";

/**
 * Bare layout for headless Puppeteer rendering.
 * The root layout already provides fonts, CSS, and <html>/<body>.
 * This just strips the app chrome (sidebar, topbar, footer) by NOT
 * importing the (routes) layout, and skips AuthProvider wrapping.
 */
export default function RenderLayout({ children }: { children: ReactNode }) {
  return <div style={{ margin: 0, padding: 0 }}>{children}</div>;
}
