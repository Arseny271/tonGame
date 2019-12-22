const GRAM = new BigInteger("1000000000")
const ML_GRAM = new BigInteger("1000000")

let popupMessage = document.getElementById("mbg");
function showMessage(){popupMessage.setAttribute("active", true)}
function hideMessage(){popupMessage.setAttribute("active", false)}

function FileLoader(buttonElem, inputFile, labelElem, onload){
  this.buttonElem = buttonElem;
  this.inputFile  = inputFile;
  this.labelElem  = labelElem;
  this.onloadFunc = onload
  this.fileReader = new FileReader();

  for (let listener of ['onButtonClick', 'onFileInput', 'onFileLoad']) {
    this[listener] = this[listener].bind(this);
  }

  this.buttonElem.addEventListener('click', this.onButtonClick);
  this.inputFile.addEventListener('input', this.onFileInput);
  this.fileReader.addEventListener('load', this.onFileLoad);
}
FileLoader.prototype.onButtonClick = function () {
  this.inputFile.click()
}
FileLoader.prototype.onFileInput = function () {
  let file = this.inputFile.files[0];
  this.setLoading(true);
  this.fileReader.readAsArrayBuffer(file);
}
FileLoader.prototype.onFileLoad = function() {
  let result = new Uint8Array(this.fileReader.result);
  this.setLoading(false)
  this.onloadFunc(result, this /*.inputFile.id, this.buttonElem, this.labelElem*/);
}
FileLoader.prototype.setLabel = function(text) {
  this.labelElem.innerText = text;
}
FileLoader.prototype.setLoading = function (state) {
  this.buttonElem.setAttribute("loading", state);
}

loginParams = {}

function onloadPrivateKey(result, loader){
  let keyPair = nacl.sign.keyPair.fromSeed(result);
  loginParams.keyPair = keyPair;
  loader.setLabel("*****");
  loginButtonActive()
}
function onloadAddr(result, loader) {
  let addrBytes = addresFromArrayBuffer(result);
  let addrBase64 = addresToBase64(addrBytes);
  loader.setLabel(addrBase64)
  let addr = {
    base64: addrBase64,
    bytes: addrBytes
  }
  return getAccountState(addrBase64).then(response => {
    loader.setLoading(false);
    addr.state = response;
    return addr;
  })
}
function onloadWalletAddress (result, loader) {
  onloadAddr(result, loader).then(r => {
    r.params = getWalletParams(r.state.data);
    loginParams.walletAddr = r;
    loginButtonActive();
  });
}
function onloadCasinoAddress (result, loader) {
  onloadAddr(result, loader).then(r => {
    r.params = getCasinoParams(r.state.data, r.base64);
    loginParams.casinoAddr = r;
    loginButtonActive();
  });
}
function loginButtonActive(){
  let active = (loginParams.keyPair &&
    loginParams.walletAddr &&
    loginParams.casinoAddr)
  active = (active)?true:false;
  loginButton.setAttribute("active", active);
  loginButton.active = active
}


function printGrams (g) {
  let grams = g.divide(ML_GRAM).intValue() / 1000;
  return grams + " GRM";
}

let loginButton = document.getElementById("loginButton");
loginButton.onclick = function () {
  if (loginButton.active) {
    infoTable.updateAll()
    hideMessage()
  }

}

loadButtons = {
  "casinoAddr": onloadCasinoAddress,
  "walletAddr": onloadWalletAddress,
  "privateKey": onloadPrivateKey
}

for (butt in loadButtons) {
  let inputFile = document.getElementById(butt);
  let loadButton = document.getElementById(butt+"Button");
  let loadLabel = document.getElementById(butt+"Label");
  let onload = loadButtons[butt]
  new FileLoader(loadButton, inputFile, loadLabel, onload)
}


let buyButton = document.getElementById("buyButton");


function buyCells(){
  let bits = "", selected = 0;
  for (square of squaresArr){
    if (square.state == "selected") {
      // square.setState("bought");
      selected += 1;
      bits += "1";
    } else {
      bits += "0";
    }
  }


  createOrder(
    loginParams,
    bits,
    selected
  )
}


let currentStateButton = document.getElementById("goToCurSt");
currentStateButton.onclick = goToCurrentState;
currentStateButton.loading = false;

