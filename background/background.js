const DEFAULT_SETTINGS = {
  security: {
    passwordHash: '',
    salt: '',
    isLocked: false,
    autoLockEnabled: true,
    autoLockTimeoutMinutes: 5,
    lockOnBackground: false,
    recovery: {
      googleLinked: false,
      recoveryAccountHash: '',
      linkedAt: ''
    }
  },
  blurSettings: {
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
    },
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
}

async function getStorage() {
  const data = await browser.storage.local.get(null)
  return { ...DEFAULT_SETTINGS, ...data }
}

async function setStorage(data) {
  await browser.storage.local.set(data)
}

function arrayBufferToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(message) {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hashBuffer)
}

async function hashPassword(password, salt) {
  return sha256(salt + password)
}

function generateSalt() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return arrayBufferToHex(arr)
}

async function ensurePasswordSet() {
  const storage = await getStorage()
  return !!storage.security.passwordHash
}

async function verifyPassword(password) {
  const storage = await getStorage()
  if (!storage.security.passwordHash) return false
  const hash = await hashPassword(password, storage.security.salt)
  return hash === storage.security.passwordHash
}

async function setNewPassword(password) {
  const salt = generateSalt()
  const hash = await hashPassword(password, salt)
  const storage = await getStorage()
  storage.security.passwordHash = hash
  storage.security.salt = salt
  await setStorage({ security: storage.security })
}

let idleTimerId = null

async function startIdleDetection() {
  const storage = await getStorage()
  if (!storage.security.autoLockEnabled) return

  const timeoutMinutes = storage.security.autoLockTimeoutMinutes
  browser.idle.setDetectionInterval(timeoutMinutes * 60)

  if (idleTimerId) browser.idle.onStateChanged.removeListener(onIdleStateChanged)
  browser.idle.onStateChanged.addListener(onIdleStateChanged)
}

function onIdleStateChanged(state) {
  if (state === 'idle' || state === 'locked') {
    lockAllTabs()
  }
}

async function lockAllTabs() {
  const storage = await getStorage()
  if (!storage.security.passwordHash) return

  storage.security.isLocked = true
  await setStorage({ security: storage.security })

  const tabs = await browser.tabs.query({
    url: ['*://web.whatsapp.com/*', '*://web.telegram.org/*']
  })
  for (const tab of tabs) {
    browser.tabs.sendMessage(tab.id, { action: 'lock' }).catch(() => {})
  }
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url) return

  const isWA = tab.url.startsWith('https://web.whatsapp.com/')
  const isTG = tab.url.startsWith('https://web.telegram.org/')
  if (!isWA && !isTG) return

  const storage = await getStorage()
  const settings = {
    blurSettings: storage.blurSettings,
    isLocked: storage.security.isLocked,
    hasPassword: !!storage.security.passwordHash
  }
  browser.tabs.sendMessage(tabId, { action: 'init', settings }).catch(() => {})
})

browser.tabs.onActivated.addListener(async (activeInfo) => {
  const storage = await getStorage()
  if (!storage.security.lockOnBackground) return
  if (!storage.security.passwordHash) return

  const tab = await browser.tabs.get(activeInfo.tabId)
  if (!tab.url) return

  const isWA = tab.url.startsWith('https://web.whatsapp.com/')
  const isTG = tab.url.startsWith('https://web.telegram.org/')
  if (!isWA && !isTG) return

  if (storage.security.isLocked) {
    browser.tabs.sendMessage(activeInfo.tabId, { action: 'lock' }).catch(() => {})
  }
})

