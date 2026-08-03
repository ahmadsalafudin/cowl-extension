let settings = {
  enabled: true,
  blurRadiusPx: 8,
  whatsapp: {
    sidebar: {
      blurName: true,
      blurProfile: true,
      blurMessage: true
    },
    content: {
      blurName: true,
      blurProfile: true,
      blurMessage: true,
      blurMedia: true
    }
  }
}

function applyBlurRadius(radius) {
  document.documentElement.style.setProperty('--cowl-blur-radius', radius + 'px')
}

const SELECTORS = {
  sidebar: {
    name: [
      'div[data-testid="cell-frame-title"]',
      'span[data-testid="contact-name"]',
      'div[data-testid="conversation-info-header"]'
    ],
    profile: [
      'div[data-testid="conversation-header"] img',
      'div[data-testid="avatar"]',
      'span[data-testid="conversation-header"]'
    ],
    message: [
      'div[data-testid="cell-frame-container"] div[role="row"]',
      'div[data-testid="msg-container"]'
    ]
  },
  content: {
    name: [
      'span[data-testid="conversation-header"]',
      'div[data-testid="conversation-info-header"]'
    ],
    profile: [
      'div[data-testid="conversation-header"] img',
      'div[data-testid="contact-avatar"]'
    ],
    message: [
      'div[data-testid="conversation-panel-messages"] div[role="row"]',
      'div.message-in, div.message-out',
      '[data-testid="msg-container"]'
    ],
    media: [
      'img[data-testid="image-thumb"]',
      'div[data-testid="media-preview"]',
      'video[data-testid="video-thumb"]',
      'canvas[data-testid="image-preview"]',
      'img[data-testid="contact-avatar"]'
    ]
  }
}

function getSelectorString(category, types) {
  return types.flatMap(t => SELECTORS[category][t] || []).join(', ')
}

function observeAndBlur() {
  if (!settings.enabled) return

  applyBlurRadius(settings.blurRadiusPx)

  const selectors = []

  if (settings.whatsapp.sidebar.blurName) {
    selectors.push(getSelectorString('sidebar', ['name']))
  }
  if (settings.whatsapp.sidebar.blurProfile) {
    selectors.push(getSelectorString('sidebar', ['profile']))
  }
  if (settings.whatsapp.sidebar.blurMessage) {
    selectors.push(getSelectorString('sidebar', ['message']))
  }
  if (settings.whatsapp.content.blurName) {
    selectors.push(getSelectorString('content', ['name']))
  }
  if (settings.whatsapp.content.blurProfile) {
    selectors.push(getSelectorString('content', ['profile']))
  }
  if (settings.whatsapp.content.blurMessage) {
    selectors.push(getSelectorString('content', ['message']))
  }
  if (settings.whatsapp.content.blurMedia) {
    selectors.push(getSelectorString('content', ['media']))
  }

  const combinedSelector = selectors.filter(s => s).join(', ')

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