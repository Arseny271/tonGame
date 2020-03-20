class BytesStream {
  constructor(bytes) {
    this.bytes = bytes;
    this.diffStart = 0;
    this.diffEnd = bytes.length;
  }
  read(size) {
    return this.bytes.slice(this.diffStart, this.diffStart += size);
  }
  readByte() {
    let idx = this.diffStart
    this.diffStart++
    return this.bytes[idx]
  }
  readInt(size) {
    let bytes = this.read(size), int = 0;

    for (let i = 0; i < bytes.length; i++) {
      int = int << 8;
      int += bytes[i];
    }

    return int;
  }
  readEnd(size) {
    let diff = this.diffEnd
    return this.bytes.slice(this.diffEnd -= size, diff);
  }
}

class Builder {
  constructor() {
    this.bytes = [];
    this.links = [];
    this.bitLength = 0;
  }
  storeBit(bit) {
    bit &= 1;
    let index = this.bitLength >> 3;
    let bitN = 7 - (this.bitLength & 7)
    this.bytes[index] |= bit << bitN;
    this.bitLength++
  }
  storeByte(byte) {
    let index = this.bitLength >> 3;
    let bitN = this.bitLength & 7     // кол-во занятых битов

    this.bytes[index] |= byte >> bitN
    if (bitN) this.bytes[index + 1] = (byte << (8 - bitN)) & 255;
    this.bitLength += 8
  }
  storeCell(cell) {
    this.links.push(cell)
  }
  storeUint(uint, length) {
    for (let i = 0; i < length; i++)
      this.storeBit((uint >> (length - i - 1)) & 1)
  }
  storeBytes(bytes) {
    for (let i = 0; i < bytes.length; i++)
      this.storeByte(bytes[i])
  }
  storeBigUint(uint, length) {
    let bits = uint.toString(2);
    bits = "0".repeat(length - bits.length) + bits
    for (let i = 0; i < bits.length; i++)
      this.storeBit((bits[i] == "0") ? 0 : 1)
  }
  storeGrams(grams) {
    let byteSize = Math.ceil(grams.bitLength() / 8)
    this.storeUint(byteSize, 4);
    this.storeBigUint(grams, byteSize << 3);
  }

  storeRef(cell) {
    this.links.push(cell);
  }

  storeSlice(slice) {
    this.links = this.links.concat(slice.links);
    for (let i = slice.readPos; i < slice.bitLength; i++)
      this.storeBit(slice.readBit())
  }

}

class Cell {
  constructor(builder) {
    this.links = builder.links

    const byteLength = builder.bitLength >> 3;
    const bitLength = builder.bitLength & 7;

    const d0 = builder.links.length
    const d1 = (byteLength << 1) + (bitLength ? 1 : 0)

    if (d1 & 1) builder.bytes[byteLength] |= 1 << (7 - bitLength)

    let writePos = 0
    this.cellRepr = new Uint8Array(2 + builder.bytes.length + d0 * 34)
    this.cellRepr.set([d0, d1], 0)
    this.cellRepr.set(builder.bytes, 2)

    this.cellsCount = 1;
    this.depth = 0;

    for (let i = 0; i < d0; i++ ) {
      let childCell = builder.links[i];
      this.cellRepr.set([ (childCell.depth >> 8) & 255,
        childCell.depth & 255], 2 + builder.bytes.length + i * 2)
      this.cellRepr.set(childCell.hash, 2 + builder.bytes.length + d0 * 2 + i * 32)

      if (childCell.depth > this.depth) this.depth = childCell.depth
      this.cellsCount += childCell.cellsCount;
    }

    if (d0) this.depth++

    this.hash = sha256HashSync(this.cellRepr);
    this.hashHex = bytesToHex(this.hash)
  }

  searchByHash(hashHex) {
    if (hashHex == this.hashHex) return this
    for (let link of this.links) {
      let cell = link.searchByHash(hashHex)
      if (cell) return cell
    }
  }
}

class Slice {
  constructor(cell) {
    this.links = cell.links

    let length = cell.cellRepr[1]
    let byteLength = (length >> 1) + (length & 1)
    this.bitLength = (length << 2) & 0xFFF8
    this.bytes = cell.cellRepr.slice(2, 2 + byteLength)
    this.readPos = 0;

    if (length & 1) {
      let lastByte = cell.cellRepr[length >> 1]
      do {
        this.bitLength++
        lastByte = (lastByte << 1) & 255;
      } while (lastByte != 128 && lastByte != 0);
    }
  }

