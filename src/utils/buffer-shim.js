// buffer-shim.js
import { Buffer } from 'buffer/';
var buffer = Buffer;
export { buffer as Buffer };

console.log('buffer-shim.js');