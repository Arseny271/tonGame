function bytesFromArrayBuffer (buffer) {
  var len = buffer.byteLength
  var byteView = new Uint8Array(buffer)
  var bytes = []

  for (var i = 0; i < len; ++i) {
    bytes[i] = byteView[i]
  }

  return bytes
}

function bytesToBase64 (bytes) {
  var mod3
  var result = ''

  for (var nLen = bytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
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
}

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

function base64toBytes(base64) {
  let raw = atob(base64);
  let bytes = []

  for (i=0; i<raw.length; i++) {
    bytes.push(raw.charCodeAt(i))}
  return bytes;
}

function bytesU4ToHex (bytes) {
  bytes = bytes || []
  var arr = []
  for (var i = 0; i < bytes.length; i++) {
    arr.push(bytes[i].toString(16))
  }
  return arr.join('')
}

function bytesToHex (bytes) {
  bytes = bytes || []
  var arr = []
  for (var i = 0; i < bytes.length; i++) {
    arr.push((bytes[i] < 16 ? '0' : '') + (bytes[i] || 0).toString(16))
  }
  return arr.join('')
}

function bytesFromHex (hexString) {
  var len = hexString.length,
    i
  var start = 0
  var bytes = []

  if (hexString.length % 2) {
    bytes.push(parseInt(hexString.charAt(0), 16))
    start++
  }

  for (i = start; i < len; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16))
  }

  return bytes
}

function bytesToBits (bytes) {
  bytes = bytes || []
  var arr = []
  for (var i = 0; i < bytes.length; i++) {
    let bits = (bytes[i] || 0).toString(2);
    arr.push("0".repeat(8-bits.length)+bits)
  }
  return arr.join('')
}

function addresFromArrayBuffer (buffer) {
  let address   = buffer.slice(0, 32);
  let workchain = buffer.slice(-4);

  let addr_bytes = new Uint8Array(33);
  addr_bytes.set(workchain);
  addr_bytes.set(address, 1);
  return addr_bytes;
}

function addresToBase64 (addr) {
  let addr_bytes = new Uint8Array(34);
  addr_bytes.set([0x91]);
  addr_bytes.set(addr, 1);

  let crc = crc16(addr_bytes)
  let full_address = new Uint8Array(36);
  full_address.set(addr_bytes);
  full_address.set(crc, 34);

  return bytesToBase64(full_address);
}

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

function compareBytes(a1, a2) {
    return a1.length == a2.length && a1.every((v,i)=>v === a2[i])
}



function bytesToInt(bytes) {
  let int = 0
  for (b of bytes) {
    int <<= 8;
    int += b;
  }
  return int;
}
