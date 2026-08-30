/* =========================================================
   LGPD E DADOS - Projeto de Redes
   Versão 2
   - vários cadastros por empresa
   - respostas escritas pelo próprio grupo
   - dados adicionados um a um
   - edição, exclusão e migração da versão anterior
   ========================================================= */

(() => {
  const LEGACY_CADASTROS = {
    clientes: 'Cadastro de clientes',
    funcionarios: 'Cadastro de funcionários',
    fornecedores: 'Cadastro de fornecedores',
    atendimento: 'Cadastro para atendimento',
    outro: 'Outro tipo de cadastro'
  };

  const LEGACY_TITULARES = {
    cliente: 'Cliente',
    funcionario: 'Funcionário',
    fornecedor: 'Fornecedor',
    tecnico: 'Técnico responsável',
    banco: 'Banco de dados',
    empresa: 'Empresa',
    outro: 'Outro'
  };

  const LEGACY_DADOS = {
    nome: 'Nome completo',
    email: 'E-mail',
    telefone: 'Telefone',
    endereco: 'Endereço',
    cpf: 'CPF',
    data_nascimento: 'Data de nascimento',
    usuario: 'Nome de usuário',
    religiao: 'Religião',
    saude: 'Informação de saúde',
    biometria: 'Biometria',
    opiniao_politica: 'Opinião política',
    estado_civil: 'Estado civil'
  };

  let editandoId = null;
  let rascunhoDados = [];
  let rascunhoSensiveis = new Set();

  function uid(prefixo) {
    return `${prefixo}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function esc(valor) {
    if (typeof escapeHtml === 'function') return escapeHtml(valor);
    return String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function textoLegacy(valor, mapa) {
    return mapa[valor] || String(valor || '').trim();
  }

  function normalizarDado(dado) {
    if (dado && typeof dado === 'object') {
      return {
        id: String(dado.id || uid('dado')),
        texto: String(dado.texto || dado.nome || dado.label || '').trim()
      };
    }

    return { id: uid('dado'), texto: String(dado || '').trim() };
  }

  function normalizarCadastro(cadastro) {
    const dados = Array.isArray(cadastro?.dados)
      ? cadastro.dados.map(normalizarDado).filter(dado => dado.texto)
      : [];

    const idsValidos = new Set(dados.map(dado => dado.id));
    let sensiveis = Array.isArray(cadastro?.sensiveis) ? cadastro.sensiveis.map(String) : [];

    sensiveis = sensiveis.map(valor => {
      if (idsValidos.has(valor)) return valor;
      const encontrado = dados.find(dado => dado.texto.toLowerCase() === valor.toLowerCase());
      return encontrado?.id || '';
    }).filter(Boolean);

    return {
      id: String(cadastro?.id || uid('cadastro')),
      nome: String(cadastro?.nome || cadastro?.cadastro || '').trim(),
      finalidade: String(cadastro?.finalidade || '').trim(),
      titular: String(cadastro?.titular || '').trim(),
      dados,
      sensiveis: [...new Set(sensiveis)],
      necessidade: cadastro?.necessidade === 'sim' || cadastro?.necessidade === 'nao'
        ? cadastro.necessidade
        : '',
      justificativa: String(cadastro?.justificativa || '').trim(),
      atualizadoEm: String(cadastro?.atualizadoEm || '')
    };
  }

  function migrarFormatoAntigo(antigo) {
    const possuiConteudo = antigo && typeof antigo === 'object' && (
      antigo.cadastro || antigo.finalidade || antigo.titular ||
      (Array.isArray(antigo.dados) && antigo.dados.length) ||
      (Array.isArray(antigo.sensiveis) && antigo.sensiveis.length) ||
      antigo.necessidade || antigo.justificativa
    );

    if (!possuiConteudo) return [];

    const mapaDados = new Map();
    const dados = (Array.isArray(antigo.dados) ? antigo.dados : []).map(chave => {
      const chaveTexto = String(chave);
      const dado = {
        id: uid('dado'),
        texto: LEGACY_DADOS[chaveTexto] || chaveTexto
      };
      mapaDados.set(chaveTexto, dado.id);
      return dado;
    });

    const sensiveis = (Array.isArray(antigo.sensiveis) ? antigo.sensiveis : [])
      .map(chave => mapaDados.get(String(chave)))
      .filter(Boolean);

    return [{
      id: uid('cadastro'),
      nome: textoLegacy(antigo.cadastro, LEGACY_CADASTROS) || 'Cadastro migrado',
      finalidade: String(antigo.finalidade || '').trim(),
      titular: textoLegacy(antigo.titular, LEGACY_TITULARES),
      dados,
      sensiveis,
      necessidade: antigo.necessidade === 'sim' || antigo.necessidade === 'nao'
        ? antigo.necessidade
        : '',
      justificativa: String(antigo.justificativa || '').trim(),
      atualizadoEm: String(antigo.atualizadoEm || '')
    }];
  }

  function garantirLGPD() {
    if (!project.company || typeof project.company !== 'object') project.company = {};
    const atual = project.company.lgpd;

    if (atual && typeof atual === 'object' && Array.isArray(atual.cadastros)) {
      project.company.lgpd = {
        version: 2,
        cadastros: atual.cadastros.map(normalizarCadastro)
      };
      return project.company.lgpd;
    }

    project.company.lgpd = {
      version: 2,
      cadastros: migrarFormatoAntigo(atual)
    };
    return project.company.lgpd;
  }

  function injetarEstrutura() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    if (!sidebar || !content) return;

    let botao = document.querySelector('[data-target="lgpd"]');
    if (!botao) {
      botao = document.createElement('button');
      botao.className = 'nav-btn';
      botao.dataset.target = 'lgpd';
      botao.innerHTML = '🔐 LGPD e Dados';

      const btnEmpresa = sidebar.querySelector('[data-target="empresa"]');
      if (btnEmpresa) btnEmpresa.insertAdjacentElement('afterend', botao);
      else sidebar.appendChild(botao);
    }

    let tela = document.querySelector('#lgpd');
    if (!tela) {
      tela = document.createElement('section');
      tela.id = 'lgpd';
      tela.className = 'screen';
      tela.innerHTML = `
        <div class="section-title">
          <p class="eyebrow">PROTEÇÃO DE DADOS</p>
          <h2>LGPD e Dados</h2>
        </div>

        <div class="lgpd-mission">
          <strong>🔐 Cadastro e análise de dados da empresa</strong>
          <p>Criem os cadastros que a empresa precisa. Para cada um, definam sua finalidade, o titular, os dados necessários e façam a análise das informações escolhidas.</p>
        </div>

        <div class="lgpd-layout">
          <div>
            <article class="lgpd-card">
              <div class="lgpd-card-title-row">
                <div>
                  <h3>1. Defina o cadastro</h3>
                  <p>Escrevam as informações de acordo com a realidade da empresa do grupo.</p>
                </div>
                <span id="lgpdModoEdicao" class="lgpd-edit-badge hidden">Editando cadastro</span>
              </div>

              <div class="lgpd-fields">
                <label>
                  Tipo ou nome do cadastro
                  <input id="lgpdCadastroNome" type="text" placeholder="Escrevam o tipo de cadastro" />
                </label>

                <label>
                  Quem vocês consideram o titular?
                  <input id="lgpdTitular" type="text" placeholder="Escrevam quem é o titular" />
                </label>

                <label class="full">
                  Qual é a finalidade desse cadastro?
                  <textarea id="lgpdFinalidade" rows="3" placeholder="Expliquem para que esse cadastro será utilizado"></textarea>
                </label>
              </div>
            </article>

            <article class="lgpd-card">
              <h3>2. Adicione os dados necessários</h3>
              <p>Escrevam os dados que esse cadastro deverá possuir. Adicionem uma informação por vez.</p>

              <div class="lgpd-add-data">
                <input id="lgpdNovoDado" type="text" placeholder="Digite um dado que será coletado" />
                <button id="btnAdicionarDadoLGPD" class="btn btn-secondary" type="button">+ Adicionar dado</button>
              </div>

              <div id="lgpdDadosAdicionados" class="lgpd-added-list"></div>
            </article>

            <article class="lgpd-card">
              <h3>3. Analise os dados escolhidos</h3>
              <p>Os dados adicionados acima aparecerão aqui. Marquem aqueles que o grupo considera sensíveis.</p>

              <div id="lgpdSensiveisLista" class="lgpd-data-grid"></div>

              <div class="lgpd-fields lgpd-analysis-fields">
                <label class="full">
                  Todos os dados escolhidos são realmente necessários para a finalidade?
                  <div class="lgpd-radio-row">
                    <label class="lgpd-radio"><input type="radio" name="lgpdNecessidade" value="sim"> Sim</label>
                    <label class="lgpd-radio"><input type="radio" name="lgpdNecessidade" value="nao"> Não</label>
                  </div>
                </label>

                <label class="full">
                  Justifiquem a decisão do grupo
                  <textarea id="lgpdJustificativa" rows="4" placeholder="Justifiquem a análise realizada pelo grupo"></textarea>
                </label>
              </div>

              <div class="lgpd-save-area">
                <button id="btnSalvarCadastroLGPD" class="btn btn-primary" type="button">💾 Salvar cadastro</button>
                <button id="btnCancelarEdicaoLGPD" class="btn btn-secondary hidden" type="button">Cancelar edição</button>
                <span class="lgpd-save-hint">Depois usem também <strong>Salvar projeto</strong> no topo para baixar o JSON atualizado.</span>
              </div>
            </article>
          </div>

          <aside class="lgpd-summary">
            <div class="lgpd-summary-box">
              <div class="lgpd-summary-head">
                <div>
                  <small>CADASTROS DA EMPRESA</small>
                  <strong id="lgpdResumoEmpresa">Minha Empresa</strong>
                </div>
                <button id="btnNovoCadastroLGPD" class="lgpd-new-btn" type="button">+ Novo</button>
              </div>
              <div id="lgpdCadastrosSalvos" class="lgpd-summary-body"></div>
            </div>
          </aside>
        </div>
      `;
      content.appendChild(tela);
    }

    botao.addEventListener('click', abrirTelaLGPD);
    ligarEventos();
  }

  function abrirTelaLGPD() {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.querySelector('[data-target="lgpd"]')?.classList.add('active');
    document.querySelector('#lgpd')?.classList.add('active');

    garantirLGPD();
    renderListaCadastros();
    if (!editandoId) renderRascunho();
  }

  function ligarEventos() {
    const btnAdicionar = document.querySelector('#btnAdicionarDadoLGPD');
    if (btnAdicionar && !btnAdicionar.dataset.ligado) {
      btnAdicionar.dataset.ligado = '1';
      btnAdicionar.addEventListener('click', adicionarDado);
    }

    const inputNovo = document.querySelector('#lgpdNovoDado');
    if (inputNovo && !inputNovo.dataset.ligado) {
      inputNovo.dataset.ligado = '1';
      inputNovo.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          adicionarDado();
        }
      });
    }

    const btnSalvar = document.querySelector('#btnSalvarCadastroLGPD');
    if (btnSalvar && !btnSalvar.dataset.ligado) {
      btnSalvar.dataset.ligado = '1';
      btnSalvar.addEventListener('click', salvarCadastro);
    }

    const btnCancelar = document.querySelector('#btnCancelarEdicaoLGPD');
    if (btnCancelar && !btnCancelar.dataset.ligado) {
      btnCancelar.dataset.ligado = '1';
      btnCancelar.addEventListener('click', () => novoCadastro());
    }

    const btnNovo = document.querySelector('#btnNovoCadastroLGPD');
    if (btnNovo && !btnNovo.dataset.ligado) {
      btnNovo.dataset.ligado = '1';
      btnNovo.addEventListener('click', () => novoCadastro());
    }
  }

  function adicionarDado() {
    const input = document.querySelector('#lgpdNovoDado');
    const texto = input?.value.trim() || '';
    if (!texto) return alert('Escrevam o dado antes de adicionar.');

    const repetido = rascunhoDados.some(dado => dado.texto.toLowerCase() === texto.toLowerCase());
    if (repetido) return alert('Esse dado já foi adicionado ao cadastro.');

    rascunhoDados.push({ id: uid('dado'), texto });
    if (input) {
      input.value = '';
      input.focus();
    }
    renderRascunho();
  }

  function removerDado(dadoId) {
    rascunhoDados = rascunhoDados.filter(dado => dado.id !== dadoId);
    rascunhoSensiveis.delete(dadoId);
    renderRascunho();
  }

  function renderRascunho() {
    renderDadosAdicionados();
    renderSensiveis();
  }

  function renderDadosAdicionados() {
    const lista = document.querySelector('#lgpdDadosAdicionados');
    if (!lista) return;

    if (!rascunhoDados.length) {
      lista.innerHTML = '<div class="lgpd-sensitive-empty">Nenhum dado foi adicionado ainda.</div>';
      return;
    }

    lista.innerHTML = rascunhoDados.map(dado => `
      <div class="lgpd-added-item">
        <span>${esc(dado.texto)}</span>
        <button type="button" class="lgpd-remove-data" data-id="${esc(dado.id)}" title="Remover dado">✕</button>
      </div>
    `).join('');

    lista.querySelectorAll('.lgpd-remove-data').forEach(botao => {
      botao.addEventListener('click', () => removerDado(botao.dataset.id));
    });
  }

  function renderSensiveis() {
    const lista = document.querySelector('#lgpdSensiveisLista');
    if (!lista) return;

    if (!rascunhoDados.length) {
      lista.innerHTML = '<div class="lgpd-sensitive-empty">Adicionem os dados na etapa 2 para que eles apareçam aqui.</div>';
      return;
    }

    lista.innerHTML = rascunhoDados.map(dado => `
      <label class="lgpd-check">
        <input type="checkbox" class="lgpd-sensivel" value="${esc(dado.id)}" ${rascunhoSensiveis.has(dado.id) ? 'checked' : ''}>
        <span>${esc(dado.texto)}</span>
      </label>
    `).join('');

    lista.querySelectorAll('.lgpd-sensivel').forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) rascunhoSensiveis.add(input.value);
        else rascunhoSensiveis.delete(input.value);
      });
    });
  }

  function obterNecessidade() {
    return document.querySelector('input[name="lgpdNecessidade"]:checked')?.value || '';
  }

  function salvarCadastro() {
    const nome = document.querySelector('#lgpdCadastroNome')?.value.trim() || '';
    const titular = document.querySelector('#lgpdTitular')?.value.trim() || '';
    const finalidade = document.querySelector('#lgpdFinalidade')?.value.trim() || '';
    const justificativa = document.querySelector('#lgpdJustificativa')?.value.trim() || '';
    const necessidade = obterNecessidade();

    if (!nome) return alert('Escrevam o tipo ou nome do cadastro.');
    if (!finalidade) return alert('Expliquem a finalidade desse cadastro.');
    if (!titular) return alert('Escrevam quem o grupo considera o titular.');
    if (!rascunhoDados.length) return alert('Adicionem pelo menos um dado ao cadastro.');
    if (!necessidade) return alert('Respondam se todos os dados escolhidos são realmente necessários.');
    if (!justificativa) return alert('Justifiquem a análise realizada pelo grupo.');

    const lgpd = garantirLGPD();
    const registro = {
      id: editandoId || uid('cadastro'),
      nome,
      finalidade,
      titular,
      dados: rascunhoDados.map(dado => ({ ...dado })),
      sensiveis: [...rascunhoSensiveis].filter(id => rascunhoDados.some(dado => dado.id === id)),
      necessidade,
      justificativa,
      atualizadoEm: new Date().toISOString()
    };

    const indice = lgpd.cadastros.findIndex(item => item.id === editandoId);
    const estavaEditando = indice >= 0;
    if (estavaEditando) lgpd.cadastros[indice] = registro;
    else lgpd.cadastros.push(registro);

    if (typeof addHistory === 'function') {
      addHistory(
        'Segurança',
        estavaEditando
          ? `O cadastro "${nome}" teve sua análise de LGPD atualizada.`
          : `O cadastro "${nome}" foi adicionado à análise de LGPD da empresa.`
      );
    }

    if (typeof renderAll === 'function') renderAll();
    renderListaCadastros();
    novoCadastro(false);
    alert(estavaEditando ? 'Cadastro atualizado com sucesso.' : 'Cadastro salvo com sucesso.');
  }

  function editarCadastro(cadastroId) {
    const cadastro = garantirLGPD().cadastros.find(item => item.id === cadastroId);
    if (!cadastro) return;

    editandoId = cadastro.id;
    rascunhoDados = cadastro.dados.map(dado => ({ ...dado }));
    rascunhoSensiveis = new Set(cadastro.sensiveis);

    document.querySelector('#lgpdCadastroNome').value = cadastro.nome;
    document.querySelector('#lgpdTitular').value = cadastro.titular;
    document.querySelector('#lgpdFinalidade').value = cadastro.finalidade;
    document.querySelector('#lgpdJustificativa').value = cadastro.justificativa;
    document.querySelectorAll('input[name="lgpdNecessidade"]').forEach(radio => {
      radio.checked = radio.value === cadastro.necessidade;
    });

    document.querySelector('#lgpdModoEdicao')?.classList.remove('hidden');
    document.querySelector('#btnCancelarEdicaoLGPD')?.classList.remove('hidden');
    document.querySelector('#btnSalvarCadastroLGPD').textContent = '💾 Atualizar cadastro';

    renderRascunho();
    document.querySelector('#lgpd')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function excluirCadastro(cadastroId) {
    const lgpd = garantirLGPD();
    const cadastro = lgpd.cadastros.find(item => item.id === cadastroId);
    if (!cadastro) return;
    if (!confirm(`Excluir o cadastro "${cadastro.nome}"?`)) return;

    lgpd.cadastros = lgpd.cadastros.filter(item => item.id !== cadastroId);
    if (editandoId === cadastroId) novoCadastro(false);

    if (typeof addHistory === 'function') {
      addHistory('Segurança', `O cadastro "${cadastro.nome}" foi removido da análise de LGPD.`);
    }
    if (typeof renderAll === 'function') renderAll();
    renderListaCadastros();
  }

  function novoCadastro(focar = true) {
    editandoId = null;
    rascunhoDados = [];
    rascunhoSensiveis = new Set();

    const campos = [
      '#lgpdCadastroNome', '#lgpdTitular', '#lgpdFinalidade',
      '#lgpdJustificativa', '#lgpdNovoDado'
    ];
    campos.forEach(seletor => {
      const campo = document.querySelector(seletor);
      if (campo) campo.value = '';
    });

    document.querySelectorAll('input[name="lgpdNecessidade"]').forEach(radio => {
      radio.checked = false;
    });

    document.querySelector('#lgpdModoEdicao')?.classList.add('hidden');
    document.querySelector('#btnCancelarEdicaoLGPD')?.classList.add('hidden');
    const btnSalvar = document.querySelector('#btnSalvarCadastroLGPD');
    if (btnSalvar) btnSalvar.textContent = '💾 Salvar cadastro';

    renderRascunho();
    if (focar) document.querySelector('#lgpdCadastroNome')?.focus();
  }

  function chipsDados(cadastro, apenasSensiveis = false) {
    const idsSensiveis = new Set(cadastro.sensiveis);
    const dados = apenasSensiveis
      ? cadastro.dados.filter(dado => idsSensiveis.has(dado.id))
      : cadastro.dados;

    if (!dados.length) return '<span class="lgpd-empty-text">Nenhum</span>';
    return `<div class="lgpd-chip-list">${dados.map(dado =>
      `<span class="lgpd-chip">${esc(dado.texto)}</span>`
    ).join('')}</div>`;
  }

  function renderListaCadastros() {
    const lgpd = garantirLGPD();
    const lista = document.querySelector('#lgpdCadastrosSalvos');
    const empresa = document.querySelector('#lgpdResumoEmpresa');

    if (empresa) empresa.textContent = project.company.name || 'Minha Empresa';
    if (!lista) return;

    if (!lgpd.cadastros.length) {
      lista.innerHTML = `
        <div class="lgpd-empty-records">
          <strong>Nenhum cadastro salvo.</strong>
          <p>Preencham as etapas ao lado para criar o primeiro cadastro da empresa.</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = lgpd.cadastros.map((cadastro, indice) => `
      <article class="lgpd-record">
        <div class="lgpd-record-top">
          <div>
            <small>CADASTRO ${indice + 1}</small>
            <h4>${esc(cadastro.nome || 'Sem nome')}</h4>
          </div>
          <div class="lgpd-record-actions">
            <button type="button" class="lgpd-mini-btn lgpd-editar" data-id="${esc(cadastro.id)}">Editar</button>
            <button type="button" class="lgpd-mini-btn danger lgpd-excluir" data-id="${esc(cadastro.id)}">Excluir</button>
          </div>
        </div>

        <div class="lgpd-record-field">
          <small>Finalidade</small>
          <p>${esc(cadastro.finalidade || 'Não informada')}</p>
        </div>
        <div class="lgpd-record-field">
          <small>Titular definido pelo grupo</small>
          <p>${esc(cadastro.titular || 'Não informado')}</p>
        </div>
        <div class="lgpd-record-field">
          <small>Dados cadastrados</small>
          ${chipsDados(cadastro)}
        </div>
        <div class="lgpd-record-field">
          <small>Marcados como sensíveis</small>
          ${chipsDados(cadastro, true)}
        </div>
      </article>
    `).join('');

    lista.querySelectorAll('.lgpd-editar').forEach(botao => {
      botao.addEventListener('click', () => editarCadastro(botao.dataset.id));
    });
    lista.querySelectorAll('.lgpd-excluir').forEach(botao => {
      botao.addEventListener('click', () => excluirCadastro(botao.dataset.id));
    });
  }

  function iniciar() {
    injetarEstrutura();
    garantirLGPD();
    renderRascunho();
    renderListaCadastros();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
