document.addEventListener('DOMContentLoaded', async () => {
  const els = {
    blurEnabled: document.getElementById('blurEnabled'),
    blurRadius: document.getElementById('blurRadius'),
    radiusValue: document.getElementById('radiusValue'),
    waSidebarBlurName: document.getElementById('waSidebarBlurName'),
    waSidebarBlurProfile: document.getElementById('waSidebarBlurProfile'),
    waSidebarBlurMessage: document.getElementById('waSidebarBlurMessage'),
    waContentBlurName: document.getElementById('waContentBlurName'),
    waContentBlurProfile: document.getElementById('waContentBlurProfile'),
    waContentBlurMessage: document.getElementById('waContentBlurMessage'),
    waContentBlurMedia: document.getElementById('waContentBlurMedia'),
    tgSidebarBlurName: document.getElementById('tgSidebarBlurName'),
    tgSidebarBlurProfile: document.getElementById('tgSidebarBlurProfile'),
    tgSidebarBlurMessage: document.getElementById('tgSidebarBlurMessage'),
    tgContentBlurName: document.getElementById('tgContentBlurName'),
    tgContentBlurProfile: document.getElementById('tgContentBlurProfile'),
    tgContentBlurMessage: document.getElementById('tgContentBlurMessage'),
    tgContentBlurMedia: document.getElementById('tgContentBlurMedia'),
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

    els.waSidebarBlurName.checked = bs.whatsapp.sidebar.blurName
    els.waSidebarBlurProfile.checked = bs.whatsapp.sidebar.blurProfile
    els.waSidebarBlurMessage.checked = bs.whatsapp.sidebar.blurMessage
    els.waContentBlurName.checked = bs.whatsapp.content.blurName
    els.waContentBlurProfile.checked = bs.whatsapp.content.blurProfile
    els.waContentBlurMessage.checked = bs.whatsapp.content.blurMessage
    els.waContentBlurMedia.checked = bs.whatsapp.content.blurMedia

    els.tgSidebarBlurName.checked = bs.telegram.sidebar.blurName
    els.tgSidebarBlurProfile.checked = bs.telegram.sidebar.blurProfile
    els.tgSidebarBlurMessage.checked = bs.telegram.sidebar.blurMessage
    els.tgContentBlurName.checked = bs.telegram.content.blurName
    els.tgContentBlurProfile.checked = bs.telegram.content.blurProfile
    els.tgContentBlurMessage.checked = bs.telegram.content.blurMessage
    els.tgContentBlurMedia.checked = bs.telegram.content.blurMedia

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
  }

  async function saveBlurSettings() {
    await browser.runtime.sendMessage({
      action: 'setBlurSettings',
      settings: {
        enabled: els.blurEnabled.checked,
        blurRadiusPx: parseInt(els.blurRadius.value),
        whatsapp: {
          sidebar: {
            blurName: els.waSidebarBlurName.checked,
            blurProfile: els.waSidebarBlurProfile.checked,
            blurMessage: els.waSidebarBlurMessage.checked
          },
          content: {
            blurName: els.waContentBlurName.checked,
            blurProfile: els.waContentBlurProfile.checked,
            blurMessage: els.waContentBlurMessage.checked,
            blurMedia: els.waContentBlurMedia.checked
          }
        },
        telegram: {
          sidebar: {
            blurName: els.tgSidebarBlurName.checked,
            blurProfile: els.tgSidebarBlurProfile.checked,
            blurMessage: els.tgSidebarBlurMessage.checked
          },
          content: {
            blurName: els.tgContentBlurName.checked,
            blurProfile: els.tgContentBlurProfile.checked,
            blurMessage: els.tgContentBlurMessage.checked,
            blurMedia: els.tgContentBlurMedia.checked
          }
        }
      }
    })
  }

  els.blurEnabled.addEventListener('change', saveBlurSettings)
  els.blurRadius.addEventListener('input', () => {
    els.radiusValue.textContent = els.blurRadius.value
  })
  els.blurRadius.addEventListener('change', saveBlurSettings)
  els.waSidebarBlurName.addEventListener('change', saveBlurSettings)
  els.waSidebarBlurProfile.addEventListener('change', saveBlurSettings)
  els.waSidebarBlurMessage.addEventListener('change', saveBlurSettings)
  els.waContentBlurName.addEventListener('change', saveBlurSettings)
  els.waContentBlurProfile.addEventListener('change', saveBlurSettings)
  els.waContentBlurMessage.addEventListener('change', saveBlurSettings)
  els.waContentBlurMedia.addEventListener('change', saveBlurSettings)
  els.tgSidebarBlurName.addEventListener('change', saveBlurSettings)
  els.tgSidebarBlurProfile.addEventListener('change', saveBlurSettings)
  els.tgSidebarBlurMessage.addEventListener('change', saveBlurSettings)
  els.tgContentBlurName.addEventListener('change', saveBlurSettings)
  els.tgContentBlurProfile.addEventListener('change', saveBlurSettings)
  els.tgContentBlurMessage.addEventListener('change', saveBlurSettings)
  els.tgContentBlurMedia.addEventListener('change', saveBlurSettings)

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
