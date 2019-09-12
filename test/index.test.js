const { DataReader, TTFReader, TTCReader } = require('../bundle');

var assert = require('assert');

describe('DataReader', function() {
  const buffer = new Uint8Array([...'HelloWorld'].map(item => item.charCodeAt(0))).buffer;
  const reader = DataReader.read(buffer);
  describe('#readAsDataChunk()', function() {
    it('should return a empty typedArray when the param "length" is 0 ', function() {
      assert.equal(reader.readAsDataChunk(0).length, 0);
    });

    it('should return a typedArray whitch length is n when the param "length" is n', function() {
      assert.equal(reader.readAsDataChunk(3).length, 3);
    });
  });
});
