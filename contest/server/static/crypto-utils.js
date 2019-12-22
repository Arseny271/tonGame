function ed25519sign(dataHash, privKey){
  dataHash = new Uint8Array(dataHash);
  signBytes = nacl.sign(dataHash, privKey);
  return signBytes.slice(0, 64);
}

function sha256HashSync (bytes) {
  var hashWords = CryptoJS.SHA256(bytesToWords(bytes))
  var hashBytes = bytesFromWords(hashWords)
  return hashBytes
}

var makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}
var crc32с = function(str) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str[i]) & 0xFF];
    }

    crc = (crc ^ (-1)) >>> 0;
    return [
      (crc >> 24) & 0xFF,
      (crc >> 16) & 0xFF,
      (crc >> 8) & 0xFF,
      crc & 0xFF,]
};

function crc16(bytes) {
  let crc = 0x0000
  for (let b=0; b<bytes.length; b+=1) {
    crc ^= bytes[b] << 8;
    for (i = 0; i < 8; i++){
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return [(crc>>8) & 255, crc & 255];
}
