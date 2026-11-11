document.addEventListener('DOMContentLoaded', async () => {
  const PLATFORMS = [['whatsapp', 'WhatsApp'], ['telegram', 'Telegram']]
  const SPEED_MS = { off: 0, fast: 120, normal: 240, slow: 480 }
  const REVEAL_HINTS = {
    hover: 'Hover a chat row, message or header to read it.',
    click: 'Click a chat row, message or header to read it. Click again to hide it.',
    never: 'Nothing is ever revealed. Use the settings to read a chat.'
  }

  const forBoth = (sidebar, content) => ({ whatsapp: { sidebar, content }, telegram: { sidebar, content } })
  const area = (name, profile, message, media, input) => ({
    sidebar: { blurName: name, blurProfile: profile, blurMessage: message },
    content: { blurName: name, blurProfile: profile, blurMessage: message, blurMedia: media, blurInput: input }
  })
  const preset = (global, a) => ({ ...global, ...forBoth(a.sidebar, a.content) })
  // Presets leave the per-app on/off switches alone and set everything else.
  const PRESETS = {
    light: preset(
      { blurRadiusPx: 5, mediaRadiusPx: 10, reveal: 'hover', transition: 'fast', blurOnWindowBlur: false, blurOnIdle: false, idleSeconds: 60 },
      area(false, false, true, true, false)
    ),
    normal: preset(
      { blurRadiusPx: 8, mediaRadiusPx: 16, reveal: 'hover', transition: 'normal', blurOnWindowBlur: false, blurOnIdle: true, idleSeconds: 60 },
      area(true, true, true, true, false)
    ),
    paranoid: preset(
      { blurRadiusPx: 16, mediaRadiusPx: 30, reveal: 'click', transition: 'normal', blurOnWindowBlur: true, blurOnIdle: true, idleSeconds: 30 },
      area(true, true, true, true, true)
    )
  }

  const platformsEl = document.getElementById('platforms')
  const template = document.getElementById('platformTpl')
  const blurOptions = document.getElementById('blurOptions')
  const preview = document.getElementById('preview')
  const previewHint = document.getElementById('previewHint')
  const revealHint = document.getElementById('revealHint')
  const presetHint = document.getElementById('presetHint')
  const backupStatus = document.getElementById('backupStatus')
  const importFile = document.getElementById('importFile')

  document.getElementById('version').textContent = browser.runtime.getManifest().version

  for (const [key, label] of PLATFORMS) {
    const card = template.content.cloneNode(true)
    card.querySelector('.platform-name').textContent = label
    card.querySelector('.platform').dataset.platform = key
    card.querySelectorAll('[data-rel]').forEach((el) => {
      el.dataset.path = `${key}.${el.dataset.rel}`
    })
    platformsEl.appendChild(card)
  }

  let settings = null
  let pending = {}
  let timer = null
  let inFlight = 0

  const getPath = (obj, path) => path.split('.').reduce((o, k) => o[k], obj)

  function setPath(obj, path, value) {
    const keys = path.split('.')
    const last = keys.pop()
    keys.reduce((o, k) => (o[k] ??= {}), obj)[last] = value
  }

  function leaves(obj, prefix = '') {
    return Object.entries(obj).flatMap(([key, value]) =>
      value && typeof value === 'object' ? leaves(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
    )
  }

  const matchesPreset = (name) => leaves(PRESETS[name]).every(([path, value]) => getPath(settings, path) === value)

  function render() {
    document.querySelectorAll('[data-path]').forEach((el) => {
      const value = getPath(settings, el.dataset.path)
      if (el.dataset.value !== undefined) {
        el.setAttribute('aria-pressed', String(String(value) === el.dataset.value))
      } else if (el.type === 'checkbox') {
        el.checked = value
      } else if (el !== document.activeElement) {
        el.value = value
      }
    })
    document.querySelectorAll('[data-out]').forEach((el) => {
      el.textContent = getPath(settings, el.dataset.out)
    })

    const activePreset = Object.keys(PRESETS).find(matchesPreset)
    document.querySelectorAll('[data-preset]').forEach((el) => {
      el.setAttribute('aria-pressed', String(el.dataset.preset === activePreset))
    })
    presetHint.textContent = activePreset ? '' : 'Custom settings.'
    revealHint.textContent = REVEAL_HINTS[settings.reveal]

    blurOptions.classList.toggle('is-off', !settings.enabled)
    document.querySelectorAll('.platform').forEach((card) => {
      const on = settings.enabled && settings[card.dataset.platform].enabled
      card.querySelector('.dim-group').classList.toggle('is-off', !on)
    })

    preview.style.setProperty('--r', `${settings.blurRadiusPx}px`)
    preview.style.setProperty('--rm', `${settings.mediaRadiusPx}px`)
    preview.style.setProperty('--ms', `${SPEED_MS[settings.transition]}ms`)
    preview.dataset.reveal = settings.reveal
    preview.toggleAttribute('data-off', !settings.enabled)
    previewHint.textContent = !settings.enabled
      ? 'Blur is off.'
      : { hover: 'Hover the preview to reveal it.', click: 'Click the preview to reveal it.', never: 'Reveal is off, content stays blurred.' }[settings.reveal]
  }

  async function send(patch) {
    inFlight++
    try {
      return await browser.runtime.sendMessage({ action: 'setBlurSettings', settings: patch })
    } finally {
      inFlight--
    }
  }

  async function flush() {
    clearTimeout(timer)
    timer = null
    if (!Object.keys(pending).length) return

    const patch = pending
    pending = {}
    const res = await send(patch)
    // Take the stored (clamped) values back only once nothing newer is waiting, or the UI would jump backwards.
    if (res && res.settings && !inFlight && !timer && !Object.keys(pending).length) {
      settings = res.settings
      render()
    }
  }

  // The page updates first and storage follows, so controls feel instant; sliders are throttled to ~16 writes/s.
  function commit(el, value, immediate) {
    const path = el.dataset.path
    if (!path) return
    setPath(settings, path, value)
    setPath(pending, path, value)
    render()
    if (immediate) flush()
    else timer ??= setTimeout(flush, 60)
  }

  function applyPreset(name) {
    for (const [path, value] of leaves(PRESETS[name])) {
      setPath(settings, path, value)
      setPath(pending, path, value)
    }
    render()
    flush()
  }

  function setBackupStatus(text, isError) {
    backupStatus.textContent = text
    backupStatus.classList.toggle('is-error', !!isError)
  }

  function exportSettings() {
    const data = { app: 'cowl', version: 1, blurSettings: settings }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'cowl-settings.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setBackupStatus('Exported to cowl-settings.json.')
  }

  // The file is untrusted: the background keeps only known keys of the right type and clamps the numbers.
  async function importSettings(file) {
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      return setBackupStatus('That file is not valid JSON.', true)
    }
    const incoming = data && typeof data === 'object' && data.blurSettings ? data.blurSettings : data
    if (!incoming || typeof incoming !== 'object' || !Object.keys(incoming).some((key) => key in settings)) {
      return setBackupStatus('That file is not a Cowl settings export.', true)
    }
    await flush()
    const res = await send(incoming)
    if (res && res.settings) {
      settings = res.settings
      render()
      setBackupStatus('Settings imported.')
    }
  }

  async function load() {
    const res = await browser.runtime.sendMessage({ action: 'getSettings' })
    if (!res) return
    settings = res.blurSettings
    render()
  }

  document.addEventListener('input', (e) => {
    if (e.target.type === 'range') commit(e.target, Number(e.target.value), false)
  })

  document.addEventListener('change', (e) => {
    if (e.target === importFile) {
      if (importFile.files[0]) importSettings(importFile.files[0])
      importFile.value = ''
    } else if (e.target.type === 'checkbox') commit(e.target, e.target.checked, true)
    else if (e.target.type === 'range') flush()
  })

  document.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-value]')
    if (button) {
      commit(button, button.dataset.num !== undefined ? Number(button.dataset.value) : button.dataset.value, true)
      return
    }
    const presetButton = e.target.closest('button[data-preset]')
    if (presetButton) {
      applyPreset(presetButton.dataset.preset)
      return
    }
    if (e.target.closest('#btnExport')) exportSettings()
    else if (e.target.closest('#btnImport')) importFile.click()

    const row = e.target.closest('.preview-row')
    if (row && settings.reveal === 'click') row.toggleAttribute('data-open')
  })

  // Keeps this page in sync when the popup (or another settings tab) changes something.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blurSettings && !inFlight && !timer) load()
  })

  await load()
})
