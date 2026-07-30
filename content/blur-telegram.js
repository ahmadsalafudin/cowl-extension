let settings = {
  enabled: true,
  blurRadiusPx: 8,
  telegram: {
    blurMessages: true,
    blurNames: true,
    blurMedia: true,
    blurInput: false
  }
}

function applyBlurRadius(radius) {
  document.documentElement.style.setProperty('--cowl-blur-radius', radius + 'px')
}

const SELECTORS = {
  messages: [
    '.bubble-content, .bubble',
    '.message, .Message',
    'div[class*="message"]:not([class*="input"]):not([class*="compose"])'
  ],
  names: [
    '.chat-title, .dialog-title',
    '.peer-title, .user-title',
    'span[class*="title"]',
    '.ChatHeader .title'
  ],
  media: [
    '.photo, .video',
    '.media-photo, .media-video',
    'img[class*="photo"], img[class*="media"]',
    'canvas.thumbnail'
  ],
  input: [
    '.input-message-container',
    'div[contenteditable="true"]',
    '.compose-area'
  ]
}

function getSelectorString(types) {
  return types.flatMap(t => SELECTORS[t] || []).join(', ')
}

function observeAndBlur() {
  if (!settings.enabled) return

  applyBlurRadius(settings.blurRadiusPx)

  const messageSelector = settings.telegram.blurMessages ? getSelectorString(['messages']) : ''
  const nameSelector = settings.telegram.blurNames ? getSelectorString(['names']) : ''
  const mediaSelector = settings.telegram.blurMedia ? getSelectorString(['media']) : ''
  const inputSelector = settings.telegram.blurInput ? getSelectorString(['input']) : ''

  const combinedSelector = [messageSelector, nameSelector, mediaSelector, inputSelector]
    .filter(s => s).join(', ')

  if (!combinedSelector) {
    clearBlur()
    return
  }

  const elements = document.querySelectorAll(combinedSelector)
  elements.forEach(el => {
    el.setAttribute('data-cowl-blur', '')
  })

  if (observer) observer.disconnect()
  observer = new MutationObserver((mutations) => {
    const targets = []
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(combinedSelector)) {
            targets.push(node)
          }
          if (node.querySelectorAll) {
            const found = node.querySelectorAll(combinedSelector)
            targets.push(...found)
          }
        }
      }
    }
    targets.forEach(el => el.setAttribute('data-cowl-blur', ''))
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function clearBlur() {
  document.querySelectorAll('[data-cowl-blur]').forEach(el => {
    el.removeAttribute('data-cowl-blur')
  })
  if (observer) observer.disconnect()
}

let observer = null

browser.runtime.onMessage.addListener((msg) => {
  switch (msg.action) {
    case 'init':
      if (msg.settings) {
        settings = msg.settings.blurSettings || settings
        if (msg.settings.isLocked) lockscreen.show(msg.settings.hasPassword)
      }
      if (document.body) observeAndBlur()
      else document.addEventListener('DOMContentLoaded', observeAndBlur)
      break

    case 'blurUpdate':
      settings = msg.settings || settings
      observeAndBlur()
      break

    case 'lock':
      lockscreen.show(true)
      break

    case 'unlock':
      lockscreen.hide()
      break

    case 'showLockScreen':
      lockscreen.show(msg.hasPassword)
      break
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    browser.runtime.sendMessage({ action: 'getSettings' }).then(res => {
      if (res) {
        settings = res.blurSettings || settings
        if (res.isLocked) lockscreen.show(res.hasPassword)
        observeAndBlur()
      }
    }).catch(() => {})
  })
} else {
  browser.runtime.sendMessage({ action: 'getSettings' }).then(res => {
    if (res) {
      settings = res.blurSettings || settings
      if (res.isLocked) lockscreen.show(res.hasPassword)
      observeAndBlur()
    }
  }).catch(() => {})
}
