/* =========================================================
   MISSÕES - Projeto de Redes
   Acompanha requisitos objetivos sem transformar o site em gabarito.
   Verde    = o sistema conseguiu confirmar.
   Vermelho = ainda falta um requisito objetivo.
   Amarelo  = depende de análise do grupo/professor.
   ========================================================= */

(() => {
  if (typeof project === 'undefined') return;

  const STATUS = {
    done: { icon: '🟢', label: 'Concluído' },
    missing: { icon: '🔴', label: 'Faltando' },
    review: { icon: '🟡', label: 'Precisa de análise' }
  };

  let projectLoadWatch = null;

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function criterion(status, title, detail) {
    return { status, title, detail };
  }

  function departmentMatches(name, aliases) {
    const normalized = normalize(name);
    return aliases.some(alias => {
      const normalizedAlias = normalize(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias);
    });
  }

  function requiredDepartments() {
    const departments = Array.isArray(project.departments) ? project.departments : [];

    return {
      administracao: departments.find(dep => departmentMatches(dep.name, [
        'administracao', 'administrativo', 'administrativa', 'adm'
      ])) || null,
      financeiro: departments.find(dep => departmentMatches(dep.name, [
        'financeiro', 'financeira', 'financas', 'fin'
      ])) || null,
      atendimento: departments.find(dep => departmentMatches(dep.name, [
        'atendimento', 'atend'
      ])) || null
    };
  }

  function connectionBetweenTypes(typeA, typeB) {
    const equipment = new Map((Array.isArray(project.equipment) ? project.equipment : []).map(item => [item.id, item]));
    return (Array.isArray(project.connections) ? project.connections : []).some(connection => {
      const from = equipment.get(connection.from);
      const to = equipment.get(connection.to);
      if (!from || !to) return false;
      return (
        (from.type === typeA && to.type === typeB) ||
        (from.type === typeB && to.type === typeA)
      );
    });
  }

  function mission01() {
    const departments = requiredDepartments();
    const requiredList = Object.values(departments).filter(Boolean);
    const requiredIds = new Set(requiredList.map(dep => dep.id));
    const equipment = Array.isArray(project.equipment) ? project.equipment : [];
    const computers = equipment.filter(item => item.type === 'computador');
    const switches = equipment.filter(item => item.type === 'switch');
    const routers = equipment.filter(item => item.type === 'roteador');

    const counts = {
      administracao: departments.administracao
        ? computers.filter(pc => pc.departmentId === departments.administracao.id).length
        : 0,
      financeiro: departments.financeiro
        ? computers.filter(pc => pc.departmentId === departments.financeiro.id).length
        : 0,
      atendimento: departments.atendimento
        ? computers.filter(pc => pc.departmentId === departments.atendimento.id).length
        : 0
    };

    const computersInRequiredDepartments = computers.filter(pc => requiredIds.has(pc.departmentId));
    const configuredComputers = computersInRequiredDepartments.filter(pc =>
      String(pc.name || '').trim() && pc.departmentId && (pc.status || 'ativo') === 'ativo'
    );

    const allRequiredDepartmentsExist = requiredList.length === 3;
    const eachDepartmentHasComputer =
      counts.administracao > 0 && counts.financeiro > 0 && counts.atendimento > 0;

    // A Missão 01 nasceu com 6 computadores e a distribuição 3 / 2 / 1.
    // Depois que a empresa cresce, novos equipamentos não devem fazer uma missão
    // antiga voltar para vermelho. Por isso validamos o mínimo daquela etapa.
    const baseDistributionOk =
      counts.atendimento >= 3 &&
      counts.administracao >= 2 &&
      counts.financeiro >= 1;

    const pcSwitch = connectionBetweenTypes('computador', 'switch');
    const switchRouter = connectionBetweenTypes('switch', 'roteador');

    return {
      id: 'missao-01',
      number: 'MISSÃO 01',
      title: 'Estrutura inicial da rede',
      description: 'Organizar os primeiros setores, equipamentos e conexões da empresa.',
      note: 'Os requisitos são verificados no projeto inteiro. Adicionar novos equipamentos em missões futuras não apaga o que já foi concluído aqui.',
      criteria: [
        criterion(
          allRequiredDepartmentsExist ? 'done' : 'missing',
          '3 departamentos exigidos',
          allRequiredDepartmentsExist
            ? 'Administração, Financeiro e Atendimento foram encontrados.'
            : `Encontrados ${requiredList.length} de 3: Administração, Financeiro e Atendimento.`
        ),
        criterion(
          computers.length >= 6 ? 'done' : 'missing',
          'Pelo menos 6 computadores',
          `${computers.length} computador(es) cadastrado(s) no projeto.`
        ),
        criterion(
          computersInRequiredDepartments.length >= 6 && eachDepartmentHasComputer ? 'done' : 'missing',
          'Computadores distribuídos nos 3 departamentos',
          `Administração: ${counts.administracao} • Financeiro: ${counts.financeiro} • Atendimento: ${counts.atendimento}.`
        ),
        criterion(
          baseDistributionOk ? 'done' : 'missing',
          'Distribuição solicitada entre os setores',
          baseDistributionOk
            ? 'A base da Missão 01 está atendida: pelo menos 3 PCs no Atendimento, 2 na Administração e 1 no Financeiro.'
            : 'Para concluir a base desta missão: Atendimento precisa ter pelo menos 3 PCs, Administração 2 e Financeiro 1.'
        ),
        criterion(
          switches.length >= 1 ? 'done' : 'missing',
          'Pelo menos 1 Switch',
          `${switches.length} Switch(es) encontrado(s).`
        ),
        criterion(
          routers.length >= 1 ? 'done' : 'missing',
          'Pelo menos 1 Roteador',
          `${routers.length} Roteador(es) encontrado(s).`
        ),
        criterion(
          configuredComputers.length >= 6 ? 'done' : 'missing',
          'Configuração básica dos computadores',
          `${configuredComputers.length} computador(es) dos setores da Missão 01 possuem nome, departamento e status Ativo. O mínimo exigido é 6.`
        ),
        criterion(
          pcSwitch && switchRouter ? 'done' : 'missing',
          'Estrutura inicial de conexão da rede',
          pcSwitch && switchRouter
            ? 'Existe ligação PC ↔ Switch e também Switch ↔ Roteador.'
            : `PC ↔ Switch: ${pcSwitch ? 'OK' : 'faltando'} • Switch ↔ Roteador: ${switchRouter ? 'OK' : 'faltando'}.`
        ),
        criterion(
          'review',
          'Organização visual e coerência da topologia',
          'Revisem este item com o professor para verificar se a organização do mapa está coerente e correta.'
        )
      ]
    };
  }

  function lgpdRegistrations() {
    const lgpd = project.company?.lgpd;
    if (!lgpd || typeof lgpd !== 'object') return [];

    if (Array.isArray(lgpd.cadastros)) return lgpd.cadastros;

    // Compatibilidade de leitura com JSONs antigos da primeira versão da LGPD.
    const hasLegacyContent = !!(
      lgpd.cadastro || lgpd.nome || lgpd.finalidade || lgpd.titular ||
      (Array.isArray(lgpd.dados) && lgpd.dados.length) ||
      lgpd.necessidade || lgpd.justificativa
    );

    if (!hasLegacyContent) return [];

    return [{
      nome: lgpd.nome || lgpd.cadastro || 'Cadastro',
      finalidade: lgpd.finalidade || '',
      titular: lgpd.titular || '',
      dados: Array.isArray(lgpd.dados) ? lgpd.dados : [],
      sensiveis: Array.isArray(lgpd.sensiveis) ? lgpd.sensiveis : [],
      necessidade: lgpd.necessidade || '',
      justificativa: lgpd.justificativa || ''
    }];
  }

  function mission02() {
    const registrations = lgpdRegistrations();
    const uniqueNames = new Set(
      registrations
        .map(item => normalize(item?.nome || item?.cadastro))
        .filter(Boolean)
    );

    const withPurpose = registrations.filter(item => String(item?.finalidade || '').trim()).length;
    const withHolder = registrations.filter(item => String(item?.titular || '').trim()).length;
    const withData = registrations.filter(item => Array.isArray(item?.dados) && item.dados.length > 0).length;
    const withNecessity = registrations.filter(item => item?.necessidade === 'sim' || item?.necessidade === 'nao').length;
    const withJustification = registrations.filter(item => String(item?.justificativa || '').trim()).length;

    return {
      id: 'missao-02',
      number: 'MISSÃO 02',
      title: 'LGPD e Dados',
      description: 'Organizar diferentes cadastros de acordo com a finalidade de cada um.',
      criteria: [
        criterion(
          registrations.length >= 4 ? 'done' : 'missing',
          '4 cadastros no total',
          `${registrations.length} de 4 cadastro(s) criado(s).`
        ),
        criterion(
          uniqueNames.size >= 4 ? 'done' : 'missing',
          '4 tipos de cadastro diferentes',
          `${uniqueNames.size} nome(s) de cadastro diferente(s) identificado(s).`
        ),
        criterion(
          withPurpose >= 4 ? 'done' : 'missing',
          'Finalidade definida em cada cadastro',
          `${Math.min(withPurpose, 4)} de 4 cadastro(s) possuem finalidade preenchida.`
        ),
        criterion(
          withHolder >= 4 ? 'done' : 'missing',
          'Titular definido em cada cadastro',
          `${Math.min(withHolder, 4)} de 4 cadastro(s) possuem titular preenchido.`
        ),
        criterion(
          withData >= 4 ? 'done' : 'missing',
          'Dados adicionados aos cadastros',
          `${Math.min(withData, 4)} de 4 cadastro(s) possuem pelo menos um dado definido.`
        ),
        criterion(
          withNecessity >= 4 ? 'done' : 'missing',
          'Análise de necessidade realizada',
          `${Math.min(withNecessity, 4)} de 4 cadastro(s) responderam se os dados são realmente necessários.`
        ),
        criterion(
          withJustification >= 4 ? 'done' : 'missing',
          'Justificativa da análise',
          `${Math.min(withJustification, 4)} de 4 cadastro(s) possuem justificativa.`
        ),
        criterion(
          'review',
          'Adequação dos dados à finalidade',
          'Revisem este item com o professor para verificar se os dados escolhidos fazem sentido para a finalidade informada e se estão corretos.'
        ),
        criterion(
          'review',
          'Classificação de dados sensíveis',
          'Revisem com o professor se a classificação dos dados sensíveis está de acordo com o conteúdo estudado.'
        )
      ]
    };
  }

  function missions() {
    return [mission01(), mission02()];
  }

  function missionStats(mission) {
    const automatic = mission.criteria.filter(item => item.status !== 'review');
    const done = automatic.filter(item => item.status === 'done').length;
    const review = mission.criteria.filter(item => item.status === 'review').length;
    const total = automatic.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, review, percent };
  }

  function overallStats(items) {
    return items.reduce((acc, mission) => {
      const stats = missionStats(mission);
      acc.done += stats.done;
      acc.total += stats.total;
      acc.review += stats.review;
      return acc;
    }, { done: 0, total: 0, review: 0 });
  }

  function injectStructure() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const dashboard = document.querySelector('#dashboard');
    if (!sidebar || !content || !dashboard) return;

    let navButton = sidebar.querySelector('[data-target="missoes"]');
    if (!navButton) {
      navButton = document.createElement('button');
      navButton.className = 'nav-btn';
      navButton.dataset.target = 'missoes';
      navButton.innerHTML = '🎯 Missões';

      const dashboardButton = sidebar.querySelector('[data-target="dashboard"]');
      if (dashboardButton) dashboardButton.insertAdjacentElement('afterend', navButton);
      else sidebar.prepend(navButton);
    }

    let screen = document.querySelector('#missoes');
    if (!screen) {
      screen = document.createElement('section');
      screen.id = 'missoes';
      screen.className = 'screen';
      screen.innerHTML = `
        <div class="section-title">
          <p class="eyebrow">ACOMPANHAMENTO</p>
          <h2>Missões do Projeto</h2>
        </div>

        <div class="panel missions-overview" id="missionsOverview"></div>
        <div class="missions-grid" id="missionsGrid"></div>
      `;

      const firstScreen = content.querySelector('.screen');
      if (firstScreen?.nextSibling) content.insertBefore(screen, firstScreen.nextSibling);
      else content.appendChild(screen);
    }

    if (!document.querySelector('#missionsDashboardCard')) {
      const card = document.createElement('div');
      card.id = 'missionsDashboardCard';
      card.className = 'panel missions-dashboard-card';
      card.innerHTML = `
        <div class="missions-dashboard-head">
          <div class="missions-dashboard-copy">
            <h3>🎯 Progresso das Missões</h3>
            <p>Veja rapidamente o que já foi atendido e o que ainda falta no projeto.</p>
          </div>
          <div class="missions-dashboard-score">
            <strong id="missionsDashboardPercent">0%</strong>
            <small>concluído</small>
          </div>
        </div>
        <div class="missions-progress-track" aria-hidden="true">
          <div id="missionsDashboardFill" class="missions-progress-fill"></div>
        </div>
        <div id="missionsDashboardMeta" class="missions-dashboard-meta"></div>
        <div class="missions-dashboard-actions">
          <button id="btnOpenMissions" class="btn btn-secondary" type="button">Ver detalhes das missões</button>
        </div>
      `;

      const stats = dashboard.querySelector('.stats');
      if (stats) stats.insertAdjacentElement('afterend', card);
      else dashboard.appendChild(card);

      card.querySelector('#btnOpenMissions')?.addEventListener('click', () => {
        document.querySelector('[data-target="missoes"]')?.click();
      });
    }
  }

  function renderRequirement(item) {
    const meta = STATUS[item.status] || STATUS.review;
    return `
      <div class="mission-requirement ${esc(item.status)}">
        <div class="mission-status-icon" aria-label="${esc(meta.label)}">${meta.icon}</div>
        <div>
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.detail)}</p>
        </div>
      </div>
    `;
  }

  function renderMissionCard(mission) {
    const stats = missionStats(mission);
    const finished = stats.done === stats.total;
    const noteHtml = mission.note
      ? `<div class="mission-note"><strong>Importante:</strong> ${esc(mission.note)}</div>`
      : '';

    return `
      <article class="mission-card" data-mission-id="${esc(mission.id)}">
        <div class="mission-card-head">
          <div class="mission-card-title">
            <p class="eyebrow">${esc(mission.number)}</p>
            <h3>${esc(mission.title)}</h3>
            <p>${esc(mission.description)}</p>
          </div>
          <span class="mission-card-badge ${finished ? 'done' : 'progress'}">
            ${finished ? 'Requisitos automáticos concluídos' : 'Em andamento'}
          </span>
        </div>

        <div class="mission-progress-row">
          <div class="mission-progress-copy">
            <strong>${stats.done} de ${stats.total} requisitos</strong>
            <small>${stats.review} item(ns) ficam para análise</small>
          </div>
          <strong>${stats.percent}%</strong>
        </div>

        <div class="mission-progress-track" aria-hidden="true">
          <div class="mission-progress-fill" style="width:${stats.percent}%"></div>
        </div>

        <div class="mission-requirements">
          ${mission.criteria.map(renderRequirement).join('')}
        </div>

        ${noteHtml}
      </article>
    `;
  }

  function verificationTime() {
    try {
      return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function renderMissions() {
    injectStructure();

    const items = missions();
    const overall = overallStats(items);
    const percent = overall.total ? Math.round((overall.done / overall.total) * 100) : 0;
    const missing = Math.max(0, overall.total - overall.done);

    const overview = document.querySelector('#missionsOverview');
    if (overview) {
      overview.innerHTML = `
        <div class="missions-overview-head">
          <div class="missions-overview-copy">
            <h3>Progresso geral</h3>
            <p>O painel verifica os requisitos do projeto atual. Itens que dependem de qualidade e raciocínio continuam para análise com o professor.</p>
          </div>
          <div class="missions-overview-actions">
            <div class="missions-overview-score">
              <strong>${percent}%</strong>
              <small>concluído</small>
            </div>
            <button id="btnAtualizarMissoes" class="btn btn-secondary" type="button">↻ Atualizar progresso</button>
          </div>
        </div>
        <div class="missions-progress-track" aria-hidden="true">
          <div class="missions-progress-fill" style="width:${percent}%"></div>
        </div>
        <div class="missions-overview-meta">
          <span>🟢 ${overall.done} concluído(s)</span>
          <span>🔴 ${missing} faltando</span>
          <span>🟡 ${overall.review} para análise</span>
        </div>
        <div class="missions-refresh-info">
          <span>Última verificação: <strong>${esc(verificationTime())}</strong></span>
          <span>Se acabou de abrir um arquivo JSON e algo não mudou, use <strong>Atualizar progresso</strong>.</span>
        </div>
        <div class="missions-legend" aria-label="Legenda">
          <span class="done">🟢 Concluído</span>
          <span class="missing">🔴 Faltando</span>
          <span class="review">🟡 Precisa de análise</span>
        </div>
      `;

      overview.querySelector('#btnAtualizarMissoes')?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        renderMissions();
      });
    }

    const grid = document.querySelector('#missionsGrid');
    if (grid) grid.innerHTML = items.map(renderMissionCard).join('');

    const dashboardPercent = document.querySelector('#missionsDashboardPercent');
    const dashboardFill = document.querySelector('#missionsDashboardFill');
    const dashboardMeta = document.querySelector('#missionsDashboardMeta');

    if (dashboardPercent) dashboardPercent.textContent = `${percent}%`;
    if (dashboardFill) dashboardFill.style.width = `${percent}%`;
    if (dashboardMeta) {
      dashboardMeta.innerHTML = `
        <span>🟢 ${overall.done} de ${overall.total} requisitos automáticos concluídos</span>
        <span>🔴 ${missing} faltando</span>
        <span>🟡 ${overall.review} para análise</span>
      `;
    }
  }

  function watchProjectFileOpen() {
    const input = document.querySelector('#inputAbrirProjeto');
    if (!input || input.dataset.missionsWatch === '1') return;

    input.dataset.missionsWatch = '1';
    input.addEventListener('change', () => {
      const previousProject = project;
      let checks = 0;

      if (projectLoadWatch) clearInterval(projectLoadWatch);

      projectLoadWatch = setInterval(() => {
        checks += 1;

        if (project !== previousProject || checks >= 30) {
          clearInterval(projectLoadWatch);
          projectLoadWatch = null;
          setTimeout(renderMissions, 0);
        }
      }, 100);
    });
  }

  injectStructure();

  if (typeof renderAll === 'function') {
    const previousRenderAll = renderAll;
    renderAll = function() {
      const result = previousRenderAll();
      renderMissions();
      return result;
    };
  }

  // Atualiza também quando a área de LGPD conclui uma ação própria.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (
      target.closest('#btnSalvarCadastroLGPD') ||
      target.closest('.lgpd-excluir') ||
      target.closest('[data-target="missoes"]')
    ) {
      setTimeout(renderMissions, 50);
    }
  });

  window.addEventListener('focus', () => {
    if (document.querySelector('#missoes')?.classList.contains('active')) {
      renderMissions();
    }
  });

  // Permite que outros módulos do projeto solicitem uma nova verificação no futuro.
  window.atualizarMissoes = renderMissions;

  function start() {
    watchProjectFileOpen();
    renderMissions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();