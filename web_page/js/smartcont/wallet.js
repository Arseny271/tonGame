const WALLET_CODE_VERSIONS = {
  1: [
    "d4902fcc9fad74698fa8e353220a68da0dcf72e32bcb2eb9ee04217c17d3062c", // old
    "587cc789eff1c84f46ec3797e45fc809a14ff5ae24f1e0c7a6a99cc9dc9061ff"  // new
  ],
  2:[
    "fe9530d3243853083ef2ef0b4c2908c0abf6fa1c31ea243aacaa5bf8c7d753f1"
  ],
  3:[
    "84dafa449f98a6987789ba232358072bc0f76dc4524002a5d0918b9a75d2d599"
  ]
}

class Wallet {
  constructor(address, keyPair) {
    this.deserializer = new BocDeserializer()

    this.address = address
    this.address64 = addresToBase64(address)
    this.address64URL = this.address64
      .replaceAll("+", "-").replaceAll("/", "_")
    this.keyPair = keyPair

    this.ready = false

    this.sendedTransactions = 0
    this.transactionQueue = []
  }
  async updateState() {
    let walletInfo = await callToncenter("getAddressInformation", {
      address: this.address64URL })

    if (walletInfo.ok != true)
      throw ["addr", "wallet address is empty"]
    else {
      walletInfo = walletInfo.result
    }

    if (walletInfo.state != "active")
      throw ["addr", "inactive account"]

    let codeBytes = base64toBytes(walletInfo.code)
    let dataBytes = base64toBytes(walletInfo.data)

    let codeCell = this.deserializer.deserialize(codeBytes)
    let dataCell = this.deserializer.deserialize(dataBytes)

    this.walletVersion = this.getWalletVersion(codeCell);
    if (!this.walletVersion)
      throw ["addr", "unknown wallet version"]

    let publicKey = this.getPublicKey(dataCell);
    if (!compareBytes(publicKey, this.keyPair.publicKey))
      throw ["priv", "wrong private key"]

    this.balance = new BigInteger(walletInfo.balance)
    this.ready = true

    for (let transaction of this.transactionQueue)
      callToncenter("sendBoc", {boc: transaction}, "POST")

    return this
  }
  getWalletVersion(codeCell) {
    const code_hash = codeCell.hashHex
    for (let version in WALLET_CODE_VERSIONS) {
      for (let hash of WALLET_CODE_VERSIONS[version])
        if (hash == code_hash) return +version
    }
  }
  getPublicKey(dataCell) {
    let dataSlice = new Slice(dataCell)
    let seqno = dataSlice.readBits(32)
    if (this.seqno != undefined) this.sendedTransactions -= seqno - this.seqno
    this.seqno = seqno
    this.subid = (this.walletVersion == 3) ? dataSlice.readBits(32) : 0
    let publicKey = dataSlice.readBytes(32)
    return publicKey
  }
  createTransaction(destAddr, gramsValue, bytesMsg) {
    let orderMessage = this.createOrder(destAddr, gramsValue, bytesMsg)
    let signingMessage = this.createSinging(orderMessage, 3)

    let signature = ed25519sign(signingMessage.hash, this.keyPair.secretKey);
    signingMessage = new Slice(signingMessage);

    let mainMessage = new Builder();
    mainMessage.storeUint(68, 7);
    mainMessage.storeBytes(addressTo33Format(this.address));
    mainMessage.storeUint(0, 4);  // 0 grams
    mainMessage.storeUint(0, 2);
    mainMessage.storeBytes(signature);
    mainMessage.storeSlice(signingMessage);
    mainMessage = new Cell(mainMessage);

    let serializer = new BocSerializer()
    let boc = serializer.serialize(mainMessage)
    console.log("serialized!", boc, orderMessage);

    this.sendedTransactions++

    if (!this.ready) this.transactionQueue.push(bytesToBase64(boc))
    else callToncenter("sendBoc", {boc: bytesToBase64(boc)}, "POST")
  }
  createOrder(destAddr, gramsValue, bytesMsg) {
    let orderMessage = new Builder();
    orderMessage.storeUint(196, 9);
    orderMessage.storeBytes(base64ToAddress33(destAddr));
    orderMessage.storeGrams(gramsValue);
    orderMessage.storeUint(0, 107);
    orderMessage.storeBytes(bytesMsg);
    return new Cell(orderMessage);
  }
  createSinging(orderMessage, sendMode) {
    let signingMessage = new Builder();
    if (this.walletVersion == 3) {
      signingMessage.storeUint(this.subid, 32);
      signingMessage.storeBytes([255,255,255,255])}
    signingMessage.storeUint(this.seqno + this.sendedTransactions, 32);
    if (this.walletVersion == 2)
      signingMessage.storeBytes([255,255,255,255]);

    signingMessage.storeUint(sendMode, 8);
    signingMessage.storeRef(orderMessage);
    return new Cell(signingMessage);
  }


}
