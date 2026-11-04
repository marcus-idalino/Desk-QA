const express = require('express');
const cors = require('cors');
const path = require('path');
const ticketController = require('./ticketController');
const ticketRepository = require('./ticketRepository');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API de Gestão da Qualidade (ISO 9001 / Lean Six Sigma)
app.get('/api/tickets', ticketController.getAllTickets);
app.get('/api/tickets/:id', ticketController.getTicketById);
app.post('/api/tickets', ticketController.createTicket);
app.put('/api/tickets/:id', ticketController.updateTicket);
app.delete('/api/tickets/:id', ticketController.deleteTicket);

// Ferramentas da Qualidade
app.post('/api/tickets/:id/causa-raiz', ticketController.upsertCausaRaiz);
app.post('/api/tickets/:id/plano-5w2h', ticketController.upsertPlano5W2H);
app.get('/api/metrics', ticketController.getMetrics);

// Rota de fallback SPA compatível com Express 5 / Node.js 24+
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização resiliente: se o PostgreSQL falhar na autenticação, o servidor sobe sem travar
async function bootstrap() {
  try {
    await ticketRepository.initDB();
    console.log('✓ PostgreSQL: Conexão validada e tabelas sincronizadas.');
  } catch (err) {
    console.warn('\n[AVISO DE BANCO DE DADOS]');
    console.warn('⚠️ Não foi possível autenticar no PostgreSQL:', err.message);
    console.warn('⚡ O servidor continuará em MODO RESILIENTE (memória/fallback).');
    console.warn('👉 Ajuste a senha no ticketRepository.js quando desejar persistir no banco real.\n');
  }

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Q-Desk Enterprise Server Ativo na Porta: ${PORT}`);
    console.log(`📡 Acesse no seu navegador: http://localhost:${PORT}`);
    console.log('====================================================');
  });
}

bootstrap();