  readBit() {
    let bit = (this.bytes[this.readPos >> 3] >> (7 - (this.readPos & 7))) & 1
    this.readPos++
    return bit
  }
  readBits(length) {
    let res = 0;
    for (let i = 0; i < length; i++)
      res = (res << 1) + this.readBit()
    return res
  }
  readBytes(length) {
    //return this.bytes.slice(this.readPos >> 3, (this.readPos += length << 3) >> 3)
    let arr = []
    for (let i = 0; i < length; i++)
      arr.push(this.readBits(8))
    return arr
  }

  readLong(length) {
    let str = "";
    for (let i = 0; i < length; i++)
      str += this.readBit()

    return new BigInteger(str, 2)
  }

  readLink() {
    return new Slice(this.links.shift())
  }
}

class BocDeserializer {
  constructor() {}

  deserialize(bytes) {
    let stream = new BytesStream(bytes);

    let magicNumber = stream.read(4);

    let flags = stream.readByte();

    let hasCRC = flags & 64 && true;
    let hasIdx = flags & 128 && true;
    let byteSize = flags & 7;

    if (hasCRC) {
      let crcCode = stream.readEnd(4);
      let crcBoc = crc32c(bytes.slice(0, -4));
    }

    let diffSize = stream.readByte();
    let cellsCount = stream.readInt(byteSize);
    let rootsCount = stream.readInt(byteSize);
    let absentCount = stream.readInt(byteSize);
    let totalSize = stream.readInt(diffSize);

    let rootList = []
    for (let i = 0; i < rootsCount; i++)
      rootList.push(stream.readInt(byteSize));

    let indexList = []
    if (hasIdx) {
      for (let i = 0; i < cellsCount; i++)
        indexList.push(stream.readInt(diffSize));
    }

    this.cellsList = [];
    for (let i = 0; i < cellsCount; i++) {
      let refsCount = stream.readByte();
      let cellLength = stream.readByte();

      let cellByteLength = (cellLength >> 1) + (cellLength & 1);
      let cellData = stream.read(cellByteLength)

      let refsList = []
      for (let j = 0; j < refsCount; j++)
        refsList.push(stream.readInt(byteSize))
      this.cellsList.push({refsCount, cellLength, cellData, refsList})
    }

    return this.pseudoCellToCell(this.cellsList[0]);
  }

  pseudoCellToCell(cellInfo) {
    let data = cellInfo.cellData
    let length = cellInfo.cellLength >> 1
    let builder = new Builder()

    for (let i = 0; i < length; i++)
      builder.storeByte(data[i])

    if (cellInfo.cellLength & 1) {
      let lastByte = data[length];
      do {
        builder.storeBit(lastByte >> 7);
        lastByte = (lastByte << 1) & 255;
      } while (lastByte != 128 && lastByte != 0);
    }

    for (let i = 0; i < cellInfo.refsList.length; i++) {
      let cell = this.pseudoCellToCell( this.cellsList[cellInfo.refsList[i]] )
      builder.storeCell(cell)
    }

    return new Cell(builder);
  }
}

class BocSerializer {
  constructor() {}

  serialize(cell) {
    let cellsList = this.createTree(cell)
    let cellsData = this.createCellsData(cellsList)

    // create boc
    let bytesArray = [0xB5, 0xEE, 0x9C, 0x72];
    bytesArray.push(0x41);
    bytesArray.push(0x01);
    bytesArray.push(cell.cellsCount);
    bytesArray.push(0x01);
    bytesArray.push(0x00);
    bytesArray.push(cellsData.length);
    bytesArray.push(0x00);
    bytesArray = bytesArray.concat(cellsData);
    bytesArray = bytesArray.concat(crc32c(bytesArray)/*.reverse()*/);
    return bytesArray;
  }

  createTree(cell) {
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

    return cellsList
  }
  createCellsData(cellsList) {
    let cellsData = []
    for (i in cellsList) {
      let cell = cellsList[i];
      let byteLength = cell.cellRepr[1];
      byteLength = (byteLength >> 1) + (byteLength & 1);
      let dataArray = cell.cellRepr.slice(0, byteLength + 2);

      let dataBytes = []
      for (let i = 0; i < dataArray.length; i++)
        dataBytes.push(dataArray[i])

      for (let link in cell.links) {
        let childCell = cell.links[link];
        dataBytes.push(childCell.number);
      }
      cellsData = cellsData.concat(dataBytes);
    }
    return cellsData
  }
}
