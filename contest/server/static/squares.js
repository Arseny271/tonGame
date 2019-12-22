Element.prototype.createChildren = function(tagName, innerText, className){
	let elem = document.createElement(tagName);
	if (className) elem.className = className;
	if (innerText) elem.innerText = innerText;
	this.append(elem);
	return elem;
}
Element.prototype.removeAllChildrens = function(){
	while (this.firstChild){
		this.removeChild(this.firstChild)}
}

function InfoTable() {
  this.walletInfo = document.getElementById("walletInfo");
  this.casinoInfo = document.getElementById("casinoInfo");
}
InfoTable.prototype.updateAll = function () {
  let walInfoChild = this.walletInfo.children,
    walPrms = loginParams.walletAddr,
    casPrms = loginParams.casinoAddr;
  walInfoChild[0].innerText = "Address: " + walPrms.base64
  walInfoChild[1].innerText = "Sequence number: " + walPrms.params.seqno
  walInfoChild[2].innerText = "Subwallet id: " +  walPrms.params.subid
  walInfoChild[3].innerText = "Balance: " + printGrams(walPrms.state.balance)

  this.casinoInfo.removeAllChildrens();
  this.casinoInfo.createChildren("p", "Address: " + casPrms.base64)
	this.casinoInfo.createChildren("p", "Game id: " + casPrms.params.seqno)

  console.log(casPrms.params.state);
  switch (casPrms.params.state) {
    case "game_active":
      this.casinoInfo.createChildren("p", "End time: "
        + (casPrms.params.time_end - Date.now()/1000))
      this.casinoInfo.createChildren("p", "Square price: "
        + printGrams(casPrms.params.price))
      updateSquares(casPrms.params.players, walPrms.base64)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players)
      break;
    case "time_over":
      this.casinoInfo.createChildren("p", "Get the winners...");
      updateSquares(casPrms.params.players, walPrms.base64)
      gameСompletion(casPrms.bytes)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players)
      break;
    case "waiting_end":
      this.casinoInfo.createChildren("p", "Awaiting completion...");
      updateSquares(casPrms.params.players, walPrms.base64)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players)
      break;
    case "game_end":
      this.casinoInfo.createChildren("p", "The game is completed");
      this.casinoInfo.createChildren("p", "result hash: "
        + bytesU4ToHex(casPrms.params.endHash))
      setPrizes(casPrms.params.endHash)
			updateSquares(casPrms.params.players, walPrms.base64)
      break;
    case "game_not_active":
      this.casinoInfo.createChildren("p", "The game is not active");
      break;
  }

  function updateSquares(players, walletAddr) {
    for (player in players) {
      squaresList = players[player];
      for (square of squaresList) {
        let state = (player==walletAddr)?"bought":"busy";
        squaresArr[square].setState(state);
        squaresArr[square].owner = player;
      }
    }

  }
  function setPrizes(endHash) {
    let main_winner = 63 - (arraySum(endHash) & 63)
    for (let i=0; i<64; i+=1) {
      let index = endHash[i]
      let percent = Math.floor(index*index*index/13)
      if (main_winner == i) percent += 1000
      squaresArr[i].setResult(percent)
    }
    function arraySum(array){
      var sum = 0;
      for(var i = 0; i < array.length; i++){
        sum += array[i];}
      return sum
    }
  }

  /*let casInfoChild = this.casinoInfo.children
  casInfoChild[1].innerText = "Address: " + params.casinoAddr.base64
  casInfoChild[2].innerText = "End time: " + (params.casinoAddr.params.time_end - Date.now()/1000)
  casInfoChild[3].innerText = "Square price: " + printGrams(params.casinoAddr.params.price)*/
};

function Square(parentElem, id) {
  let th = document.createElement("th");
  th.innerText = id+1;
  this.id = id;
  this.elem = th;
  this.state = "free";
  this.owner = ""

  for (let listener of ['onClickSquare']) {
    this[listener] = this[listener].bind(this)};
  th.addEventListener("click", this.onClickSquare);

  parentElem.appendChild(th);
}
Square.prototype.onClickSquare = function () {
  switch (this.state) {
    case "free":
      this.setState("selected");
			selectedSquares += 1;
      break;
    case "selected":
      this.setState("free");
			selectedSquares -= 1;
      break;
    case "bought":
      break;
    case "busy":
      break;
  }
}
Square.prototype.setState = function (state) {
  this.elem.setAttribute("state", state);
  this.state = state;
}
Square.prototype.setResult = function (percent) {
  this.elem.setAttribute("result", true)
  if (percent > 999) this.elem.setAttribute("winner", true)
  this.elem.innerText = percent+"%"
}

let selectedSquares = 0;
let squares = document.getElementsByClassName("squares")[0]
let squaresArr = []
for (let i=0; i<8; i++) {
  let tr = document.createElement("tr");
  for (let j=0;j<8;j++){
    let id = i*8+j;
    let sq = new Square(tr, id);
    squaresArr.push(sq);
  }
  squares.appendChild(tr);
}

let infoTable = new InfoTable()
