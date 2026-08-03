let settings = {
  enabled: true,
  blurRadiusPx: 8,
  telegram: {
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
      '.chat-title, .dialog-title',
      '.peer-title, .user-title',
      'span[class*="title"]',
      '.ChatHeader .title'
    ],
    profile: [
      '.chat-avatar, .dialog-avatar',
      '.peer-avatar, .user-avatar',
      'img[class*="avatar"]',
      '.ChatHeader img'
    ],
    message: [
      '.bubble-content, .bubble',
      '.message, .Message',
      'div[class*="message"]:not([class*="input"]):not([class*="compose"])'
    ]
  },
  content: {
    name: [
      '.chat-title, .dialog-title',
      '.peer-title, .user-title',
      'span[class*="title"]',
      '.ChatHeader .title'
    ],
    profile: [
      '.chat-avatar, .dialog-avatar',
      '.peer-avatar, .user-avatar',
      'img[class*="avatar"]',
      '.ChatHeader img'
    ],
    message: [
      '.bubble-content, .bubble',
      '.message, .Message',
      'div[class*="message"]:not([class*="input"]):not([class*="compose"])'
    ],
    media: [
      '.photo, .video',
      '.media-photo, .media-video',
      'img[class*="photo"], img[class*="media"]',
      'canvas.thumbnail'
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

  if (settings.telegram.sidebar.blurName) {
    selectors.push(getSelectorString('sidebar', ['name']))
  }
  if (settings.telegram.sidebar.blurProfile) {
    selectors.push(getSelectorString('sidebar', ['profile']))
  }
  if (settings.telegram.sidebar.blurMessage) {
    selectors.push(getSelectorString('sidebar', ['message']))
  }
  if (settings.telegram.content.blurName) {
    selectors.push(getSelectorString('content', ['name']))
  }
  if (settings.telegram.content.blurProfile) {
    selectors.push(getSelectorString('content', ['profile']))
  }
  if (settings.telegram.content.blurMessage) {
    selectors.push(getSelectorString('content', ['message']))
  }
  if (settings.telegram.content.blurMedia) {
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