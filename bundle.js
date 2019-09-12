(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.FontReader = factory());
}(this, function () { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function pad0(str, length) {
    return (Array(length + 1).join('0') + str).slice(-length);
  }

  var DataReader =
  /*#__PURE__*/
  function () {
    _createClass(DataReader, null, [{
      key: "read",
      value: function read(buffer) {
        return new this(buffer);
      }
    }]);

    function DataReader(buffer) {
      _classCallCheck(this, DataReader);

      _defineProperty(this, "index", 0);

      this.view = new DataView(buffer);
      this.typeArray = new Uint8Array(buffer);
    }

    _createClass(DataReader, [{
      key: "readAsDataChunk",
      value: function readAsDataChunk() {
        var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var chunk = this.typeArray.slice(this.index, this.index += length);
        return this.constructor.read(chunk.buffer);
      }
    }, {
      key: "readAsUShort",
      value: function readAsUShort() {
        var val = this.view.getUint16(this.index);
        this.index += 2;
        return val;
      }
    }, {
      key: "readAsULong",
      value: function readAsULong() {
        var val = this.view.getUint32(this.index);
        this.index += 4;
        return val;
      } // 指定位置读取指定长度的字符串，但是不移动指针
      // utf16暂不考虑3字节的情况

    }, {
      key: "readAsStringFrom",
      value: function readAsStringFrom(pos, length) {
        var utf16 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        var arr = _toConsumableArray(this.typeArray.slice(pos, pos + length));

        if (utf16) {
          return unescape(arr.map(function (item) {
            return pad0(item.toString(16), 2);
          }).join('').replace(/(\w{4})/g, '%u$1'));
        } else {
          return arr.map(function (item) {
            return String.fromCharCode(item);
          }).join('');
        }
      }
    }, {
      key: "readAsString",
      value: function readAsString(length, utf16) {
        var str = this.readAsStringFrom(this.index, length, utf16);
        this.index += length;
        return str;
      }
    }, {
      key: "seek",
      value: function seek(offset) {
        this.index = offset;
        return this;
      }
    }, {
      key: "skip",
      value: function skip(length) {
        this.index += length;
        return this;
      }
    }, {
      key: "tell",
      value: function tell() {
        return this.index;
      }
    }, {
      key: "length",
      get: function get() {
        return this.typeArray.length;
      }
    }]);

    return DataReader;
  }();

  var TTCReader =
  /*#__PURE__*/
  function () {
    function TTCReader(arrayBuffer) {
      _classCallCheck(this, TTCReader);

      _defineProperty(this, "attrs", []);

      this.reader = DataReader.read(arrayBuffer);
      var headerChunk = this.reader.readAsDataChunk(12); // uNumFonts 即 TTC 文件中含有的 TTF 字体个数

      var uNumFonts = this.readFileHeader(headerChunk);

      for (var i = 0; i < uNumFonts; i++) {
        var baseOffset = this.reader.readAsULong();
        var ttr = new TTFReader(arrayBuffer, baseOffset);
        this.attrs.push(ttr.getAttrs());
      }
    }

    _createClass(TTCReader, [{
      key: "readFileHeader",
      value: function readFileHeader(chunk) {
        var tag = chunk.readAsString(4);

        if (tag === 'ttcf') {
          var uMajorVersion = chunk.readAsUShort();
          var uMinorVersion = chunk.readAsUShort();

          if ((uMajorVersion === 1 || uMajorVersion === 2) && uMinorVersion === 0) {
            var _uNumFonts = chunk.readAsULong();

            return _uNumFonts;
          }
        }

        throw new Error('Not a ttc file');
      }
    }, {
      key: "getAttrs",
      value: function getAttrs() {
        return this.attrs;
      }
    }]);

    return TTCReader;
  }();

  var TTFReader =
  /*#__PURE__*/
  function () {
    function TTFReader(arrayBuffer) {
      var baseOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      _classCallCheck(this, TTFReader);

      _defineProperty(this, "attrsMap", {
        0: 'copyright',
        1: 'fontFamily',
        2: 'fontSubFamily',
        3: 'fontIdentifier',
        4: 'fontName',
        5: 'fontVersion',
        6: 'postscriptName',
        7: 'trademark'
      });

      _defineProperty(this, "attrs", {});

      this.reader = DataReader.read(arrayBuffer);
      this.reader.seek(baseOffset);
      var headerChunk = this.reader.readAsDataChunk(12);
      var uNumOfTables = this.readFileHeader(headerChunk);
      var uOffset = this.findNameTablesOffset(uNumOfTables);
      this.reader.seek(uOffset);
      this.readAttrs();
    }

    _createClass(TTFReader, [{
      key: "readFileHeader",
      value: function readFileHeader(reader) {
        var uMajorVersion = reader.readAsUShort();
        var uMinorVersion = reader.readAsUShort();
        var uNumOfTables = reader.readAsUShort();

        if (uMajorVersion !== 1 || uMinorVersion !== 0) {
          throw new Error('Not a ttf file');
        }

        return uNumOfTables;
      }
    }, {
      key: "findNameTablesOffset",
      value: function findNameTablesOffset(uNumOfTables) {
        var findNameTable = false;
        var chunk;

        for (var i = 0; i < uNumOfTables; i++) {
          // 以16字节为一个单位，循环读取table
          chunk = this.reader.readAsDataChunk(16);
          var str = chunk.readAsString(4); // 直到找到一个table，前四个字节为"name"

          if (str === 'name') {
            findNameTable = true;
            break;
          }
        }

        if (!findNameTable) {
          throw new Error("Can't find name table");
        }

        chunk.skip(4); // 不读取uCheckSum，跳过

        var uOffset = chunk.readAsULong();
        return uOffset;
      }
    }, {
      key: "readAttrs",
      value: function readAttrs() {
        var pos = this.reader.tell();
        this.reader.skip(2); //不读取 uFSelector

        var uNRCount = this.reader.readAsUShort(); // name record count

        var uStorageOffset = this.reader.readAsUShort();
        var recordOffset = pos + uStorageOffset; // 以12字节为单位读取name record

        for (var i = 0; i < uNRCount; i++) {
          var chunk = this.reader.readAsDataChunk(12);
          this.readNameeRecord(chunk, recordOffset);
        }
      }
    }, {
      key: "readNameeRecord",
      value: function readNameeRecord(chunk, recordOffset) {
        chunk.skip(2); // 不读取 跳过uPlatformID

        var uEncodingID = chunk.readAsUShort(); // uEncodingID  0：ASCII编码  1：utf16编码

        chunk.skip(2); // 不读取 跳过uLanguageID

        var uNameID = chunk.readAsUShort();
        var uStringLength = chunk.readAsUShort();
        var uStringOffset = chunk.readAsUShort();

        if (uNameID > 7 || uStringLength <= 0 || uEncodingID === 0) {
          return;
        }

        var strVal = this.reader.readAsStringFrom(recordOffset + uStringOffset, uStringLength, true);

        if (!strVal.trim()) {
          return;
        }

        var attrName = this.attrsMap[uNameID];
        this.setAttr(attrName, strVal);
      }
    }, {
      key: "setAttr",
      value: function setAttr(attrName, attrVal) {
        if (!this.attrs[attrName]) this.attrs[attrName] = attrVal;
      }
    }, {
      key: "getAttrs",
      value: function getAttrs() {
        return this.attrs;
      }
    }]);

    return TTFReader;
  }();

  var index = {
    DataReader: DataReader,
    TTFReader: TTFReader,
    TTCReader: TTCReader
  };

  return index;

}));
