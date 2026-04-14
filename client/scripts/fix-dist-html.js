import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

try {
  // 1. Encontrar los archivos JS y CSS reales generados
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(f => f.endsWith('.js') && f.startsWith('index-'));
  const cssFile = files.find(f => f.endsWith('.css') && f.startsWith('index-'));

  if (!jsFile) {
    console.error('❌ Error: No se encontró el archivo JS principal en dist/assets');
    process.exit(1);
  }

  console.log(`🔧 Reparando index.html con: JS=${jsFile}, CSS=${cssFile || 'ninguno'}`);

  // 2. Crear un index.html limpio y correcto
  const cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Android Device Manager</title>
    ${cssFile ? `<link rel="stylesheet" crossorigin href="/assets/${cssFile}">` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/${jsFile}"></script>
</body>
</html>`;

  // 3. Sobrescribir el archivo corrupto
  fs.writeFileSync(path.join(distDir, 'index.html'), cleanHtml);
  console.log('✅ dist/index.html reparado con éxito.');

} catch (error) {
  console.error('❌ Error fatal reparando index.html:', error);
  process.exit(1);
}
