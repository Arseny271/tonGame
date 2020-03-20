class SquaresContainer extends Roulette {
  constructor(elem, address) {
    super(address)

    this.createSquares(elem)
    this.playerAddress = null
    this.playerWallet = null
    this.hasBoughtMe = false
  }

  createSquares(elem) {
    this.squaresElems = []
    for (let i = 0; i < 8; i++) {
      let row = elem.createDiv("squares-row")
      for (let j = 0; j < 8; j++) {
        let square = row.createDiv("square")
        this.squaresElems.push(square)
      }
    }
  }

  async updateStateCont() {
    await this.updateState()
    this.updateSquareStatus()
  }

  updateSquareStatus() {
    if (this.status == GAME_NOT_STARTED) {
      this.clearSquareStatus()
      return
    }

    this.hasBoughtMe = false
    for (let player in this.players) {
      let isSelf = (player == this.playerAddress)
      for (let square of this.players[player]) {
        this.squaresElems[square]
          .setAttribute("status", isSelf ? "buyed" : "buyed_other")

        if (isSelf) this.hasBoughtMe = true
      }
    }
    if (this.onupdateSqr) this.onupdateSqr(this)
  }
  clearSquareStatus() {
    this.hasBoughtMe = false
    for (let i = 0; i < 64; i++) {
      this.squaresElems[i].removeAttribute("status")
      this.squaresElems[i].removeAttribute("loading")
      this.squaresElems[i].removeAttribute("winner")
    }
    if (this.onupdateSqr) this.onupdateSqr(this)
  }

  setPlayerWallet(wallet) {
    this.playerAddress = (wallet)?wallet.address64:undefined
    this.playerWallet = wallet
    this.updateSquareStatus()
  }
}

class GamePreviewer extends SquaresContainer {
  constructor(elem, address) {
    let mainContainer = elem.createDiv("game-preview")
    let gamePreview = mainContainer.createDiv("game-view")
    super(gamePreview, address)

    gamePreview.onclick = () => {
      location.href = `main.html?address=${address.replaceAll("+", "-").replaceAll("/", "_")}`}

    mainContainer.createChildren("h3", "", `Game #${address.slice(0, 4)}..${address.slice(-4)}`)

    this.prevCont = mainContainer
    this.gameCont = gamePreview
    this.timeElem = gamePreview.createChildren("t")
    this.labelElem = mainContainer.createChildren("p", "", "...")
    this.updatePreviewer()

  }

  async updatePreviewer() {
    await this.updateStateCont()

    switch (this.status) {
      case GAME_NOT_STARTED:
        this.label = "Game not started"
        this.clearTimer()
        break;
      case GAME_FINISHED:
        this.label = "Game finished"
        this.clearTimer()
        break;
      case GAME_ACTIVE:
        this.label = `Price: ${gramsToReadView(this.squarePrice)}`
        this.setTimer(this.endGameTime)
        break;
    }
  }

  setTimer(endTime) {
    let time = Math.floor(Date.now() / 1000)
    this.timeLeft = endTime - time
    this.time = this.timeLeft
    this.timer = setInterval(() => {this.time = this.timeLeft--}, 1000)
    this.timeElem.style.display = null
  }
  clearTimer() {
    clearInterval(this.timer)
    this.timeElem.style.display = "none"
  }

  set label(text) {
    this.labelElem.innerText = text
  }
  set time(text) {
    if (text < -60) this.timeElem.innerText = "summarizing..."
    else if (text < 0 && text >= -60) this.timeElem.innerText = `waiting... ${60 + text}`
    else this.timeElem.innerText = secondsToTime(text)
  }


  hide() {
    this.prevCont.style.display = "none"
  }
  show() {
    this.prevCont.style.display = null
  }
}

class GamePlayContainer extends SquaresContainer {
  constructor(elem, address) {
    let gameBody = elem.createDiv("game-body")
    let squaresCont = gameBody.createDiv("squares-container")
    super(squaresCont, address)

    this.createSquaresText()
    this.createSquaresEvt()

    let rightSidebar = gameBody.createDiv("game-right-sidebar")
    let gameInfo = rightSidebar.createDiv("game-info")

    this.timeLeftElem    = gameInfo.createChildren("p")
    this.squarePriceElem = gameInfo.createChildren("p")
    this.boughtCountElem = gameInfo.createChildren("p")
    this.possPirzeElem   = gameInfo.createChildren("p")

    let squaresLegend = rightSidebar.createDiv("squares-legend")
    squaresLegend.innerHTML = `
      <span><div class="square"></div> - not occupied square </span>
      <span> <div class="square" status="buyed"></div> - purchased by you </span>
      <span> <div class="square" status="buyed_other"></div> - purchased by another player </span>`

    this.prizeShower = new PrizeShower()
    this.playerWallet = ""

    this.buyButton = new DefaultButton(rightSidebar, "Buy!")
    this.buyButton.onclick = () => this.buySelectedSquares()
    this.selectedCount = 0;

    this.updateGameplay()
    setInterval(() => this.updateGameplay(), 2000)
  }

