import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

// The SPA is served under /app/ behind API Gateway, which has no route for /favicon.ico at the domain root.
// The icon is embedded so the browser never requests it (no 404 in the console, no new public route).
describe('index.html', () => {
  it('declares an embedded SVG icon instead of relying on /favicon.ico', () => {
    const icon = html.match(/<link rel="icon" type="image\/svg\+xml" href="(data:image\/svg\+xml,[^"]+)"\/>/)
    expect(icon).not.toBeNull()
    expect(decodeURIComponent(icon![1].slice('data:image/svg+xml,'.length))).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
  })
})
