// Собирает прототип в один самодостаточный файл: node proto/dice/build.js → proto/dice/dice-proto.html
const fs = require('fs'), path = require('path');
const d = __dirname, rd = (f) => fs.readFileSync(path.join(d, f), 'utf8');
const scripts = ['lib/three.min.js', 'lib/cannon.js', 'dice.js'].map((f) => `<script>\n${rd(f).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
const html = rd('page.html').replace('<script>', () => scripts + '\n<script>');
fs.writeFileSync(path.join(d, 'dice-proto.html'), html);
console.log('proto/dice/dice-proto.html', (html.length / 1024).toFixed(0) + ' КБ');
