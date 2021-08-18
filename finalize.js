const fs = require('fs');
const { minify } = require('uglify-js');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const gzipSize = require('gzip-size');

let code = fs.readFileSync('minrend.js', 'utf8');
let minifiedCode = minify(code, { mangle: { toplevel: true } }).code;
fs.writeFileSync('minrend_min.js', minifiedCode, 'utf8');

const gzip = createGzip();
let zipSource = fs.createReadStream('minrend_min.js');
let zipDestination = fs.createWriteStream('minrend_min.js.gz');
pipeline(zipSource, gzip, zipDestination, (err) => {
    if (err) {
        console.error('Error writing zip file', err);
        process.exitCode = 1;
    }
});

let gzippedCodeLength = gzipSize.sync(minifiedCode);

console.log(`Original Size: ${code.length}`);
console.log(`Minified Size: ${minifiedCode.length}`);
console.log(`Gzipped Size: ${gzippedCodeLength}`);
console.log(`Bytes Saved: ${code.length - gzippedCodeLength} (${100-Math.round((gzippedCodeLength / code.length) * 100)}%)`);