document.addEventListener('DOMContentLoaded', async () => {
  const toggleBlur = document.getElementById('toggleBlur')
  const btnLock = document.getElementById('btnLock')
  const btnOptions = document.getElementById('btnOptions')
  const lockStatus = document.getElementById('lockStatus')

  const res = await browser.runtime.sendMessage({ action: 'getSettings' })
  if (res) {
    toggleBlur.checked = res.blurSettings.enabled
    lockStatus.textContent = res.isLocked ? '🔒 Locked' : '🔓 Unlocked'
  }

  toggleBlur.addEventListener('change', async () => {
    await browser.runtime.sendMessage({
      action: 'setBlurSettings',
      settings: { enabled: toggleBlur.checked }
    })
  })

  btnLock.addEventListener('click', async () => {
    const res = await browser.runtime.sendMessage({ action: 'lock' })
    if (res && res.success) {
      lockStatus.textContent = '🔒 Locked'
    } else if (res && res.error === 'no_password') {
      lockStatus.textContent = '⚠️ Set password in Settings first'
    }
  })

  btnOptions.addEventListener('click', () => {
    browser.runtime.openOptionsPage()
  })
})
