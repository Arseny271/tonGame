class Application {
  constructor() {
    this.loginForm = new LoginForm()
    this.userWallet = loadWallet()
    this.isAuth = this.userWallet?true:false

    this.createHeader()
    this.updateWallet()
    this.updateHeader()

    this.loginForm.onlogin = (wallet) => {
      this.userWallet = wallet
      this.isAuth = true
      this.updateWallet()
      this.updateHeader()
      if (this.onlogin)
        this.onlogin(wallet)
    }
  }

  createHeader() {
    let header = document.getElementsByClassName("header-mini")[0]
    if (!header) return

    this.header = header.getElementsByClassName("container")[0]

    this.accountContainer = this.header.createDiv("account-container")

    let infoCont = this.accountContainer.createDiv("account-info")
    let buttons = this.accountContainer.createDiv("account-buttons")

    this.logoutButton = new MiniButton(buttons, "icon-logout")
    this.logoutButton.onclick = () => {
      this.loginForm.clear()
      this.userWallet = undefined
      sessionStorage.clear()
      this.isAuth = false
      this.updateHeader()
      if (this.onlogout)
        this.onlogout()
    }

    this.moreButton   = new MenuButton(buttons, "icon-more", [
      ["Show History", () => {
        location.href = `history.html?address=${this.userWallet.address64URL}`
      }]
    ])

    this.balanceElem = infoCont.createChildren("h3")
    this.courseElem = infoCont.createChildren("p", "", "1 GRM ~ 3.39 USD")

    this.loginButton = new DefaultButton(this.header, "Login")
    this.loginButton.onclick = () => {
      this.loginForm.show()
    }
  }
  updateHeader() {
    if (!this.header) return;
    if (this.isAuth) {
      this.loginButton.button.style.display = "none"
      this.accountContainer.style.display = null
    } else {
      this.loginButton.button.style.display = null
      this.accountContainer.style.display = "none"
    }
  }

  getUserWallet() {
    if (this.isAuth)
      return this.userWallet
    else
      this.loginForm.show()
  }

  async updateWallet() {
    if (!this.isAuth) return
    await this.userWallet.updateState()

    if (this.balanceElem) this.balanceElem.innerText =
      `Balance: ${gramsToReadView(this.userWallet.balance)}`
  }
}


const application = new Application()
