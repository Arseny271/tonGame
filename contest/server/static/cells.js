function SerializeBOC(cell) {
  let cellsList = [cell];
  let stack = [cell];
  let number = 0;
  cell.number = number;

  // DFS
  while (stack.length > 0) {
    let last = stack[stack.length -1];
    let next = false;
    for (i in last.links) {
      let cell = last.links[i];
      if (cell.number == undefined){
        number += 1;
        cell.number = number;
        cellsList.push(cell);
        stack.push(cell);
        next = true;
        break;
      }
    }
    if (!next) stack.pop()
  }

  // create cell data
  let cellsData = []
  for (i in cellsList) {
    let cell = cellsList[i];
    let byteLength = cell.bytes[1];
    byteLength = (byteLength >> 1) + (byteLength & 1);
    let dataArray = cell.bytes.slice(0, byteLength + 2);
    for (link in cell.links) {
      childCell = cell.links[link];
      dataArray.push(childCell.number);
    }
    cellsData = cellsData.concat(dataArray);
  }

  // create boc
  let bytesArray = [0xB5, 0xEE, 0x9C, 0x72];
  bytesArray.push(0x41);
  bytesArray.push(0x01);
  bytesArray.push(number + 1);
  bytesArray.push(0x01);
  bytesArray.push(0x00);
  bytesArray.push(cellsData.length);
  bytesArray.push(0x00);
  bytesArray = bytesArray.concat(cellsData);
  bytesArray = bytesArray.concat(crc32с(bytesArray).reverse());

  console.log(bytesToHex(bytesArray))
  return bytesArray;
}

function DeserializeBOC(bytes) {
  let data = bytes.slice(0, -4);
  let crc = bytes.slice(-4);

  if (!compareBytes(crc, crc32с(data).reverse())) {
    throw new Error("wrong crc32c")}

  let magic = data.slice(0, 4);
  if (!compareBytes(magic, [181, 238, 156, 114])) {
    throw new Error("not bag of cells")}

  let flags = data[4],
    offset = data[5],
    cellsCount = data[6],
    rootCells = data[7],
    absent = data[8],
    rootCell = data[9+offset]
  let size = bytesToInt(data.slice(9, 9+offset));

  let cellsData = data.slice(10+offset),
    cellsList = [];

  for (let i=0; i<cellsCount; i+=1) {
    let lengthCell = cellsData[0] + (cellsData[1] >> 1) + (cellsData[1] & 1) + 2
    cellsList.push(cellsData.slice(0, lengthCell))
    cellsData = cellsData.slice(lengthCell)
  }

  for (let i=cellsCount-1; i>=0; i-=1) {
    let cell = cellsList[i]
    let len = cell[1] >> 1
    let builder = new Builder()
    builder.storeBytes(cell.slice(2, 2+len));
    if (cell[1] & 1) {
      let byte = cell[2+len], size=7;
      while (!(byte&1)) {
        byte>>=1;
        size-=1;
      }
      byte>>=1
      builder.storeUint(byte, size);
      len += 1
    }

    for (let j=0; j<cell[0]; j+=1) {
      let ref = cell[2+len+j];
      builder.addRef(cellsList[ref])
    }

    cellsList[i] = new Cell(builder)
  }

  return cellsList[0]
}

function Cell(builder) {
  let bits = builder.bits;
  let links = builder.links;

  let byteLength = bits.length >> 3;
  let bitOffset = bits.length % 8;
  let byteArray = [links.length, byteLength << 1];

  if (bitOffset) {
    bits += "1";
    bits += "0".repeat(7-bitOffset);
    byteArray[1] += 1;
  }

  for (let i=0; i<bits.length; i+=8){
    byteArray.push(parseInt(bits.slice(i, i+8), 2))
  }

  let childCell, link, depth = 0, cellsCount = 1;
  if (links.length > 0) {
    for (link in links) {
      childCell = links[link];
      byteArray.push( childCell.depth & 255 );
      byteArray.push((childCell.depth >> 8) & 255);
      if (childCell.depth > depth)
        depth = childCell.depth;
      cellsCount += childCell.cellsCount;
    }
    for (link in links) {
      childCell = links[link];
      byteArray = byteArray.concat(childCell.hash);
    }
    depth += 1;
  }

  this.depth = depth;
  this.links = links;
  this.bytes = byteArray;
  this.hash = sha256HashSync(byteArray);
  this.hashT = bytesToHex(this.hash);
  this.cellsCount = cellsCount;
}

function Builder() {
  this.bits = "";
  this.links = [];
}
Builder.prototype.storeBits = function (bits) {
  this.bits += bits;
}
Builder.prototype.storeUint = function (int, bitsLen) {
  if (!bitsLen) return;
  let bits = int.toString(2);
  let bitsOffset = bitsLen - bits.length;
  if (bitsOffset < 0) throw new Error(bits);
  this.bits += "0".repeat(bitsOffset) + bits;
}
Builder.prototype.storeBytes = function (bytes) {
  for (var i=0; i<bytes.length; i++){
    this.storeUint(bytes[i], 8);
  }
}
Builder.prototype.storeGrams = function (grams) {
  let gramsAmount = grams, byteSize = 0;
  while (grams) { byteSize += 1; grams >>= 8; }
  console.log(byteSize, gramsAmount)
  this.storeUint(byteSize, 4)
  this.storeUint(gramsAmount, byteSize*8);
}
Builder.prototype.storeGramsBig = function (grams) {
  let byteSize = Math.ceil(grams.bitLength()/8)
  this.storeUint(byteSize, 4);
  this.storeUint(grams, byteSize*8);
}
Builder.prototype.storeSlice = function (slice) {
  this.bits += slice.bits;
  this.links = this.links.concat(slice.links);
}
Builder.prototype.addRef = function (cell) {
    this.links.push(cell);
}

function Slice(cell) {
    let bytes = cell.bytes;
    let links = cell.links;
    if (links.length != bytes[0]) throw new Error("incorrect cell");

    let length = (bytes[1] >> 1) + (bytes[1] & 1);
    let bitLength = length * 8;
    if (bytes[1] & 1) {
      lastByte = bytes[1 + length];
      while (!(lastByte & 1)) {
        lastByte >>= 1;
        bitLength -= 1;
      }
      bitLength -= 1;
    }

    let dataBytes = bytes.slice(2, 2 + length);
    let dataBits = bytesToBits(dataBytes).slice(0, bitLength);

    this.bits = dataBits;
    this.links = links.slice();
    this.pos = 0;
}
Slice.prototype.skipBits = function (len) {
  this.pos += len;
}
Slice.prototype.loadUint = function (len) {
  let bits = this.bits.slice(this.pos, this.pos + len);
  this.pos += len;
  return parseInt(bits, 2)
}
Slice.prototype.loadUintBig = function (len) {
  let bits = this.bits.slice(this.pos, this.pos + len);
  this.pos += len;
  return new BigInteger(bits, 2)
}
Slice.prototype.loadBytes = function (count) {
  let bytes = [], i;
  for (i=0; i<count; i++) {
    bytes.push(this.loadUint(8));
  }
  return bytes;
}
Slice.prototype.loadBytesU4 = function (count) {
  let bytes = [], i;
  for (i=0; i<count; i++) {
    bytes.push(this.loadUint(4));
  }
  return bytes;
}
Slice.prototype.bits_left = function () {
  return this.bits.length - this.pos
}
Slice.prototype.loadRef = function () {
  return this.links.pop(0)
}
