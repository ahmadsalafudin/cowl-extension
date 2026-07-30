document.addEventListener('DOMContentLoaded', async () => {
  const els = {
    blurEnabled: document.getElementById('blurEnabled'),
    blurRadius: document.getElementById('blurRadius'),
    radiusValue: document.getElementById('radiusValue'),
    waBlurMessages: document.getElementById('waBlurMessages'),
    waBlurNames: document.getElementById('waBlurNames'),
    waBlurMedia: document.getElementById('waBlurMedia'),
    waBlurInput: document.getElementById('waBlurInput'),
    tgBlurMessages: document.getElementById('tgBlurMessages'),
    tgBlurNames: document.getElementById('tgBlurNames'),
    tgBlurMedia: document.getElementById('tgBlurMedia'),
    tgBlurInput: document.getElementById('tgBlurInput'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    btnSetPassword: document.getElementById('btnSetPassword'),
    passwordError: document.getElementById('passwordError'),
    passwordSuccess: document.getElementById('passwordSuccess'),
    noPasswordMsg: document.getElementById('noPasswordMsg'),
    autoLockEnabled: document.getElementById('autoLockEnabled'),
    autoLockTimeout: document.getElementById('autoLockTimeout'),
    timeoutValue: document.getElementById('timeoutValue'),
    lockOnBackground: document.getElementById('lockOnBackground'),
    googleStatus: document.getElementById('googleStatus'),
    btnConnectGoogle: document.getElementById('btnConnectGoogle'),
    googleError: document.getElementById('googleError'),
    btnUninstall: document.getElementById('btnUninstall'),
    lockIndicator: document.getElementById('lockIndicator')
  }

  function showError(el, msg) {
    el.textContent = msg
    el.classList.remove('hidden')
    setTimeout(() => el.classList.add('hidden'), 4000)
  }

  function showSuccess(msg) {
    els.passwordSuccess.textContent = msg
    els.passwordSuccess.classList.remove('hidden')
    setTimeout(() => els.passwordSuccess.classList.add('hidden'), 3000)
  }

  async function loadSettings() {
    const res = await browser.runtime.sendMessage({ action: 'getSettings' })
    if (!res) return

    const bs = res.blurSettings
    els.blurEnabled.checked = bs.enabled
    els.blurRadius.value = bs.blurRadiusPx
    els.radiusValue.textContent = bs.blurRadiusPx

    els.waBlurMessages.checked = bs.whatsapp.blurMessages
    els.waBlurNames.checked = bs.whatsapp.blurNames
    els.waBlurMedia.checked = bs.whatsapp.blurMedia
    els.waBlurInput.checked = bs.whatsapp.blurInput

    els.tgBlurMessages.checked = bs.telegram.blurMessages
    els.tgBlurNames.checked = bs.telegram.blurNames
    els.tgBlurMedia.checked = bs.telegram.blurMedia
    els.tgBlurInput.checked = bs.telegram.blurInput

    els.autoLockEnabled.checked = res.autoLockEnabled
    els.autoLockTimeout.value = res.autoLockTimeoutMinutes
    els.timeoutValue.textContent = res.autoLockTimeoutMinutes
    els.lockOnBackground.checked = res.lockOnBackground

    els.lockIndicator.textContent = res.isLocked ? '🔒 Locked' : '🔓 Unlocked'

    if (res.hasPassword) {
      els.noPasswordMsg.classList.add('hidden')
      els.currentPassword.classList.remove('hidden')
      els.btnSetPassword.textContent = 'Change Password'
    } else {
      els.noPasswordMsg.classList.remove('hidden')
      els.currentPassword.classList.add('hidden')
      els.btnSetPassword.textContent = 'Set Password'
    }

    if (res.googleLinked) {
      els.googleStatus.textContent = '✅ Google account connected (for recovery)'
      els.btnConnectGoogle.textContent = 'Reconnect Google Account'
    } else {
      els.googleStatus.textContent = '❌ Not connected'
      els.btnConnectGoogle.textContent = 'Connect Google Account'
    }
  }

  async function saveBlurSettings() {
    await browser.runtime.sendMessage({
      action: 'setBlurSettings',
      settings: {
        enabled: els.blurEnabled.checked,
        blurRadiusPx: parseInt(els.blurRadius.value),
        whatsapp: {
          blurMessages: els.waBlurMessages.checked,
          blurNames: els.waBlurNames.checked,
          blurMedia: els.waBlurMedia.checked,
          blurInput: els.waBlurInput.checked
        },
        telegram: {
          blurMessages: els.tgBlurMessages.checked,
          blurNames: els.tgBlurNames.checked,
          blurMedia: els.tgBlurMedia.checked,
          blurInput: els.tgBlurInput.checked
        }
      }
    })
  }

  els.blurEnabled.addEventListener('change', saveBlurSettings)
  els.blurRadius.addEventListener('input', () => {
    els.radiusValue.textContent = els.blurRadius.value
  })
  els.blurRadius.addEventListener('change', saveBlurSettings)
  els.waBlurMessages.addEventListener('change', saveBlurSettings)
  els.waBlurNames.addEventListener('change', saveBlurSettings)
  els.waBlurMedia.addEventListener('change', saveBlurSettings)
  els.waBlurInput.addEventListener('change', saveBlurSettings)
  els.tgBlurMessages.addEventListener('change', saveBlurSettings)
  els.tgBlurNames.addEventListener('change', saveBlurSettings)
  els.tgBlurMedia.addEventListener('change', saveBlurSettings)
  els.tgBlurInput.addEventListener('change', saveBlurSettings)

  els.btnSetPassword.addEventListener('click', async () => {
    const newPwd = els.newPassword.value
    const confirmPwd = els.confirmPassword.value

    if (!newPwd || newPwd.length < 4) {
      showError(els.passwordError, 'Password must be at least 4 characters')
      return
    }
    if (newPwd !== confirmPwd) {
      showError(els.passwordError, 'Passwords do not match')
      return
    }

    const hasCurrent = !els.currentPassword.classList.contains('hidden')
    const res = await browser.runtime.sendMessage({
      action: 'setPassword',
      currentPassword: hasCurrent ? els.currentPassword.value : '',
      newPassword: newPwd
    })

    if (res && res.success) {
      showSuccess('Password updated successfully')
      els.newPassword.value = ''
      els.confirmPassword.value = ''
      els.currentPassword.value = ''
      loadSettings()
    } else if (res && res.error === 'wrong_password') {
      showError(els.passwordError, 'Current password is incorrect')
    } else {
      showError(els.passwordError, 'Failed to set password')
    }
  })

  els.autoLockEnabled.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'updateSecurityConfig',
      autoLockEnabled: els.autoLockEnabled.checked
    })
  })

  els.autoLockTimeout.addEventListener('input', () => {
    els.timeoutValue.textContent = els.autoLockTimeout.value
  })
  els.autoLockTimeout.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'updateSecurityConfig',
      autoLockTimeoutMinutes: parseInt(els.autoLockTimeout.value)
    })
  })

  els.lockOnBackground.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'updateSecurityConfig',
      lockOnBackground: els.lockOnBackground.checked
    })
  })

  els.btnConnectGoogle.addEventListener('click', async () => {
    els.btnConnectGoogle.disabled = true
    els.btnConnectGoogle.textContent = 'Connecting...'
    const res = await browser.runtime.sendMessage({ action: 'connectGoogle' })
    els.btnConnectGoogle.disabled = false
    if (res && res.success) {
      els.googleStatus.textContent = '✅ Google account connected (for recovery)'
      els.btnConnectGoogle.textContent = 'Reconnect Google Account'
    } else {
      showError(els.googleError, 'Failed to connect: ' + (res?.error || 'unknown'))
      els.btnConnectGoogle.textContent = 'Connect Google Account'
    }
  })

  els.btnUninstall.addEventListener('click', async () => {
    const password = prompt('Enter your password to confirm uninstallation:')
    if (!password) return

    const res = await browser.runtime.sendMessage({
      action: 'uninstallExtension',
      password
    })
    if (res && !res.success && res.error === 'wrong_password') {
      alert('Wrong password. Uninstall cancelled.')
    }
  })

  await loadSettings()
})
