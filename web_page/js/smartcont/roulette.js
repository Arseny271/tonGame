const GAME_NOT_STARTED = 1
const GAME_ACTIVE = 2
const GAME_FINISHED = 3

class Roulette {
  constructor(address) {
    this.address = address
    this.address64 = address.replaceAll("-", "+").replaceAll("_", "/")
    this.deserializer = new BocDeserializer()
  }

  async updateState() {
    let gameInfo = await callToncenter("getAddressInformation", {
      address: this.address})

    let codeBytes = base64toBytes(gameInfo.result.code)
    let codeCell = this.deserializer.deserialize(codeBytes)
    console.log("code Hash", codeCell.hashHex);

    let dataBytes = base64toBytes(gameInfo.result.data)
    let dataCell = this.deserializer.deserialize(dataBytes)
    let dataSlice = new Slice(dataCell)

    this.seqno = dataSlice.readBits(32)
    this.subid = dataSlice.readBits(32)
    this.publicKey = dataSlice.readBytes(32)
    this.state = dataSlice.readBits(4)

    if (this.state == 0) {
      if (dataSlice.bitLength >= 580) {
        this.squarePrice = dataSlice.readLong(64);
        this.getPlayers(dataSlice)
        this.getResults(dataSlice.readBytes(32));
        this.status = GAME_FINISHED
      } else {
        this.status = GAME_NOT_STARTED
      }
    } else {
      this.endGameTime = dataSlice.readBits(32)

      if ((this.endGameTime + 60) < (Date.now() / 1000))
        this.sendGameEndQuery()

      this.squarePrice = dataSlice.readLong(64)
      this.getPlayers(dataSlice)
      this.status = GAME_ACTIVE
    }

    if (this.onupdate) this.onupdate(this)
  }

  getResults(resultHash) {
    let indexArray = [], mainWinner = 0;
    for (let i = 0; i < 32; i++) {
      indexArray.push(resultHash[i] >> 4)
      indexArray.push(resultHash[i] & 15)
      mainWinner += resultHash[i] >> 4
      mainWinner += resultHash[i] & 15
    }

    this.squareCoefs = []
    for (let i = 0; i < 64; i++)
      this.squareCoefs.push( Math.floor(indexArray[i] ** 3 / 13) )

    mainWinner = 63 - (mainWinner & 63)
    this.squareCoefs[mainWinner] += 1000

    this.playersPrizes = {}
    for (let player in this.players) {
      let boughtSquares = this.players[player], playerPrize = 0
      for (let square of boughtSquares)
        playerPrize += this.squareCoefs[square]

      playerPrize = new BigInteger(playerPrize.toString())
      playerPrize = playerPrize.multiply(this.squarePrice)
      playerPrize = playerPrize.divide(new BigInteger("100"))

      this.playersPrizes[player] = playerPrize
    }
  }

  getPlayers(dataSlice) {
    this.players = {}

    if (dataSlice.links.length) {
      let playerCell = dataSlice.readLink()
      while (playerCell.bitLength != 0) {
        let buyedSquares = playerCell.readBytes(8);
        let address33 = playerCell.readBytes(33);
        let address64 = addres33ToBase64(address33);

        let buyedList = this.squareBytesToList(buyedSquares);
        this.players[address64] = (this.players[address64] || [])
          .concat(buyedList)

        playerCell = playerCell.readLink()
      }
    }
  }

  squareBytesToList(bytes) {
    let squareList = []
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((bytes[i] >> (7 - j)) & 1)
          squareList.push(i * 8 + j)
      }
    }
    return squareList
  }

  sendGameEndQuery() {
    let mainMessage = new Builder();
    mainMessage.storeUint(68, 7);
    mainMessage.storeBytes(base64ToAddress33(this.address64));
    mainMessage.storeUint(0, 4);  // 0 grams
    mainMessage.storeUint(0, 2);
    mainMessage.storeBytes(createRandomArray(64));
    mainMessage = new Cell(mainMessage);

    let serializer = new BocSerializer()
    let boc = serializer.serialize(mainMessage)
    console.log("serialized! endGame", boc);

    callToncenter("sendBoc", {boc: bytesToBase64(boc)}, "POST")
  }
}