function getCasinoParams (cell, addr) {
  let slice = new Slice(cell)
  let gameState = {seqno: slice.loadUint(32)}

  slice.skipBits(288);
  let state = slice.loadUint(4);
  if (state == 1) {
    let time_end  = slice.loadUint(32);
    let time_left = time_end - Date.now()/1000;

    if (time_left < -60) gameState.state = "time_over";
    else if (time_left < 0) gameState.state = "waiting_end";
    else gameState.state = "game_active";

    gameState.time_end = time_end;
    gameState.price = slice.loadUintBig(64);
    gameState.free_squares = bytes_to_sqares(slice.loadBytes(8));
    gameState.players = {}

    let player = new Slice(slice.loadRef())
    while (player.bits_left() > 0) {
      let squares = bytes_to_sqares(player.loadBytes(8));
      let address = addresToBase64(player.loadBytes(33));
      let squares_old = gameState.players[address] || [];
      gameState.players[address] = squares_old.concat(squares);
      player = new Slice(player.loadRef())
    }

  } else {
    gameState.state = "game_not_active"
    if (slice.bits_left() == 256) {
      gameState.endHash = slice.loadBytesU4(64);
      gameState.state = "game_end"
      gameState.players = gameStateLoad (addr, gameState.seqno)
    }
  }

  function bytes_to_sqares (bytes) {
    let i, j, byte, squares = [];
    for (i=0; i<8; i++) {
      byte = bytes[i]
      for (j=0; j<8; j++) {
        if (byte&1) squares.push(i*8+7-j)
        byte >>= 1;
      }
    }
    return squares;
  }
  return gameState;
}
function getWalletParams (cell) {
  let slice = new Slice(cell)
  return {
    "seqno": slice.loadUint(32),
    "subid": slice.loadUint(32)
  }
}
function goToCurrentState() {
  if (currentStateButton.loading) {return;}

  let game = loginParams.casinoAddr,
  wallet = loginParams.walletAddr

  currentStateButton.loading = true;
  currentStateButton.setAttribute("loading", true);

  getAccountState(game.base64).then(response => {
    game.state = response;
    game.params = getCasinoParams(response.data, game.base64);
  })
  .then(() => getAccountState(wallet.base64))
  .then(response => {
    wallet.state = response;
    wallet.params = getWalletParams(response.data);
  }).then(() => infoTable.updateAll()).finally(() => {
    currentStateButton.loading = false;
    currentStateButton.removeAttribute("loading");
  })
}

function createOrder(params, buyedSquares, squaresAmount) {
  const SEND_MODE = 3;
  let destAddr = params.casinoAddr.bytes,
    sourceAddr = params.walletAddr.bytes,
    seqno = params.walletAddr.params.seqno,
    price = params.casinoAddr.params.price,
    keyPair = params.keyPair;
  squaresAmount = new BigInteger(squaresAmount.toString())
  let totalPrice = price.multiply(squaresAmount);
  console.log(totalPrice, totalPrice.intValue())


  let orderMessage = new Builder();
  orderMessage.storeUint(196, 9);
  orderMessage.storeBytes(destAddr);
  orderMessage.storeGramsBig(totalPrice);
  orderMessage.storeUint(0, 107);
  orderMessage.storeBits(buyedSquares);
  orderMessage.storeBytes(sourceAddr);
  orderMessage = new Cell(orderMessage);

  let signingMessage = new Builder();
  signingMessage.storeUint(seqno, 32);
  signingMessage.storeUint(SEND_MODE, 8);
  signingMessage.addRef(orderMessage);
  signingMessage = new Cell(signingMessage);

  let signature = ed25519sign(signingMessage.hash, keyPair.secretKey);
  signingMessage = new Slice(signingMessage);

  let mainMessage = new Builder();
  mainMessage.storeUint(68, 7);
  mainMessage.storeBytes(sourceAddr);
  mainMessage.storeGrams(0);
  mainMessage.storeUint(0, 2);
  mainMessage.storeBytes(signature);
  mainMessage.storeSlice(signingMessage);
  mainMessage = new Cell(mainMessage);

  let boc = SerializeBOC(mainMessage);
  sendBagOfCells(bytesToBase64(boc))
}
function gameСompletion(destAddr) {
  let mainMessage = new Builder();
  mainMessage.storeUint(68, 7);
  mainMessage.storeBytes(destAddr);
  mainMessage.storeGrams(0);
  mainMessage.storeUint(0, 3);
  mainMessage.storeBytes([0,0,0,0,0,0,0,0])
  mainMessage = new Cell(mainMessage);
  let boc = SerializeBOC(mainMessage);
  sendBagOfCells(bytesToBase64(boc))
}

function gameStateSave (game_addr, game_id, players) {
  let key = game_addr + ":" + game_id;
  players = JSON.stringify(players)
  localStorage.setItem(key, players);
}
function gameStateLoad (game_addr, game_id) {
  let key = game_addr + ":" + game_id;
  let loaded = localStorage.getItem(key);
  if (loaded) return JSON.parse(loaded);
  return {}
}
