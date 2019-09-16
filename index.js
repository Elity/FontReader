function pad0(str, length) {
  return (Array(length + 1).join('0') + str).slice(-length);
}

class DataReader {
  index = 0;
  static read(buffer) {
    return new this(buffer);
  }

  constructor(buffer) {
    this.view = new DataView(buffer);
    this.typeArray = new Uint8Array(buffer);
  }

  readAsDataChunk(length = 0) {
    const chunk = this.typeArray.slice(this.index, (this.index += length));
    return this.constructor.read(chunk.buffer);
  }

  readAsUShort() {
    const val = this.view.getUint16(this.index);
    this.index += 2;
    return val;
  }

  readAsULong() {
    const val = this.view.getUint32(this.index);
    this.index += 4;
    return val;
  }
  // 指定位置读取指定长度的字符串，但是不移动指针
  // utf16暂不考虑3字节的情况
  readAsStringFrom(pos, length, utf16 = false) {
    const arr = [...this.typeArray.slice(pos, pos + length)];
    if (utf16) {
      return unescape(
        arr
          .map(item => pad0(item.toString(16), 2))
          .join('')
          .replace(/(\w{4})/g, '%u$1')
      );
    } else {
      return arr.map(item => String.fromCharCode(item)).join('');
    }
  }

  readAsString(length, utf16) {
    const str = this.readAsStringFrom(this.index, length, utf16);
    this.index += length;
    return str;
  }

  seek(offset) {
    this.index = offset;
    return this;
  }

  skip(length) {
    this.index += length;
    return this;
  }

  tell() {
    return this.index;
  }
  get length() {
    return this.typeArray.length;
  }
}

class TTCReader {
  attrs = [];
  constructor(arrayBuffer) {
    this.reader = DataReader.read(arrayBuffer);
    const headerChunk = this.reader.readAsDataChunk(12);
    // uNumFonts 即 TTC 文件中含有的 TTF 字体个数
    const uNumFonts = this.readFileHeader(headerChunk);
    for (let i = 0; i < uNumFonts; i++) {
      let baseOffset = this.reader.readAsULong();
      const ttr = new TTFReader(arrayBuffer, baseOffset);
      this.attrs.push(ttr.getAttrs());
    }
  }
  readFileHeader(chunk) {
    const tag = chunk.readAsString(4);
    if (tag === 'ttcf') {
      const uMajorVersion = chunk.readAsUShort();
      const uMinorVersion = chunk.readAsUShort();
      if ((uMajorVersion === 1 || uMajorVersion === 2) && uMinorVersion === 0) {
        const uNumFonts = chunk.readAsULong();
        return uNumFonts;
      }
    }
    throw new Error('Not a ttc file');
  }
  getAttrs() {
    return this.attrs;
  }
}

class TTFReader {
  attrsMap = {
    0: 'copyright',
    1: 'fontFamily',
    2: 'fontSubFamily',
    3: 'fontIdentifier',
    4: 'fontName',
    5: 'fontVersion',
    6: 'postscriptName',
    7: 'trademark',
  };
  attrs = {};
  constructor(arrayBuffer, baseOffset = 0) {
    this.reader = DataReader.read(arrayBuffer);
    this.reader.seek(baseOffset);
    const headerChunk = this.reader.readAsDataChunk(12);
    const uNumOfTables = this.readFileHeader(headerChunk);
    const uOffset = this.findNameTablesOffset(uNumOfTables);
    this.reader.seek(uOffset);
    this.readAttrs();
  }

  readFileHeader(reader) {
    const uMajorVersion = reader.readAsUShort();
    const uMinorVersion = reader.readAsUShort();
    const uNumOfTables = reader.readAsUShort();
    if (uMajorVersion !== 1 || uMinorVersion !== 0) {
      throw new Error('Not a ttf file');
    }
    return uNumOfTables;
  }

  findNameTablesOffset(uNumOfTables) {
    let findNameTable = false;
    let chunk;
    for (let i = 0; i < uNumOfTables; i++) {
      // 以16字节为一个单位，循环读取table
      chunk = this.reader.readAsDataChunk(16);
      const str = chunk.readAsString(4);
      // 直到找到一个table，前四个字节为"name"
      if (str === 'name') {
        findNameTable = true;
        break;
      }
    }
    if (!findNameTable) {
      throw new Error("Can't find name table");
    }
    chunk.skip(4); // 不读取uCheckSum，跳过
    const uOffset = chunk.readAsULong();
    return uOffset;
  }

  readAttrs() {
    const pos = this.reader.tell();
    this.reader.skip(2); //不读取 uFSelector
    const uNRCount = this.reader.readAsUShort(); // name record count
    const uStorageOffset = this.reader.readAsUShort();
    const recordOffset = pos + uStorageOffset;
    // 以12字节为单位读取name record
    for (let i = 0; i < uNRCount; i++) {
      const chunk = this.reader.readAsDataChunk(12);
      this.readNameeRecord(chunk, recordOffset);
    }
  }

  readNameeRecord(chunk, recordOffset) {
    const uPlatformID = chunk.readAsUShort();
    const uEncodingID = chunk.readAsUShort();
    chunk.skip(2); // 不读取 跳过uLanguageID
    const uNameID = chunk.readAsUShort();
    const uStringLength = chunk.readAsUShort();
    const uStringOffset = chunk.readAsUShort();

    // uNameID 参考 https://docs.microsoft.com/en-us/typography/opentype/spec/name#name-ids
    if (uNameID > 7 || uStringLength <= 0) {
      return;
    }
    /**
     * 依据 https://docs.microsoft.com/en-us/typography/opentype/spec/name
     * Platform ID 与 Encoding ID 对应关系
     *  platformID  platforName    encodingId=0     encodingId=1     encodingId=2   encodingId=3
     *  0           Unicode        Unicode 1.0      Unicode 1.1      ISO/IEC 10646   Unicode 2.0
     *  1           Macintosh      Roman            Japanese         Chinese         Korean
     *  2           ISO(弃用)       -                 -
     *  3：         Windows        Symbol           Unicode BMP      ShiftJIS        PRC
     *  4           Custom         -                 -               -               -
     * }
     *
     * 我们只考虑unicode的形式，也就是
     * platformID = 0   Encoding ID = (0,1,3)
     * platformID = 3   Encoding ID = 1
     * 两种情况
     */
    if ([0, 3].indexOf(uPlatformID) === -1) return;
    if (uPlatformID === 0 && [0, 1, 3].indexOf(uEncodingID) === -1) return;
    if (uPlatformID === 3 && uEncodingID !== 1) return;

    const strVal = this.reader.readAsStringFrom(recordOffset + uStringOffset, uStringLength, true);
    if (!strVal.trim()) return;
    const attrName = this.attrsMap[uNameID];
    this.setAttr(attrName, strVal);
  }

  setAttr(attrName, attrVal) {
    if (!this.attrs[attrName]) this.attrs[attrName] = attrVal;
  }
  getAttrs() {
    return this.attrs;
  }
}

export default { DataReader, TTFReader, TTCReader };
