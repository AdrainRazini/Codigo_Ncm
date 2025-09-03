const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Caminhos das pastas
const publicPath = path.join(__dirname, 'public');
const dataPath = path.join(__dirname, 'data');

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(publicPath));

// Servir arquivos estáticos da pasta 'data' (acessível via /data)
app.use('/data', express.static(dataPath));

// Rota para o index.html (opcional, já é servido pelo express.static)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
