/* convertation functions */
function bytesToBase64 (bytes) {         // bytes => base64
  let result = '', mod3

  for (let nLen = bytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    mod3 = nIdx % 3
    nUint24 |= bytes[nIdx] << (16 >>> mod3 & 24)
    if (mod3 === 2 || nLen - nIdx === 1) {
      result += String.fromCharCode(
        uint6ToBase64(nUint24 >>> 18 & 63),
        uint6ToBase64(nUint24 >>> 12 & 63),
        uint6ToBase64(nUint24 >>> 6 & 63),
        uint6ToBase64(nUint24 & 63)
      )
      nUint24 = 0
    }
  }

  return result.replace(/A(?=A$|$)/g, '=')

  function uint6ToBase64 (nUint6) {
    return nUint6 < 26
      ? nUint6 + 65
      : nUint6 < 52
        ? nUint6 + 71
        : nUint6 < 62
          ? nUint6 - 4
          : nUint6 === 62
            ? 43
            : nUint6 === 63
              ? 47
              : 65
  }
}
function base64toBytes(base64) {         // base64 => bytes
  let raw = atob(base64);
  let bytes = []

  for (i = 0; i < raw.length; i++)
    bytes.push(raw.charCodeAt(i))

  return bytes;
}
async function fileToBytes(file) {       // file => Uint8Array
  let fileReader = new FileReader(), defer = new Defer();
  fileReader.onload = () => defer.resolve(event)
  fileReader.readAsArrayBuffer(file)
  await defer.promise;
  return new Uint8Array(fileReader.result);
}
function bytesToHex(bytes) {             // bytes => hex
  bytes = bytes || []
  var arr = []
  for (var i = 0; i < bytes.length; i++) {
    arr.push((bytes[i] < 16 ? '0' : '') + (bytes[i] || 0).toString(16))
  }
  return arr.join('')
}
function base64toHex(base64) {           // base64 => hex
  return bytesToHex(base64toBytes(base64))
}


/* address functions */
function addressTo33Format(buffer) {     // address36 => address33
  let address   = buffer.slice(0, 32);
  let workchain = buffer.slice(-4);

  let addr_bytes = new Uint8Array(33);
  addr_bytes.set(workchain);
  addr_bytes.set(address, 1);
  return addr_bytes;
}
function addresToBase64 (addrB) {        // address36 => base64
  let addr = addressTo33Format(addrB);
  return addres33ToBase64(addr)
}
function addres33ToBase64(addr) {        // address33 => base64
  let addr_bytes = new Uint8Array(34);
  addr_bytes.set([0x91]);
  addr_bytes.set(addr, 1);

  let crc = crc16(addr_bytes)
  let full_address = new Uint8Array(36);
  full_address.set(addr_bytes);
  full_address.set(crc, 34);

  return bytesToBase64(full_address);
}
function base64ToAddress33(base64) {     // base64 => address33
  let addrB = base64toBytes(base64)
  return addrB.slice(1, 34)
}


/* crc functions */
function makeCRCTable() {
  let crcTable = [], c;
  for (let n =0; n < 256; n++) {
    c = n;
    for(let k =0; k < 8; k++)
      c = ((c&1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1));
    crcTable[n] = c;
  }
  return crcTable;
}
function crc16(bytes) {                  // bytes => bytes
  let crc = 0x0000
  for (let b = 0; b < bytes.length; b++) {
    crc ^= bytes[b] << 8;
    for (i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return [(crc >> 8) & 255, crc & 255];
}
function crc32c(bytes) {                 // bytes => bytes
  let crcTable = window.crcTable || (window.crcTable = makeCRCTable());
  let crc = 0 ^ (-1);

  for (let i = 0; i < bytes.length; i++)
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];

  crc = (crc ^ (-1)) >>> 0;
  return [ crc & 0xFF,
    (crc >> 8) & 0xFF,
    (crc >> 16) & 0xFF,
    (crc >> 24) & 0xFF]
};


function compareBytes(a1, a2) {
  return a1.length == a2.length && a1.every((v,i) => v === a2[i])
}
