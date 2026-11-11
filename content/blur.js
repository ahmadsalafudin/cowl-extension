const PLATFORM = location.hostname === 'web.whatsapp.com' ? 'whatsapp' : 'telegram'
const APP = PLATFORM === 'whatsapp' ? 'wa' : 'tg'
const AREAS = { sidebar: 'sb', content: 'ct' }
const SPEED_MS = { off: 0, fast: 120, normal: 240, slow: 480 }
const PANIC_WINDOW_MS = 400
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']
const root = document.documentElement

let settings = null
let windowFocused = document.hasFocus()
let panic = false
let idle = false
let lastActivity = Date.now()
let idleTimer = null
let lastEscape = 0

function closeOpen() {
  document.querySelectorAll('[data-cowl-open]').forEach((el) => el.removeAttribute('data-cowl-open'))
}

// One page-wide cover (backdrop blur on <html>::after, see injected-blur.css). Panic works even with blur
// turned off in settings; idle and away follow the master/app switches.
function updateCover() {
  const app = settings && settings[PLATFORM]
  const active = !!app && settings.enabled && app.enabled
  let cover = ''
  if (panic) cover = 'panic'
  else if (active && settings.blurOnIdle && idle) cover = 'idle'
  else if (active && settings.blurOnWindowBlur && !windowFocused) cover = 'away'

  if (cover) {
    root.setAttribute('data-cowl-cover', cover)
    closeOpen()
  } else {
    root.removeAttribute('data-cowl-cover')
  }
}

// Mouse moves are far too frequent to re-arm a timer on; the timer re-checks lastActivity when it fires.
function armIdle(ms) {
  clearTimeout(idleTimer)
  if (!settings || !settings.blurOnIdle) return
  idleTimer = setTimeout(() => {
    const left = lastActivity + settings.idleSeconds * 1000 - Date.now()
    if (left > 0) {
      armIdle(left)
    } else {
      idle = true
      updateCover()
    }
  }, ms ?? settings.idleSeconds * 1000)
}

function onActivity() {
  lastActivity = Date.now()
  if (idle) {
    idle = false
    updateCover()
    armIdle()
  }
}

// Selectors live in assets/css/injected-blur.css; this only flips per-category variables, so a change
// is applied (and animated) by CSS without scanning the DOM.
function apply(next) {
  const revealChanged = settings && settings.reveal !== next.reveal
  settings = next
  const app = next[PLATFORM]
  const active = next.enabled && app.enabled

  for (const [area, short] of Object.entries(AREAS)) {
    for (const [flag, on] of Object.entries(app[area])) {
      const name = flag.slice(4).toLowerCase()
      const radius = name === 'media' ? '--cowl-rm' : '--cowl-r'
      root.style.setProperty(`--cowl-f-${APP}-${short}-${name}`, active && on ? `blur(var(${radius}))` : 'none')
    }
  }
  root.style.setProperty('--cowl-r', `${next.blurRadiusPx}px`)
  root.style.setProperty('--cowl-rm', `${next.mediaRadiusPx}px`)
  root.style.setProperty('--cowl-ms', `${SPEED_MS[next.transition]}ms`)
  root.setAttribute('data-cowl-reveal', next.reveal)
  if (revealChanged) closeOpen()

  if (!next.blurOnIdle) idle = false
  lastActivity = Date.now()
  armIdle()
  updateCover()
}

// Click mode: reveal the outermost row/bubble under the click. injected-blur.css marks those elements with
// container-name: cowl-reveal, so no selector is repeated here. One open at a time; a click elsewhere closes it.
function onClick(e) {
  if (!settings || settings.reveal !== 'click') return
  const marked = e.composedPath().filter(
    (el) => el instanceof Element && getComputedStyle(el).containerName.split(' ').includes('cowl-reveal')
  )
  const target = marked[marked.length - 1]
  const wasOpen = target && target.hasAttribute('data-cowl-open')
  closeOpen()
  if (target && !wasOpen && !root.hasAttribute('data-cowl-cover')) target.setAttribute('data-cowl-open', '')
}

function togglePanic() {
  panic = !panic
  updateCover()
}

window.addEventListener('blur', () => {
  windowFocused = false
  updateCover()
})
window.addEventListener('focus', () => {
  windowFocused = true
  updateCover()
})

for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { capture: true, passive: true })
window.addEventListener('click', onClick, true)

// Esc twice within PANIC_WINDOW_MS. The first Esc still reaches the page (WhatsApp/Telegram use it to close
// panels); only the second is swallowed. Handled here rather than via the commands API: no permission needed.
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Escape' || e.repeat || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return
    const now = Date.now()
    if (now - lastEscape <= PANIC_WINDOW_MS) {
      lastEscape = 0
      e.preventDefault()
      e.stopImmediatePropagation()
      togglePanic()
    } else {
      lastEscape = now
    }
  },
  true
)

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'blurUpdate') apply(msg.settings)
  else if (msg.action === 'togglePanic') togglePanic()
})

browser.runtime.sendMessage({ action: 'getSettings' })
  .then((res) => res && apply(res.blurSettings))
  .catch(() => {})