async function handleGoogleAuth() {
  const redirectUrl = browser.identity.getRedirectURL()
  const clientId = 'cowl-extension-placeholder.apps.googleusercontent.com'
  const scope = 'openid email'
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `response_type=token&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `scope=${encodeURIComponent(scope)}`

  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    })

    const params = new URLSearchParams(new URL(responseUrl).hash.substring(1))
    const accessToken = params.get('access_token')
    if (!accessToken) return { success: false, error: 'no_token' }

    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const userData = await userResp.json()
    if (!userData.email) return { success: false, error: 'no_email' }

    const emailHash = await sha256(userData.email.toLowerCase().trim())

    const storage = await getStorage()
    storage.security.recovery = {
      googleLinked: true,
      recoveryAccountHash: emailHash,
      linkedAt: new Date().toISOString()
    }
    await setStorage({ security: storage.security })

    return { success: true, email: userData.email }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function verifyGoogleRecovery() {
  const redirectUrl = browser.identity.getRedirectURL()
  const clientId = 'cowl-extension-placeholder.apps.googleusercontent.com'
  const scope = 'openid email'
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `response_type=token&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `scope=${encodeURIComponent(scope)}`

  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    })

    const params = new URLSearchParams(new URL(responseUrl).hash.substring(1))
    const accessToken = params.get('access_token')
    if (!accessToken) return { verified: false }

    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const userData = await userResp.json()
    if (!userData.email) return { verified: false }

    const emailHash = await sha256(userData.email.toLowerCase().trim())
    const storage = await getStorage()

    if (emailHash === storage.security.recovery.recoveryAccountHash) {
      return { verified: true }
    }
    return { verified: false }
  } catch (err) {
    return { verified: false, error: err.message }
  }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  switch (msg.action) {
    case 'getSettings': {
      const storage = await getStorage()
      return {
        blurSettings: storage.blurSettings,
        isLocked: storage.security.isLocked,
        hasPassword: !!storage.security.passwordHash,
        autoLockEnabled: storage.security.autoLockEnabled,
        autoLockTimeoutMinutes: storage.security.autoLockTimeoutMinutes,
        lockOnBackground: storage.security.lockOnBackground,
        googleLinked: storage.security.recovery.googleLinked,
        linkedEmail: msg.includeEmail && storage.security.recovery.googleLinked
          ? '(connected)' : undefined
      }
    }

    case 'setBlurSettings': {
      const storage = await getStorage()
      storage.blurSettings = { ...storage.blurSettings, ...msg.settings }
      await setStorage({ blurSettings: storage.blurSettings })
      broadcastToTabs({ action: 'blurUpdate', settings: storage.blurSettings })
      return { success: true }
    }

    case 'setPassword': {
      const { currentPassword, newPassword } = msg
      if (await ensurePasswordSet()) {
        if (!(await verifyPassword(currentPassword))) {
          return { success: false, error: 'wrong_password' }
        }
      }
      await setNewPassword(newPassword)
      return { success: true }
    }

    case 'verifyPassword': {
      const valid = await verifyPassword(msg.password)
      return { success: valid }
    }

    case 'lock': {
      const storage = await getStorage()
      if (!storage.security.passwordHash) return { success: false, error: 'no_password' }
      await lockAllTabs()
      return { success: true }
    }

    case 'unlock': {
      const valid = await verifyPassword(msg.password)
      if (!valid) return { success: false, error: 'wrong_password' }

      const storage = await getStorage()
      storage.security.isLocked = false
      await setStorage({ security: storage.security })

      const tabs = await browser.tabs.query({
        url: ['*://web.whatsapp.com/*', '*://web.telegram.org/*']
      })
      for (const tab of tabs) {
        browser.tabs.sendMessage(tab.id, { action: 'unlock' }).catch(() => {})
      }
      return { success: true }
    }

    case 'connectGoogle': {
      return handleGoogleAuth()
    }

    case 'verifyGoogleRecovery': {
      return verifyGoogleRecovery()
    }

    case 'resetPasswordViaGoogle': {
      const verified = await verifyGoogleRecovery()
      if (!verified.verified) return { success: false, error: 'google_mismatch' }
      await setNewPassword(msg.newPassword)
      return { success: true }
    }

    case 'uninstallExtension': {
      const valid = await verifyPassword(msg.password)
      if (!valid) return { success: false, error: 'wrong_password' }
      try {
        await browser.management.uninstallSelf({ showConfirmDialog: true })
      } catch (e) {
        return { success: false, error: e.message }
      }
      return { success: true }
    }

    case 'getSecurityInfo': {
      const storage = await getStorage()
      return {
        hasPassword: !!storage.security.passwordHash,
        autoLockEnabled: storage.security.autoLockEnabled,
        autoLockTimeoutMinutes: storage.security.autoLockTimeoutMinutes,
        lockOnBackground: storage.security.lockOnBackground,
        googleLinked: storage.security.recovery.googleLinked,
        isLocked: storage.security.isLocked
      }
    }

    case 'updateSecurityConfig': {
      const storage = await getStorage()
      const s = storage.security
      if (msg.autoLockEnabled !== undefined) s.autoLockEnabled = msg.autoLockEnabled
      if (msg.autoLockTimeoutMinutes !== undefined) s.autoLockTimeoutMinutes = msg.autoLockTimeoutMinutes
      if (msg.lockOnBackground !== undefined) s.lockOnBackground = msg.lockOnBackground
      await setStorage({ security: s })

      if (s.autoLockEnabled) startIdleDetection()
      else browser.idle.onStateChanged.removeListener(onIdleStateChanged)

      return { success: true }
    }

    case 'clearAllData': {
      await browser.storage.local.clear()
      await browser.storage.local.set(DEFAULT_SETTINGS)
      return { success: true }
    }
  }
})

function broadcastToTabs(msg) {
  browser.tabs.query({
    url: ['*://web.whatsapp.com/*', '*://web.telegram.org/*']
  }).then(tabs => {
    for (const tab of tabs) {
      browser.tabs.sendMessage(tab.id, msg).catch(() => {})
    }
  }).catch(() => {})
}

browser.management.onUninstalled.addListener(async (extensionInfo) => {
  if (extensionInfo.id === browser.runtime.id) {
    try {
      await browser.storage.local.clear()
    } catch (e) {}
  }
})

async function init() {
  const storage = await getStorage()
  if (!storage.security.passwordHash && !storage.security.salt) {
    await setStorage(DEFAULT_SETTINGS)
  }
  if (storage.security.autoLockEnabled) {
    startIdleDetection()
  }
}

init()
