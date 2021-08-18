const fs = require('fs');
const uglifyjs = require('uglify-js');

code = fs.readFileSync('minrend.js', 'utf8');
minifiedCode = uglifyjs.minify(code, { mangle: { toplevel: true } }).code;
fs.writeFileSync('minrend_min.js', minifiedCode, 'utf8');
console.log(`Minified size: ${minifiedCode.length}`);