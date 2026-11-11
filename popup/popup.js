document.addEventListener('DOMContentLoaded', async () => {
  const toggleBlur = document.getElementById('toggleBlur')
  const btnOptions = document.getElementById('btnOptions')

  const res = await browser.runtime.sendMessage({ action: 'getSettings' })
  if (res) toggleBlur.checked = res.blurSettings.enabled

  toggleBlur.addEventListener('change', () => {
    browser.runtime.sendMessage({
      action: 'setBlurSettings',
      settings: { enabled: toggleBlur.checked }
    })
  })

  document.getElementById('btnPanic').addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (tab) await browser.tabs.sendMessage(tab.id, { action: 'togglePanic' }).catch(() => {})
    window.close()
  })

  btnOptions.addEventListener('click', () => {
    browser.runtime.openOptionsPage()
  })
})
