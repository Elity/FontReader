# FontReader

read font information from ttf/ttc file for browser

## Usage

with es6

```javascript
import { TTFReader, TTCReader } from './bundle';
// for ttf file
new TTFReader(buffer).getAttrs();
// for ttc file
new TTCReader(buffer).getAttrs();
```

with script tag

```html
<script src="./bundle.js"></script>
<script>
  // for ttf file
  new FontReader.TTFReader(buffer).getAttrs();
  // for ttc file
  new FontReader.TTCReader(buffer).getAttrs();
</script>
```
