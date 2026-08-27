/* =========================================================
   LGPD E DADOS - Projeto de Redes
   - cria a nova tela automaticamente
   - salva dentro de project.company.lgpd
   - preserva compatibilidade com projetos antigos
   ========================================================= */

(() => {
  const DADOS = [
    { id: 'nome', label: 'Nome completo' },
    { id: 'email', label: 'E-mail' },
    { id: 'telefone', label: 'Telefone' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'cpf', label: 'CPF' },
    { id: 'data_nascimento', label: 'Data de nascimento' },
    { id: 'usuario', label: 'Nome de usuário' },
    { id: 'religiao', label: 'Religião' },
    { id: 'saude', label: 'Informação de saúde' },
    { id: 'biometria', label: 'Biometria' },
    { id: 'opiniao_politica', label: 'Opinião política' },
    { id: 'estado_civil', label: 'Estado civil' }
  ];

  const PADRAO = {
    cadastro: '',
    finalidade: '',
    titular: '',
    dados: [],
    sensiveis: [],
    necessidade: '',
    justificativa: '',
    atualizadoEm: ''
  };

  function clonePadrao() {
    return JSON.parse(JSON.stringify(PADRAO));
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

  function garantirLGPD() {
    if (!project.company) project.company = {};

    const atual = project.company.lgpd && typeof project.company.lgpd === 'object'
      ? project.company.lgpd
      : {};

    project.company.lgpd = {
      ...clonePadrao(),
      ...atual,
      dados: Array.isArray(atual.dados) ? atual.dados : [],
      sensiveis: Array.isArray(atual.sensiveis) ? atual.sensiveis : []
    };

    return project.company.lgpd;
  }

  function nomeDado(id) {
    return DADOS.find(item => item.id === id)?.label || id;
  }

  function nomeCadastro(valor) {
    const nomes = {
      clientes: 'Cadastro de clientes',
      funcionarios: 'Cadastro de funcionários',
      fornecedores: 'Cadastro de fornecedores',
      atendimento: 'Cadastro para atendimento',
      outro: 'Outro tipo de cadastro'
    };
    return nomes[valor] || 'Não definido';
  }

  function nomeTitular(valor) {
    const nomes = {
      cliente: 'Cliente',
      funcionario: 'Funcionário',
      fornecedor: 'Fornecedor',
      tecnico: 'Técnico responsável',
      banco: 'Banco de dados',
      empresa: 'Empresa',
      outro: 'Outro'
    };
    return nomes[valor] || 'Não definido';
  }

  function injetarEstrutura() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    if (!sidebar || !content || document.querySelector('[data-target="lgpd"]')) return;

    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.target = 'lgpd';
    btn.innerHTML = '🔐 LGPD e Dados';

    const btnEmpresa = sidebar.querySelector('[data-target="empresa"]');
    if (btnEmpresa) btnEmpresa.insertAdjacentElement('afterend', btn);
    else sidebar.appendChild(btn);

    const screen = document.createElement('section');
    screen.id = 'lgpd';
    screen.className = 'screen';
    screen.innerHTML = `
      <div class="section-title">
        <p class="eyebrow">PROTEÇÃO DE DADOS</p>
        <h2>LGPD e Dados</h2>
      </div>

      <div class="lgpd-mission">
        <strong>🔐 Missão — O cadastro da empresa</strong>
        <p>A empresa de vocês precisa criar um cadastro. Definam sua finalidade, identifiquem quem é o titular, escolham os dados que realmente precisam e analisem quais informações exigem maior cuidado.</p>
      </div>

      <div class="lgpd-intro">
        <article class="lgpd-concept">
          <span>👤</span>
          <strong>Titular</strong>
          <p>É a pessoa a quem os dados se referem.</p>
        </article>
        <article class="lgpd-concept">
          <span>🛡️</span>
          <strong>Dado sensível</strong>
          <p>É uma informação que exige proteção e cuidado maiores.</p>
        </article>
        <article class="lgpd-concept">
          <span>🎯</span>
          <strong>Necessidade</strong>
          <p>A empresa deve coletar somente os dados necessários para a finalidade escolhida.</p>
        </article>
      </div>

      <div class="lgpd-layout">
        <div>
          <article class="lgpd-card">
            <h3>1. Defina o cadastro</h3>
            <p>Pensem em uma necessidade real da empresa do grupo.</p>

            <div class="lgpd-fields">
              <label>
                Tipo de cadastro
                <select id="lgpdCadastro">
                  <option value="">Selecione...</option>
                  <option value="clientes">Cadastro de clientes</option>
                  <option value="funcionarios">Cadastro de funcionários</option>
                  <option value="fornecedores">Cadastro de fornecedores</option>
                  <option value="atendimento">Cadastro para atendimento</option>
                  <option value="outro">Outro tipo de cadastro</option>
                </select>
              </label>

              <label>
                Quem vocês consideram o titular?
                <select id="lgpdTitular">
                  <option value="">Selecione...</option>
                  <option value="cliente">Cliente</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="tecnico">Técnico responsável</option>
                  <option value="banco">Banco de dados</option>
                  <option value="empresa">Empresa</option>
                  <option value="outro">Outro</option>
                </select>
              </label>

              <label class="full">
                Qual é a finalidade desse cadastro?
                <textarea id="lgpdFinalidade" rows="3" placeholder="Ex.: Explique para que a empresa precisa realizar esse cadastro."></textarea>
              </label>
            </div>
          </article>

          <article class="lgpd-card">
            <h3>2. Escolha os dados</h3>
            <p>Selecionem somente as informações que o grupo considera necessárias para cumprir a finalidade definida acima.</p>
            <div id="lgpdDadosLista" class="lgpd-data-grid"></div>
          </article>

          <article class="lgpd-card">
            <h3>3. Analise os dados escolhidos</h3>
            <p>Entre as informações selecionadas, indiquem quais vocês consideram dados sensíveis. O sistema não vai indicar a resposta: a decisão deve ser feita pelo grupo.</p>

            <div id="lgpdSensiveisLista" class="lgpd-data-grid"></div>

            <div class="lgpd-fields" style="margin-top:16px">
              <label class="full">
                Todos os dados escolhidos são realmente necessários para a finalidade?
                <div class="lgpd-radio-row">
                  <label class="lgpd-radio"><input type="radio" name="lgpdNecessidade" value="sim"> Sim</label>
                  <label class="lgpd-radio"><input type="radio" name="lgpdNecessidade" value="nao"> Não</label>
                </div>
              </label>

              <label class="full">
                Justifiquem a decisão do grupo
                <textarea id="lgpdJustificativa" rows="4" placeholder="Expliquem por que esses dados são necessários e por que algum deles exige cuidado maior."></textarea>
              </label>
            </div>

            <div class="lgpd-save-area">
              <button id="btnSalvarLGPD" class="btn btn-primary" type="button">💾 Salvar análise LGPD</button>
              <span class="lgpd-save-hint">Depois use também <strong>Salvar projeto</strong> no topo para baixar o JSON atualizado do grupo.</span>
            </div>
          </article>
        </div>

        <aside class="lgpd-summary">
          <div class="lgpd-summary-box">
            <div class="lgpd-summary-head">
              <small>RESUMO DA DECISÃO</small>
              <strong id="lgpdResumoEmpresa">Minha Empresa</strong>
            </div>
            <div id="lgpdResumoCorpo" class="lgpd-summary-body"></div>
          </div>
        </aside>
      </div>
    `;

    content.appendChild(screen);
  }

  function renderDados() {
    const lista = document.querySelector('#lgpdDadosLista');
    if (!lista) return;

    const salvo = garantirLGPD();
    lista.innerHTML = DADOS.map(item => `
      <label class="lgpd-check">
        <input type="checkbox" class="lgpd-dado" value="${esc(item.id)}" ${salvo.dados.includes(item.id) ? 'checked' : ''}>
        <span>${esc(item.label)}</span>
      </label>
    `).join('');
  }

  function dadosMarcados() {
    return [...document.querySelectorAll('.lgpd-dado:checked')].map(el => el.value);
  }

  function sensiveisMarcados() {
    return [...document.querySelectorAll('.lgpd-sensivel:checked')].map(el => el.value);
  }

  function renderSensiveis(preferidos = null) {
    const lista = document.querySelector('#lgpdSensiveisLista');
    if (!lista) return;

    const selecionados = dadosMarcados();
    const manter = Array.isArray(preferidos) ? preferidos : sensiveisMarcados();

    if (!selecionados.length) {
      lista.innerHTML = '<div class="lgpd-sensitive-empty">Primeiro escolham os dados que a empresa pretende coletar. Depois eles aparecerão aqui para a análise do grupo.</div>';
      return;
    }

    lista.innerHTML = selecionados.map(id => `
      <label class="lgpd-check">
        <input type="checkbox" class="lgpd-sensivel" value="${esc(id)}" ${manter.includes(id) ? 'checked' : ''}>
        <span>${esc(nomeDado(id))}</span>
      </label>
    `).join('');
  }

  function preencherFormulario() {
    const lgpd = garantirLGPD();

    const cadastro = document.querySelector('#lgpdCadastro');
    const titular = document.querySelector('#lgpdTitular');
    const finalidade = document.querySelector('#lgpdFinalidade');
    const justificativa = document.querySelector('#lgpdJustificativa');

    if (cadastro) cadastro.value = lgpd.cadastro || '';
    if (titular) titular.value = lgpd.titular || '';
    if (finalidade) finalidade.value = lgpd.finalidade || '';
    if (justificativa) justificativa.value = lgpd.justificativa || '';

    document.querySelectorAll('input[name="lgpdNecessidade"]').forEach(radio => {
      radio.checked = radio.value === lgpd.necessidade;
    });

    renderDados();
    renderSensiveis(lgpd.sensiveis);
  }

  function chips(ids) {
    if (!ids.length) return '<span style="color:#64748b;font-size:12px">Nenhum selecionado</span>';
    return `<div class="lgpd-chip-list">${ids.map(id => `<span class="lgpd-chip">${esc(nomeDado(id))}</span>`).join('')}</div>`;
  }

  function renderResumo() {
    const lgpd = garantirLGPD();
    const empresa = project.company.name || 'Minha Empresa';
    const titulo = document.querySelector('#lgpdResumoEmpresa');
    const corpo = document.querySelector('#lgpdResumoCorpo');

    if (titulo) titulo.textContent = empresa;
    if (!corpo) return;

    const temAnalise = lgpd.cadastro || lgpd.finalidade || lgpd.titular || lgpd.dados.length || lgpd.justificativa;

    if (!temAnalise) {
      corpo.innerHTML = `
        <div class="lgpd-summary-item">
          <p style="color:#64748b">A análise ainda não foi salva. Preencham a missão ao lado e registrem a decisão do grupo.</p>
        </div>
      `;
      return;
    }

    corpo.innerHTML = `
      <div class="lgpd-summary-item">
        <small>Cadastro</small>
        <strong>${esc(nomeCadastro(lgpd.cadastro))}</strong>
      </div>
      <div class="lgpd-summary-item">
        <small>Finalidade</small>
        <p>${esc(lgpd.finalidade || 'Não informada')}</p>
      </div>
      <div class="lgpd-summary-item">
        <small>Titular definido pelo grupo</small>
        <strong>${esc(nomeTitular(lgpd.titular))}</strong>
      </div>
      <div class="lgpd-summary-item">
        <small>Dados que serão coletados</small>
        ${chips(lgpd.dados)}
      </div>
      <div class="lgpd-summary-item">
        <small>Dados considerados sensíveis pelo grupo</small>
        ${chips(lgpd.sensiveis)}
      </div>
      <div class="lgpd-summary-item">
        <small>Princípio da necessidade</small>
        <strong>${lgpd.necessidade === 'sim' ? 'O grupo considera todos necessários' : lgpd.necessidade === 'nao' ? 'O grupo identificou dados desnecessários' : 'Não analisado'}</strong>
      </div>
      <div class="lgpd-summary-item">
        <small>Justificativa</small>
        <p>${esc(lgpd.justificativa || 'Não informada')}</p>
      </div>
    `;
  }

  function salvarLGPD() {
    const cadastro = document.querySelector('#lgpdCadastro')?.value || '';
    const titular = document.querySelector('#lgpdTitular')?.value || '';
    const finalidade = document.querySelector('#lgpdFinalidade')?.value.trim() || '';
    const justificativa = document.querySelector('#lgpdJustificativa')?.value.trim() || '';
    const necessidade = document.querySelector('input[name="lgpdNecessidade"]:checked')?.value || '';
    const dados = dadosMarcados();
    const sensiveis = sensiveisMarcados().filter(id => dados.includes(id));

    if (!cadastro) return alert('Escolham o tipo de cadastro da empresa.');
    if (!finalidade) return alert('Expliquem a finalidade do cadastro.');
    if (!titular) return alert('Definam quem o grupo considera o titular dos dados.');
    if (!dados.length) return alert('Escolham pelo menos um dado para o cadastro.');
    if (!necessidade) return alert('Respondam se todos os dados escolhidos são realmente necessários.');
    if (!justificativa) return alert('Escrevam uma justificativa para a decisão do grupo.');

    project.company.lgpd = {
      cadastro,
      finalidade,
      titular,
      dados,
      sensiveis,
      necessidade,
      justificativa,
      atualizadoEm: typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10)
    };

    if (typeof addHistory === 'function') {
      addHistory('Segurança', 'A equipe definiu a coleta e a análise de dados pessoais da empresa com base na LGPD.');
    }

    if (typeof renderAll === 'function') renderAll();
    else renderLGPD();

    alert('Análise LGPD salva no projeto. Agora use “Salvar projeto” no topo para baixar o JSON atualizado.');
  }

  function configurarEventos() {
    const listaDados = document.querySelector('#lgpdDadosLista');
    listaDados?.addEventListener('change', event => {
      if (!event.target.classList.contains('lgpd-dado')) return;
      const anteriores = sensiveisMarcados();
      renderSensiveis(anteriores);
    });

    document.querySelector('#btnSalvarLGPD')?.addEventListener('click', salvarLGPD);
  }

  function renderLGPD() {
    if (!document.querySelector('#lgpd')) return;
    preencherFormulario();
    renderResumo();
  }

  injetarEstrutura();

  if (typeof renderAll === 'function') {
    const renderAllOriginal = renderAll;
    renderAll = function () {
      renderAllOriginal();
      renderLGPD();
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    renderLGPD();
  });
})();
