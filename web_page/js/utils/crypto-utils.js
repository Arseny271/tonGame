function bytesToWords (bytes) {
  if (bytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(bytes)
  }
  var len = bytes.length
  var words = []
  var i
  for (i = 0; i < len; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }

  return new CryptoJS.lib.WordArray.init(words, len)
}

function bytesFromWords (wordArray) {
  var words = wordArray.words
  var sigBytes = wordArray.sigBytes
  var bytes = []

  for (var i = 0; i < sigBytes; i++) {
    bytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)
  }

  return bytes
}

function sha256HashSync (bytes) {
  var hashWords = CryptoJS.SHA256(bytesToWords(bytes))
  var hashBytes = bytesFromWords(hashWords)
  return hashBytes
}

function ed25519sign(dataHash, privKey){
  dataHash = new Uint8Array(dataHash);
  signBytes = nacl.sign(dataHash, privKey);
  return signBytes.slice(0, 64);
}
