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
	this.oldState = ""
}
InfoTable.prototype.updateAll = function () {
  let walPrms = loginParams.walletAddr,
    casPrms = loginParams.casinoAddr,
		version = walPrms.version + 1;

	this.walletInfo.removeAllChildrens();
	this.walletInfo.createChildren("p", "Address: " + walPrms.base64)
	this.walletInfo.createChildren("p", "Balance: " + printGrams(walPrms.state.balance))
	this.walletInfo.createChildren("p", "Sequence number: " + walPrms.params.seqno)
	if (version == 3) {
		this.walletInfo.createChildren("p", "Subwallet id: " +  walPrms.params.subid)}
	this.walletInfo.createChildren("p", "Version: " + version)


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
			if (this.oldState == "game_end") squatesCont.clear();
      squatesCont.updateSquares(casPrms.params.players, walPrms.base64)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players, casPrms.params.price)
      break;
    case "time_over":
      this.casinoInfo.createChildren("p", "Get the winners...");
      squatesCont.updateSquares(casPrms.params.players, walPrms.base64)
      gameСompletion(casPrms.bytes)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players, casPrms.params.price)
      break;
    case "waiting_end":
      this.casinoInfo.createChildren("p", "Awaiting completion...");
      squatesCont.updateSquares(casPrms.params.players, walPrms.base64)
			gameStateSave(casPrms.base64, casPrms.params.seqno, casPrms.params.players, casPrms.params.price)
      break;
    case "game_end":
      this.casinoInfo.createChildren("p", "The game is completed");
      this.casinoInfo.createChildren("p", "result hash: "
        + bytesU4ToHex(casPrms.params.endHash))
      squatesCont.setPrizes(casPrms.params.endHash)
			squatesCont.updateSquares(casPrms.params.players, walPrms.base64)
			let playerInfo = casPrms.params.players[walPrms.base64],
				price = casPrms.params.price, sum = 0;
			if (playerInfo) {
				for (square of playerInfo) {
					sum += squatesCont.squaresArr[square].percent;
				}
				sum /= playerInfo.length;
				this.casinoInfo.createChildren("hr");
				this.casinoInfo.createChildren("p", "Average percentage: " + sum + "%");
				this.casinoInfo.createChildren("p", "Your prize: "
					+ printGrams(price
						.multiply(new BigInteger(Math.floor(playerInfo.length*sum*100).toString(10)))
						.divide(new BigInteger("10000"))
					));
			}
      break;
    case "game_not_active":
      this.casinoInfo.createChildren("p", "The game is not active");
      break;
  }
	this.oldState = casPrms.params.state;
};
InfoTable.prototype.showResults = function () {};

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
	this.percent = percent;
}

function SquaresContainer() {
	let elem = document.getElementsByClassName("squares")[0]
	let squaresArr = [];
	for (let i=0; i<8; i++) {
	  let tr = document.createElement("tr");
	  for (let j=0; j<8; j++) {
	    let id = i*8+j;
	    let sq = new Square(tr, id);
	    squaresArr.push(sq);
	  }
	  elem.appendChild(tr);
	}

	this.contElem = elem;
	this.squaresArr = squaresArr;
}
SquaresContainer.prototype.setPrizes = function (end_hash) {
	let main_winner = 63 - (arraySum(end_hash) & 63)
	for (let i=0; i<64; i+=1) {
		let index = end_hash[i]
		let percent = Math.floor(index*index*index/13)
		if (main_winner == i) percent += 1000
		this.squaresArr[i].setResult(percent)
	}
	function arraySum(array){
		var sum = 0;
		for(var i = 0; i < array.length; i++){
			sum += array[i];}
		return sum
	}
}
SquaresContainer.prototype.updateSquares =  function (players, walletAddr) {
  for (player in players) {
    squaresList = players[player];
    for (square of squaresList) {
      let state = (player==walletAddr)?"bought":"busy";
      this.squaresArr[square].setState(state);
      this.squaresArr[square].owner = player;
    }
  }
}
SquaresContainer.prototype.clear =  function () {
  for (square of this.squaresArr) {
		console.log(square)
    square.setState("free");
    square.owner = "";
		square.elem.removeAttribute("result");
		square.elem.removeAttribute("winner");
	  square.elem.innerText = square.id + 1;
		square.percent = undefined;
  }
}


let selectedSquares = 0;
let squatesCont = new SquaresContainer()
let infoTable = new InfoTable()
