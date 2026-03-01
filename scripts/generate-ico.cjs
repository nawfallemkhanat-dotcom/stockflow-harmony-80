/**
 * Converts assets/icon.png to a valid Windows ICO file (assets/icon.ico)
 * Uses PNG-in-ICO format (supported since Windows Vista)
 */
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '..', 'assets', 'icon.png');
const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('ERROR: assets/icon.png not found. Cannot generate ICO.');
  process.exit(1);
}

const pngData = fs.readFileSync(pngPath);

// Read PNG dimensions from IHDR chunk
const width = pngData.readUInt32BE(16);
const height = pngData.readUInt32BE(20);
console.log(`Source PNG: ${width}x${height}, ${pngData.length} bytes`);

// ICO format: ICONDIR header (6 bytes) + ICONDIRENTRY (16 bytes each) + image data
// We embed the PNG directly (PNG-in-ICO, supported Windows Vista+)
const numImages = 1;
const headerSize = 6;
const entrySize = 16;
const dataOffset = headerSize + entrySize * numImages;

const ico = Buffer.alloc(dataOffset + pngData.length);

// ICONDIR
ico.writeUInt16LE(0, 0);          // reserved
ico.writeUInt16LE(1, 2);          // type: 1 = ICO
ico.writeUInt16LE(numImages, 4);  // number of images

// ICONDIRENTRY
ico.writeUInt8(width >= 256 ? 0 : width, 6);   // width (0 = 256)
ico.writeUInt8(height >= 256 ? 0 : height, 7);  // height (0 = 256)
ico.writeUInt8(0, 8);             // color palette
ico.writeUInt8(0, 9);             // reserved
ico.writeUInt16LE(1, 10);         // color planes
ico.writeUInt16LE(32, 12);        // bits per pixel
ico.writeUInt32LE(pngData.length, 14); // image size
ico.writeUInt32LE(dataOffset, 18);     // offset to image data

// Image data (raw PNG)
pngData.copy(ico, dataOffset);

fs.writeFileSync(icoPath, ico);
console.log(`Generated: assets/icon.ico (${ico.length} bytes)`);
