let settings = {
  enabled: true,
  blurRadiusPx: 8,
  whatsapp: {
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
    'div[data-testid="conversation-panel-messages"] div[role="row"]',
    'div.message-in, div.message-out',
    '[data-testid="msg-container"]'
  ],
  names: [
    'span[data-testid="conversation-header"]',
    'span[data-testid="contact-name"]',
    'div[data-testid="cell-frame-title"]',
    'div[data-testid="conversation-info-header"]'
  ],
  media: [
    'img[data-testid="image-thumb"]',
    'div[data-testid="media-preview"]',
    'video[data-testid="video-thumb"]',
    'canvas[data-testid="image-preview"]',
    'img[data-testid="contact-avatar"]'
  ],
  input: [
    'div[data-testid="conversation-compose-box-input"]',
    'div[title="Type a message"]'
  ]
}

function getSelectorString(types) {
  return types.flatMap(t => SELECTORS[t] || []).join(', ')
}

function observeAndBlur() {
  if (!settings.enabled) return

  applyBlurRadius(settings.blurRadiusPx)

  const messageSelector = settings.whatsapp.blurMessages ? getSelectorString(['messages']) : ''
  const nameSelector = settings.whatsapp.blurNames ? getSelectorString(['names']) : ''
  const mediaSelector = settings.whatsapp.blurMedia ? getSelectorString(['media']) : ''
  const inputSelector = settings.whatsapp.blurInput ? getSelectorString(['input']) : ''

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
