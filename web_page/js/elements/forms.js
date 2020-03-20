class LoginForm {
  constructor() {
    this.loginFormBG = document.body.createDiv("popup-message-background")
    this.loginFormBG.onclick = event => {
      if (event.target.className == "popup-message-background") this.hide()}

    let popupMess = this.loginFormBG.createDiv("popup-message")
    let loginForm = popupMess.createDiv("login-form")

    loginForm.createChildren("h2", "", "Log in to TON wallet")
    loginForm.createChildren("p", "", "upload the necessary files:")

    this.addressInput = new LoadFileButton(loginForm, "Address File (.addr)", ".addr");
    this.privKeyInput = new LoadFileButton(loginForm, "Private Key File (.pk)", ".pk");
    this.addressInput.oninput = this.onAddressInput.bind(this)
    this.privKeyInput.oninput = this.onPrivKeyInput.bind(this)

    this.loginButton = new DefaultButton(loginForm, "Login", true);
    this.loginButton.onclick = this.onLoginStart.bind(this)
  }

  onAddressInput(event) {
    let file = event.target.files[0];
    this.clearErrors()
    fileToBytes(file).then(result => {
      this.address64 = addresToBase64(result)
      this.addressInput.text = this.address64
      this.address64URL = this.address64
        .replaceAll("+", "-").replaceAll("/", "_")
      this.address = result
    })
    this.clearErrors()
  }
  onPrivKeyInput(event) {
    let file = event.target.files[0];
    this.clearErrors()
    fileToBytes(file).then(result => {
      this.privKeyInput.text = "*".repeat(32)
      this.keyPair = nacl.sign.keyPair.fromSeed(result)
    })
  }

  clear() {
    delete this.address64
    delete this.address64URL
    delete this.address
    delete this.keyPair

    this.addressInput.text = "Address File (.addr)", ".addr"
    this.privKeyInput.text = "Private Key File (.pk)", ".pk"
  }

  onLoginStart() {
    this.loginButton.loading = true
    this.login().then(result => {
      if (this.onlogin) this.onlogin(result)
      saveWallet(result)
      this.hide()
    }).catch(err => {
      this[(err[0] == "addr") ? "addressInput" : "privKeyInput"].errorText = err[1]
      if (!err[1]) console.error(err);
    }).finally(this.loginButton.loading = false)
  }

  clearErrors() {
    this.addressInput.errorText = ""
    this.privKeyInput.errorText = ""
  }

  async login() {
    // check input forms
    if (!this.address) throw ["addr", "wallet address is empty"]
    if (!this.keyPair) throw ["priv", "private key is empty"]

    let wallet = new Wallet(this.address, this.keyPair)
    return wallet.updateState()
  }

  show() {
    this.loginFormBG.setAttribute("active", true)
  }
  hide() {
    this.loginFormBG.removeAttribute("active")
  }

  getWalletVersion(code) {
    const code_hash = code.hashHex
    for (let version in WALLET_CODE_VERSIONS) {
      for (let hash of WALLET_CODE_VERSIONS[version]) {
        if (hash == code_hash) return version
      }
    }
  }
  getPublicKey(data, version) {
    let dataSlice = new Slice(data)
    dataSlice.readBytes((version == 3)? 8: 4)
    return dataSlice.readBytes(32)
  }
}

class PrizeShower {
  constructor() {
    this.prizeShowerBG = document.body.createDiv("popup-message-background")
    this.prizeShowerBG.onclick = event => {
      if (event.target.className == "popup-message-background") this.hide()}

    let popupMess = this.prizeShowerBG.createDiv("popup-message half-light")
    let prizeForm = popupMess.createDiv("prize-shower")
    prizeForm.setAttribute("winner", true)

    prizeForm.createChildren("h3", "", "You prize:")
    this.prizeSize = prizeForm.createChildren("h1", "", "12 GRM")

    this.closeButton = new DefaultButton(prizeForm, "Ok")
    this.closeButton.onclick = () => this.hide()
  }

  show(grams) {
    this.prizeSize.innerText = gramsToReadView(grams)
    this.prizeShowerBG.setAttribute("active", true)
  }
  hide() {
    this.prizeShowerBG.removeAttribute("active")
  }
}
