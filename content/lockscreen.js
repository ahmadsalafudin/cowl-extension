const lockscreen = {
  overlay: null,
  visible: false,

  show(hasPassword) {
    if (this.visible) return
    this.visible = true

    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }

    this.overlay = document.createElement('div')
    this.overlay.id = 'cowl-lockscreen-overlay'

    browser.runtime.sendMessage({ action: 'getSecurityInfo' })
      .then(info => this.render(!!(info && info.googleLinked)))
      .catch(() => this.render(false))
  },

  render(showRecovery) {
    const box = document.createElement('div')
    box.id = 'cowl-lockscreen-box'

    const h2 = document.createElement('h2')
    h2.textContent = 'Cowl Locked'
    box.appendChild(h2)

    const p = document.createElement('p')
    p.textContent = 'Enter your password to access this page'
    box.appendChild(p)

    const input = document.createElement('input')
    input.type = 'password'
    input.id = 'cowl-lockscreen-password'
    input.placeholder = 'Enter password'
    input.autofocus = true
    box.appendChild(input)

    const unlockBtn = document.createElement('button')
    unlockBtn.id = 'cowl-lockscreen-btn-unlock'
    unlockBtn.textContent = 'Unlock'
    box.appendChild(unlockBtn)

    const errorDiv = document.createElement('div')
    errorDiv.id = 'cowl-lockscreen-error'
    box.appendChild(errorDiv)

    if (showRecovery) {
      const resetBtn = document.createElement('button')
      resetBtn.id = 'cowl-lockscreen-btn-reset'
      resetBtn.textContent = 'Reset via Google'
      box.appendChild(resetBtn)

      resetBtn.addEventListener('click', () => this.handleReset(errorDiv))
    }

    this.overlay.appendChild(box)
    document.body.appendChild(this.overlay)

    const doUnlock = () => {
      const password = input.value
      if (!password) {
        errorDiv.textContent = 'Please enter a password'
        return
      }
      browser.runtime.sendMessage({ action: 'unlock', password }).then(res => {
        if (res && res.success) {
          this.hide()
        } else {
          errorDiv.textContent = 'Wrong password. Try again.'
          input.value = ''
          input.focus()
        }
      }).catch(() => {
        errorDiv.textContent = 'Connection error'
      })
    }

    unlockBtn.addEventListener('click', doUnlock)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doUnlock()
    })

    setTimeout(() => input.focus(), 100)
  },

  handleReset(errorDiv) {
    browser.runtime.sendMessage({ action: 'verifyGoogleRecovery' }).then(res => {
      if (res && res.verified) {
        const newPwd = prompt('Enter your new password:')
        if (!newPwd) return
        const confirmPwd = prompt('Confirm your new password:')
        if (newPwd !== confirmPwd) {
          alert('Passwords do not match.')
          return
        }
        browser.runtime.sendMessage({
          action: 'resetPasswordViaGoogle',
          newPassword: newPwd
        }).then(resetRes => {
          if (resetRes && resetRes.success) {
            errorDiv.textContent = 'Password reset! Enter your new password.'
            errorDiv.style.color = '#22c55e'
          } else {
            errorDiv.textContent = 'Reset failed. Try again.'
          }
        })
      } else {
        errorDiv.textContent = 'Google verification failed. Try again or use a different account.'
      }
    })
  },

  hide() {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    this.visible = false
  }
}
