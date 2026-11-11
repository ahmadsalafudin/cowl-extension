const SPEEDS = ['off', 'fast', 'normal', 'slow']
const REVEALS = ['hover', 'click', 'never']

const platformDefaults = () => ({
  enabled: true,
  sidebar: { blurName: true, blurProfile: true, blurMessage: true },
  content: { blurName: true, blurProfile: true, blurMessage: true, blurMedia: true, blurInput: false }
})

const DEFAULT_BLUR = {
  enabled: true,
  blurRadiusPx: 8,
  mediaRadiusPx: 16,
  reveal: 'hover',
  transition: 'normal',
  blurOnWindowBlur: false,
  blurOnIdle: true,
  idleSeconds: 60,
  whatsapp: platformDefaults(),
  telegram: platformDefaults()
}

// Keeps only keys that exist in base, and only values of the same type, so stored/patched junk is dropped.
function mergeKnown(base, patch) {
  const out = {}
  for (const key of Object.keys(base)) {
    const baseValue = base[key]
    const patchValue = patch ? patch[key] : undefined
    if (baseValue && typeof baseValue === 'object') out[key] = mergeKnown(baseValue, patchValue)
    else out[key] = typeof patchValue === typeof baseValue ? patchValue : baseValue
  }
  return out
}

const clamp = (n, min, max, fallback) => (Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback)

function sanitize(s) {
  s.blurRadiusPx = clamp(s.blurRadiusPx, 1, 30, DEFAULT_BLUR.blurRadiusPx)
  s.mediaRadiusPx = clamp(s.mediaRadiusPx, 1, 40, DEFAULT_BLUR.mediaRadiusPx)
  s.idleSeconds = clamp(s.idleSeconds, 10, 3600, DEFAULT_BLUR.idleSeconds)
  if (!REVEALS.includes(s.reveal)) s.reveal = DEFAULT_BLUR.reveal
  if (!SPEEDS.includes(s.transition)) s.transition = DEFAULT_BLUR.transition
  return s
}

async function getBlur() {
  const { blurSettings } = await browser.storage.local.get('blurSettings')
  return sanitize(mergeKnown(DEFAULT_BLUR, blurSettings))
}

// Patches are applied one at a time: sliders fire many updates and a read-modify-write overlap would drop one.
let writeChain = Promise.resolve()

function updateBlur(patch) {
  const run = async () => {
    const next = sanitize(mergeKnown(await getBlur(), patch))
    await browser.storage.local.set({ blurSettings: next })
    broadcast({ action: 'blurUpdate', settings: next })
    return next
  }
  const result = writeChain.then(run)
  writeChain = result.catch(() => {})
  return result
}

async function broadcast(msg) {
  const tabs = await browser.tabs.query({
    url: ['*://web.whatsapp.com/*', '*://web.telegram.org/*']
  })
  for (const tab of tabs) {
    browser.tabs.sendMessage(tab.id, msg).catch(() => {})
  }
}

browser.runtime.onMessage.addListener(async (msg) => {
  switch (msg.action) {
    case 'getSettings':
      return { blurSettings: await getBlur() }

    case 'setBlurSettings':
      return { success: true, settings: await updateBlur(msg.settings) }
  }
})

// Password / auto-lock were removed; drop any hash and salt left over from older versions.
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.remove('security')
})
