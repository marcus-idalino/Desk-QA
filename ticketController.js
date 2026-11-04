const ticketRepository = require('./ticketRepository');

async function getAllTickets(req, res) {
  try {
    const tickets = await ticketRepository.findAll();
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao listar tickets de qualidade.' });
  }
}

async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const ticket = await ticketRepository.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket de RNC não encontrado.' });
    }
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao consultar ticket.' });
  }
}

async function createTicket(req, res) {
  try {
    const { titulo, origem, severidade, descricao, custo_prejuizo, status } = req.body;
    if (!titulo || !origem || !severidade || !descricao) {
      return res.status(400).json({ success: false, error: 'Preencha titulo, origem, severidade e descricao.' });
    }
    const newTicket = await ticketRepository.create({
      titulo,
      origem,
      severidade,
      descricao,
      custo_prejuizo: parseFloat(custo_prejuizo) || 0,
      status: status || 'Aberto'
    });
    res.status(201).json({ success: true, data: newTicket });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao criar ticket.' });
  }
}

async function updateTicket(req, res) {
  try {
    const { id } = req.params;
    const { titulo, origem, severidade, descricao, custo_prejuizo, status } = req.body;
    const updated = await ticketRepository.update(id, {
      titulo,
      origem,
      severidade,
      descricao,
      custo_prejuizo: parseFloat(custo_prejuizo) || 0,
      status
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Ticket não localizado.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao atualizar ticket.' });
  }
}

async function deleteTicket(req, res) {
  try {
    const { id } = req.params;
    const deleted = await ticketRepository.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Ticket não localizado.' });
    }
    res.json({ success: true, message: 'Ticket removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao remover ticket.' });
  }
}

async function upsertCausaRaiz(req, res) {
  try {
    const { id } = req.params;
    const { por_que_1, por_que_2, por_que_3, por_que_4, por_que_5, conclusao_causa } = req.body;
    if (!conclusao_causa) {
      return res.status(400).json({ success: false, error: 'A Conclusão da Causa Raiz é obrigatória.' });
    }
    const causa = await ticketRepository.upsertCausaRaiz(id, {
      por_que_1, por_que_2, por_que_3, por_que_4, por_que_5, conclusao_causa
    });
    res.json({ success: true, data: causa });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao registrar 5 Porquês.' });
  }
}

async function upsertPlano5W2H(req, res) {
  try {
    const { id } = req.params;
    const { what, why, where, who, when, how, how_much, status_acao } = req.body;
    if (!what || !why || !who || !how) {
      return res.status(400).json({ success: false, error: 'Preencha What, Why, Who e How.' });
    }
    const plano = await ticketRepository.upsertPlano5W2H(id, {
      what, why, where, who, when, how,
      how_much: parseFloat(how_much) || 0,
      status_acao: status_acao || 'Planejado'
    });
    res.json({ success: true, data: plano });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Falha ao registrar plano 5W2H.' });
  }
}

async function getMetrics(req, res) {
  try {
    const metrics = await ticketRepository.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao gerar métricas.' });
  }
}

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  upsertCausaRaiz,
  upsertPlano5W2H,
  getMetrics
};