  createSquaresText() {
    for (let i = 0; i < 64; i++)
      this.squaresElems[i].innerText = i + 1
  }
  createSquaresEvt() {
    this.squareOnClick = this.squareOnClick.bind(this)
    for (let square of this.squaresElems) {
      square.onclick = this.squareOnClick
    }
  }
  squareOnClick(event) {
    if (!this.state) return;

    let target = event.target;
    const squareStatus = target.getAttribute("status")

    if (!squareStatus)
      target.setAttribute("status", "selected")
    else if (squareStatus == "selected")
      target.removeAttribute("status")

      this.updateSelected()
  }

  async updateGameplay() {
    await this.updateStateCont()

    if (this.status == GAME_NOT_STARTED) {
      this.squarePriceElem.innerText = "Game not active"
      this.boughtCountElem.innerText = ""
      this.possPirzeElem.innerText = ""
      this.clearTimer()
    } else {
      this.squarePriceElem.innerText = `Square price: ${gramsToReadView(this.squarePrice)}`

      const boughtSquares = (this.players[this.playerAddress] || []).length
      this.boughtCountElem.innerText = `Bought squares: ${boughtSquares}`

      if (this.status == GAME_ACTIVE) {
        const possiblePirzeFull = this.squarePrice.multiply(new BigInteger(boughtSquares.toString())
          .multiply(new BigInteger("259")).add(new BigInteger("1000"))).divide(new BigInteger("100"))
        const possiblePirze = boughtSquares ? possiblePirzeFull : new BigInteger("0")
        this.possPirzeElem.innerText = `Possible prize: ${gramsToReadView(possiblePirze)}`
        this.setTimer(this.endGameTime)
      } else {
        this.squaresShowResults()

        this.timeLeftElem.innerText = `Game over`
        const playerPrize = this.playersPrizes[this.playerAddress] || new BigInteger("0")
        this.possPirzeElem.innerText = `You prize: ${gramsToReadView(playerPrize)}`
        this.clearTimer()
      }

      this.updateSelected()
    }

    console.log("gameplay updated");
  }

  updateSelected() {
    this.selectedCount = 0;
    for (let square of this.squaresElems) {
      if (square.getAttribute("status") == "selected")
        this.selectedCount++
    }

    console.log("selectedCount", this.selectedCount);

    this.buyButton.text = `Buy (${gramsToReadView(this.squarePrice.multiply(new BigInteger(this.selectedCount.toString())))  })`
  }

  squaresShowResults() {
    for (let i = 0; i < 64; i++) {
      this.squaresElems[i].setAttribute("result", true)
      this.squaresElems[i].innerText =
        `${this.squareCoefs[i]}%`
      if (this.squareCoefs[i] > 999)
        this.squaresElems[i].setAttribute("winner", true)
    }
  }


  setTimer(endTime) {
    this.clearTimer()
    let time = Math.floor(Date.now() / 1000)
    this.timeLeft = endTime - time
    this.time = this.timeLeft
    this.timer = setInterval(() => {this.time = this.timeLeft--}, 1000)
  }
  clearTimer() {
    clearInterval(this.timer)
  }
  set time(text) {
    if (text < -60) this.timeLeftElem.innerText = "summarizing..."
    else if (text < 0 && text >= -60) this.timeLeftElem.innerText = `waiting... ${60 + text}`
    else this.timeLeftElem.innerText = `Time left: ${secondsToTime(text)}`
  }

  buySelectedSquares() {
    if (!this.selectedCount) return
    let buyedSquares = [0, 0, 0, 0, 0, 0, 0, 0], boughtCount = 0
    for (let i = 0; i < 64; i++) {
      let square = this.squaresElems[i]
      let status = square.getAttribute("status")
      if (status == "selected") {
        square.setAttribute("status", "loading")
        if (!square.progress)
          square.progress = square.createChildren("progress", "progress-round")
        buyedSquares[i >> 3] |= 1 << (7 - (i & 7))
        boughtCount++
      }
    }

    boughtCount = new BigInteger(boughtCount.toString())

    const totalPrice = this.squarePrice.multiply(boughtCount)
    console.log(buyedSquares, boughtCount, gramsToReadView(totalPrice) );
    this.playerWallet.createTransaction(this.address64, totalPrice, buyedSquares.concat(base64ToAddress33(this.playerAddress)))

  }
}
