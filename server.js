const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// O caminho para a pasta do seu jogo Unity
const GAME_FOLDER_NAME = 'pixeltris';
const gamesDir = path.join(__dirname, 'public', 'games', GAME_FOLDER_NAME);

// Middleware para cabeçalhos essenciais da Unity WebGL
app.use((req, res, next) => {
  if (req.url.endsWith('.wasm')) {
    res.type('application/wasm');
  } else if (req.url.endsWith('.data')) {
    res.type('application/octet-stream');
  } else if (req.url.endsWith('.symbols.json')) {
    res.type('application/octet-stream');
  } else if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve todos os arquivos estáticos do jogo na pasta gamesDir
app.use(express.static(gamesDir));

// Função auxiliar para encontrar o index.html
function findUnityGamePath(gameDir) {
  const findIndexHtml = (dir, depth = 0) => {
    if (depth > 5) return null;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      const indexFile = items.find(item => item.isFile() && item.name.toLowerCase() === 'index.html');
      if (indexFile) {
        const indexPath = path.join(dir, indexFile.name);
        const content = fs.readFileSync(indexPath, 'utf8');
        if (content.includes('UnityLoader') || content.includes('createUnityInstance')) {
          return path.relative(gameDir, indexPath);
        }
      }
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const result = findIndexHtml(path.join(dir, item.name), depth + 1);
          if (result) {
            return path.join(item.name, result).replace(/\\/g, '/');
          }
        }
      }
    } catch (error) {}
    return null;
  };
  return findIndexHtml(gameDir);
}

// Rota raiz para servir o jogo diretamente
app.get('/', (req, res) => {
  try {
    const unityGamePath = findUnityGamePath(gamesDir);
    if (unityGamePath) {
      const fullPath = path.join(gamesDir, unityGamePath);
      console.log(`✅ Servindo jogo na raiz: ${fullPath}`);
      res.sendFile(fullPath);
    } else {
      res.status(404).send('❌ Jogo Unity não encontrado na pasta especificada.');
    }
  } catch (err) {
    console.error('Erro ao servir o jogo:', err.message);
    res.status(500).send('Erro interno do servidor.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Unity WebGL rodando em http://localhost:${PORT}`);
  console.log(`📂 Servindo arquivos de: ${gamesDir}`);
});