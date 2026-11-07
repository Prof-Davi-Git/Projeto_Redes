/* =========================================================
   APRESENTAÇÃO DO PROJETO DE REDES
   - Monta slides automaticamente com os dados reais do projeto
   - Usa os mapas dos andares nas mesmas posições cadastradas
   - O grupo completa apenas o roteiro de fala
   - Modo apresentação em tela cheia
   ========================================================= */

(() => {
  if (typeof project === 'undefined') return;

  const E = selector => document.querySelector(selector);

  const esc = value => typeof escapeHtml === 'function'
    ? escapeHtml(value)
    : String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const ICONS = {
    computador: '💻',
    notebook: '💼',
    switch: '🔌',
    roteador: '🌐',
    servidor: '🗄️',
    impressora: '🖨️',
    'access-point': '📶'
  };

  const TYPE_NAMES = {
    computador: 'Computadores',
    notebook: 'Notebooks',
    switch: 'Switches',
    roteador: 'Roteadores',
    servidor: 'Servidores',
    impressora: 'Impressoras',
    'access-point': 'Access Points'
  };

  const THEMES = [
    {
      id: 'tech-blue',
      name: 'Azul Tecnológico',
      description: 'Azul profundo com círculos tecnológicos.',
      swatches: ['#08111f', '#2563eb', '#22d3ee']
    },
    {
      id: 'matrix-green',
      name: 'Verde Matrix',
      description: 'Verde claro com grade e blocos digitais.',
      swatches: ['#ecfdf5', '#15803d', '#86efac']
    },
    {
      id: 'neon-violet',
      name: 'Roxo Neon',
      description: 'Lilás vibrante com formas flutuantes.',
      swatches: ['#f5f3ff', '#7c3aed', '#f472b6']
    },
    {
      id: 'corporate-light',
      name: 'Claro Corporativo',
      description: 'Branco, azul e faixas corporativas.',
      swatches: ['#f8fafc', '#1d4ed8', '#f59e0b']
    },
    {
      id: 'infra-red',
      name: 'Vermelho Infra',
      description: 'Cinza claro com vermelho e formas industriais.',
      swatches: ['#f8fafc', '#dc2626', '#111827']
    }
  ];

  const NOTE_PROMPTS = {
    capa: [
      'Apresentem o nome da empresa e os integrantes.',
      'Expliquem em uma frase qual foi o objetivo do projeto.'
    ],
    empresa: [
      'O que a empresa faz?',
      'Quais setores foram necessários para ela funcionar?',
      'Por que uma rede organizada é importante para essa empresa?'
    ],
    infraestrutura: [
      'Como vocês distribuíram os equipamentos?',
      'Qual equipamento tem papel central na rede?',
      'O que mudou quando a empresa cresceu?'
    ],
    enderecamento: [
      'Como vocês escolheram os IPs e prefixos?',
      'Por que os equipamentos não podem repetir IP?',
      'Qual é a função do endereço MAC?'
    ],
    seguranca: [
      'Quais cuidados de segurança foram considerados?',
      'Como a LGPD influenciou as decisões da empresa?',
      'Que tipo de dado merece mais atenção?'
    ],
    nuvem: [
      'Quais recursos foram colocados na nuvem?',
      'Como vocês aplicaram permissões, TLS e backup?',
      'Como a empresa se recuperaria de um problema?'
    ],
    sdn: [
      'Qual switch ficou sob controle do SDN?',
      'Que rede virtual foi criada?',
      'O que as regras permitiram ou bloquearam e por quê?'
    ],
    expansao: [
      'O que foi acrescentado na expansão da empresa?',
      'Como os novos setores e equipamentos foram distribuídos?',
      'Que cuidado foi necessário para manter a rede organizada?'
    ],
    conclusao: [
      'O que o grupo aprendeu construindo essa empresa?',
      'Qual decisão de rede vocês consideram mais importante?',
      'O que vocês melhorariam em uma próxima versão?'
    ]
  };

  let currentIndex = 0;
  let slides = [];
  let draftNotes = {};
  let draftThemeId = 'tech-blue';
  let draftLogoDataUrl = '';
  let draftLogoFileName = '';
  let dirty = false;
  let loadWatch = null;

  function ensurePresentationData() {
    if (!project.company || typeof project.company !== 'object') project.company = {};

    const old = project.company.presentation && typeof project.company.presentation === 'object'
      ? project.company.presentation
      : {};

    const themeId = THEMES.some(theme => theme.id === old.themeId)
      ? old.themeId
      : 'tech-blue';

    project.company.presentation = {
      version: 2,
      notes: old.notes && typeof old.notes === 'object' ? old.notes : {},
      themeId,
      logoDataUrl: typeof old.logoDataUrl === 'string' ? old.logoDataUrl : '',
      logoFileName: typeof old.logoFileName === 'string' ? old.logoFileName : '',
      updatedAt: String(old.updatedAt || '')
    };

    return project.company.presentation;
  }

  function getFloors() {
    const building = project.company?.building;
    if (Array.isArray(building?.floors) && building.floors.length) return building.floors;
    return [{ id: 'floor_terreo', name: 'Térreo' }];
  }

  function floorIdFor(item, floors) {
    const ids = new Set(floors.map(floor => floor.id));
    return ids.has(item.floorId) ? item.floorId : floors[0].id;
  }

  function equipmentForFloor(floorId, floors) {
    return (project.equipment || []).filter(item => floorIdFor(item, floors) === floorId);
  }

  function connectionsForFloor(floorId, floors) {
    const ids = new Set(equipmentForFloor(floorId, floors).map(item => item.id));
    return (project.connections || []).filter(c => ids.has(c.from) && ids.has(c.to));
  }

  function equipmentName(id) {
    return (project.equipment || []).find(item => item.id === id)?.name || 'Equipamento';
  }

  function departmentName(id) {
    return (project.departments || []).find(dep => dep.id === id)?.name || 'Sem departamento';
  }

  function countType(type) {
    return (project.equipment || []).filter(item => item.type === type).length;
  }

  function summarizeLgpd() {
    const lgpd = project.company?.lgpd || {};
    const registrations = Array.isArray(lgpd.cadastros)
      ? lgpd.cadastros
      : [];

    const sensitiveCount = registrations.filter(item =>
      Array.isArray(item?.sensiveis) && item.sensiveis.length
    ).length;

    return {
      count: registrations.length,
      sensitiveCount,
      examples: registrations.slice(0, 3).map(item => item.nome || item.cadastro || 'Cadastro')
    };
  }

  function summarizeCloud() {
    const cloud = project.company?.cloudContinuity || {};
    const resources = Array.isArray(cloud.resources) ? cloud.resources : [];
    const backup = cloud.backup && typeof cloud.backup === 'object' ? cloud.backup : {};
    const incidents = Array.isArray(cloud.incidents) ? cloud.incidents : [];

    return {
      resources,
      backup,
      incidents
    };
  }

  function summarizeSdn() {
    const sdn = project.company?.sdn || {};
    const controller = sdn.controller || {};
    const switchId = Array.isArray(controller.switchIds) ? controller.switchIds[0] : '';
    const vnet = Array.isArray(sdn.virtualNetworks) ? sdn.virtualNetworks[0] : null;
    const rules = Array.isArray(sdn.rules) ? sdn.rules.slice(0, 2) : [];
    const simulations = Array.isArray(sdn.simulations) ? sdn.simulations : [];

    return {
      active: controller.active === true,
      switchName: switchId ? equipmentName(switchId) : 'Não definido',
      vnet,
      rules,
      simulations
    };
  }

  function statCard(icon, value, label) {
    return `
      <div class="ap-stat">
        <span>${icon}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(label)}</small>
      </div>
    `;
  }

  function chip(text) {
    return `<span class="ap-chip">${esc(text)}</span>`;
  }

  function emptyValue(text = 'Aguardando preenchimento no projeto') {
    return `<span class="ap-empty">${esc(text)}</span>`;
  }

  function slideShell({ eyebrow, title, subtitle = '', body, number, className = '' }) {
    return `
      <article class="ap-slide theme-${esc(draftThemeId)} ${className}">
        <div class="ap-theme-art" aria-hidden="true">
          <i class="shape-a"></i>
          <i class="shape-b"></i>
          <i class="shape-c"></i>
          <i class="shape-d"></i>
          <i class="shape-e"></i>
        </div>
        <div class="ap-slide-top">
          <div class="ap-brand">
            <span class="ap-brand-mark">R</span>
            <span>PROJETO DE REDES <b>• ENSINO TÉCNICO</b></span>
          </div>
          <span class="ap-slide-number">${String(number).padStart(2, '0')}</span>
        </div>

        <div class="ap-slide-heading">
          <small>${esc(eyebrow)}</small>
          <h2>${esc(title)}</h2>
          ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
        </div>

        <div class="ap-slide-body">
          ${body}
        </div>
      </article>
    `;
  }

  function mapPreview(floor, floorIndex) {
    const floors = getFloors();
    const equipment = equipmentForFloor(floor.id, floors);
    const connections = connectionsForFloor(floor.id, floors);
    const view = project.company?.building?.floorViews?.[floor.id] || project.mapView || {};
    const width = Math.max(900, Number(view.width) || 1400);
    const height = Math.max(600, Number(view.height) || 900);
    const itemMap = new Map(equipment.map(item => [item.id, item]));

    const lines = connections.map(c => {
      const a = itemMap.get(c.from);
      const b = itemMap.get(c.to);
      if (!a || !b) return '';

      const ax = (Number(a.x) || 0) + 60;
      const ay = (Number(a.y) || 0) + 45;
      const bx = (Number(b.x) || 0) + 60;
      const by = (Number(b.y) || 0) + 45;

      return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" />`;
    }).join('');

    const nodes = equipment.map(item => {
      const x = Number(item.x) || 0;
      const y = Number(item.y) || 0;
      const label = String(item.name || TYPE_NAMES[item.type] || item.type).slice(0, 18);
      const dep = String(departmentName(item.departmentId)).slice(0, 16);

      return `
        <g class="ap-map-node" transform="translate(${x} ${y})">
          <rect width="120" height="90" rx="12"></rect>
          <text class="ap-map-icon" x="60" y="35" text-anchor="middle">${ICONS[item.type] || '🔧'}</text>
          <text class="ap-map-name" x="60" y="58" text-anchor="middle">${esc(label)}</text>
          <text class="ap-map-dep" x="60" y="75" text-anchor="middle">${esc(dep)}</text>
        </g>
      `;
    }).join('');

    return `
      <div class="ap-map-frame">
        <div class="ap-map-head">
          <div>
            <strong>${esc(floor.name || 'Andar')}</strong>
            <span>${equipment.length} equipamentos • ${connections.length} conexões</span>
          </div>
          <span>Mapa ${floorIndex + 1}</span>
        </div>

        <svg
          class="ap-map"
          viewBox="0 0 ${width} ${height}"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Mapa da rede do andar ${esc(floor.name || 'Andar')}"
        >
          <rect class="ap-map-bg" width="${width}" height="${height}" rx="24"></rect>
          <g class="ap-map-grid">
            ${Array.from({ length: Math.floor(width / 100) + 1 }, (_, i) =>
              `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${height}" />`
            ).join('')}
            ${Array.from({ length: Math.floor(height / 100) + 1 }, (_, i) =>
              `<line x1="0" y1="${i * 100}" x2="${width}" y2="${i * 100}" />`
            ).join('')}
          </g>
          <g class="ap-map-lines">${lines}</g>
          ${nodes}
        </svg>
      </div>
    `;
  }

  function buildSlides() {
    const floors = getFloors();
    const company = project.company || {};
    const departments = project.departments || [];
    const equipment = project.equipment || [];
    const connections = project.connections || [];
    const lgpd = summarizeLgpd();
    const cloud = summarizeCloud();
    const sdn = summarizeSdn();

    const configuredIp = equipment.filter(item =>
      String(item.ip || '').trim() &&
      String(item.prefix || '').trim() &&
      String(item.mac || '').trim()
    );

    const slidesOut = [];

    slidesOut.push({
      key: 'capa',
      title: 'Capa',
      prompts: NOTE_PROMPTS.capa,
      html: slideShell({
        eyebrow: 'APRESENTAÇÃO FINAL',
        title: company.name || 'Minha Empresa',
        subtitle: 'Projeto Integrador de Redes de Computadores',
        number: 1,
        className: 'ap-cover',
        body: `
          <div class="ap-cover-logo-layout">
            <div class="ap-cover-logo-stage ${draftLogoDataUrl ? 'has-logo' : ''}">
              ${draftLogoDataUrl
                ? `<img src="${draftLogoDataUrl}" alt="Logo da empresa" />`
                : `
                  <div class="ap-cover-logo-placeholder">
                    <span>LOGO</span>
                    <strong>Importe o logo da empresa</strong>
                    <small>PNG sem fundo</small>
                  </div>
                `
              }
            </div>

            <div class="ap-cover-footer ap-cover-footer-presenters">
              <div class="ap-presenters">
                <small>APRESENTADORES</small>
                <strong>${esc(company.members || 'Integrantes não informados')}</strong>
              </div>
              <span>Infraestrutura • Segurança • Nuvem • SDN</span>
            </div>
          </div>
        `
      })
    });

    slidesOut.push({
      key: 'empresa',
      title: 'A empresa',
      prompts: NOTE_PROMPTS.empresa,
      html: slideShell({
        eyebrow: '01 • CONTEXTO',
        title: 'Conheça nossa empresa',
        subtitle: 'A rede foi planejada para atender a estrutura e as necessidades desta organização.',
        number: 2,
        className: 'ap-company-slide',
        body: `
          <div class="ap-two-col ap-company-main">
            <div class="ap-highlight-panel ap-company-description">
              <small>O QUE A EMPRESA FAZ</small>
              <p>${esc(company.description || 'A descrição da empresa será apresentada pelo grupo.')}</p>
            </div>

            <div class="ap-panel ap-departments-panel">
              <small>DEPARTAMENTOS</small>
              <div class="ap-department-grid count-${Math.min(Math.max(departments.length, 1), 8)}">
                ${departments.length
                  ? departments.map((dep, index) => `
                      <div class="ap-department-card">
                        <span>${String(index + 1).padStart(2, '0')}</span>
                        <strong>${esc(dep.name)}</strong>
                      </div>
                    `).join('')
                  : `<div class="ap-department-empty">${emptyValue('Nenhum departamento cadastrado')}</div>`}
              </div>
            </div>
          </div>

          <div class="ap-stats-row">
            ${statCard('🏬', floors.length, 'andares')}
            ${statCard('🗂️', departments.length, 'departamentos')}
            ${statCard('💻', equipment.length, 'equipamentos')}
            ${statCard('🔗', connections.length, 'conexões')}
          </div>
        `
      })
    });

    slidesOut.push({
      key: 'infraestrutura',
      title: 'Estrutura da rede',
      prompts: NOTE_PROMPTS.infraestrutura,
      html: slideShell({
        eyebrow: '02 • INFRAESTRUTURA',
        title: 'Como nossa rede foi montada',
        subtitle: 'Os equipamentos foram escolhidos e distribuídos de acordo com a necessidade da empresa.',
        number: 3,
        className: 'ap-infrastructure-slide',
        body: `
          <div class="ap-equipment-grid">
            ${Object.keys(TYPE_NAMES).map(type => {
              const count = countType(type);
              return `
                <div class="ap-equipment-card ${count ? '' : 'muted'}">
                  <span>${ICONS[type]}</span>
                  <strong>${count}</strong>
                  <small>${TYPE_NAMES[type]}</small>
                </div>
              `;
            }).join('')}
          </div>

          <div class="ap-callout">
            <span>💡</span>
            <div>
              <strong>O que mostrar ao público</strong>
              <p>Explique por que cada equipamento foi necessário e como os setores foram conectados.</p>
            </div>
          </div>
        `
      })
    });

    floors.forEach((floor, floorIndex) => {
      const floorEquipment = equipmentForFloor(floor.id, floors);
      const floorDepartments = [...new Set(
        floorEquipment
          .map(item => item.departmentId)
          .filter(Boolean)
          .map(departmentName)
      )];

      slidesOut.push({
        key: `mapa-${floor.id}`,
        title: `Mapa — ${floor.name || 'Andar'}`,
        prompts: [
          `Apresentem o mapa do ${floor.name || 'andar'}.`,
          'Mostrem os principais equipamentos e conexões.',
          'Expliquem como os setores foram distribuídos neste andar.'
        ],
        html: slideShell({
          eyebrow: `03 • MAPA DA REDE • ${String(floorIndex + 1).padStart(2, '0')}`,
          title: floor.name || 'Mapa da Rede',
          subtitle: 'Esta visualização usa as posições e conexões cadastradas no próprio Mapa da Rede.',
          number: slidesOut.length + 1,
          className: 'ap-map-slide',
          body: `
            <div class="ap-map-layout">
              ${mapPreview(floor, floorIndex)}
              <div class="ap-map-side">
                <div class="ap-mini-stat"><b>${floorEquipment.length}</b><span>equipamentos</span></div>
                <div class="ap-mini-stat"><b>${connectionsForFloor(floor.id, floors).length}</b><span>conexões</span></div>
                <div class="ap-map-departments">
                  <small>SETORES NESTE ANDAR</small>
                  ${floorDepartments.length
                    ? floorDepartments.map(name => chip(name)).join('')
                    : emptyValue('Sem setores definidos')}
                </div>
              </div>
            </div>
          `
        })
      });
    });

    slidesOut.push({
      key: 'enderecamento',
      title: 'Endereçamento',
      prompts: NOTE_PROMPTS.enderecamento,
      html: slideShell({
        eyebrow: '04 • ENDEREÇAMENTO',
        title: 'IP, prefixo e endereço MAC',
        subtitle: 'Cada equipamento precisa ser identificado corretamente para participar da rede.',
        number: slidesOut.length + 1,
        className: 'ap-addressing-slide',
        body: `
          <div class="ap-stats-row">
            ${statCard('🌐', configuredIp.length, 'equipamentos completos')}
            ${statCard('📍', equipment.filter(i => i.ip).length, 'com endereço IP')}
            ${statCard('🏷️', equipment.filter(i => i.mac).length, 'com endereço MAC')}
          </div>

          <div class="ap-table-card">
            <div class="ap-table-head">
              <span>Equipamento</span><span>IP</span><span>Prefixo</span><span>MAC</span>
            </div>
            ${configuredIp.length
              ? configuredIp.slice(0, 6).map(item => `
                  <div class="ap-table-row">
                    <span>${esc(item.name || 'Equipamento')}</span>
                    <span>${esc(item.ip)}</span>
                    <span>${esc(item.prefix)}</span>
                    <span>${esc(item.mac)}</span>
                  </div>
                `).join('')
              : `<div class="ap-table-empty">Aguardando configuração dos endereços.</div>`}
          </div>
        `
      })
    });

    slidesOut.push({
      key: 'seguranca',
      title: 'Segurança e LGPD',
      prompts: NOTE_PROMPTS.seguranca,
      html: slideShell({
        eyebrow: '05 • SEGURANÇA E DADOS',
        title: 'Proteção da empresa e dos dados',
        subtitle: 'A rede também precisa considerar segurança, privacidade e uso responsável das informações.',
        number: slidesOut.length + 1,
        className: 'ap-security-slide',
        body: `
          <div class="ap-three-col">
            <div class="ap-feature-card">
              <span>🛡️</span>
              <small>SEGURANÇA</small>
              <strong>Reduzir vulnerabilidades</strong>
              <p>Atualizações, validação de entradas e decisões de proteção ajudam a reduzir riscos.</p>
            </div>
            <div class="ap-feature-card">
              <span>⚖️</span>
              <small>LGPD</small>
              <strong>${lgpd.count} cadastro(s) analisado(s)</strong>
              <p>Finalidade, titular, necessidade e uso dos dados fazem parte da análise.</p>
            </div>
            <div class="ap-feature-card">
              <span>🔐</span>
              <small>DADOS SENSÍVEIS</small>
              <strong>${lgpd.sensitiveCount} cadastro(s) com classificação</strong>
              <p>O grupo deve explicar quais informações exigem maior cuidado.</p>
            </div>
          </div>

          <div class="ap-chip-list ap-bottom-chips">
            ${lgpd.examples.length
              ? lgpd.examples.map(chip).join('')
              : emptyValue('Cadastros da LGPD ainda não registrados')}
          </div>
        `
      })
    });

    const backup = cloud.backup || {};
    slidesOut.push({
      key: 'nuvem',
      title: 'Nuvem e continuidade',
      prompts: NOTE_PROMPTS.nuvem,
      html: slideShell({
        eyebrow: '06 • NUVEM E CONTINUIDADE',
        title: 'A empresa precisa continuar funcionando',
        subtitle: 'Recursos em nuvem, permissões, criptografia e backup ajudam a manter os dados disponíveis e protegidos.',
        number: slidesOut.length + 1,
        className: 'ap-cloud-slide',
        body: `
          <div class="ap-two-col ap-cloud-layout">
            <div class="ap-panel">
              <small>RECURSOS EM NUVEM</small>
              <div class="ap-resource-list">
                ${cloud.resources.length
                  ? cloud.resources.slice(0, 4).map(resource => `
                      <div>
                        <span>☁️</span>
                        <p><strong>${esc(resource.name || 'Recurso')}</strong><small>${esc(resource.purpose || 'Finalidade não informada')}</small></p>
                        <b>${resource.transport === 'tls13' ? 'TLS 1.3' : 'TLS pendente'}</b>
                      </div>
                    `).join('')
                  : emptyValue('Nenhum recurso de nuvem cadastrado')}
              </div>
            </div>

            <div class="ap-panel">
              <small>PLANO DE BACKUP</small>
              <div class="ap-backup-visual">
                <div><span>💾</span><strong>${esc(backup.dataAmount || '—')}</strong><small>quantidade de dados</small></div>
                <div><span>📅</span><strong>${esc(backup.fullDay || '—')}</strong><small>dia do Full</small></div>
                <div><span>⚡</span><strong>${esc(backup.restoreEstimateMinutes || '—')}</strong><small>min. de Restore</small></div>
              </div>
            </div>
          </div>
        `
      })
    });

    slidesOut.push({
      key: 'sdn',
      title: 'SDN e virtualização',
      prompts: NOTE_PROMPTS.sdn,
      html: slideShell({
        eyebrow: '07 • CONTROLE SDN',
        title: 'O controlador pensa e o switch executa',
        subtitle: 'A equipe definiu como a comunicação da rede seria controlada.',
        number: slidesOut.length + 1,
        className: 'ap-sdn-slide',
        body: `
          <div class="ap-sdn-flow">
            <div class="ap-sdn-box controller">
              <span>🧠</span>
              <small>CONTROLADOR</small>
              <strong>${sdn.active ? 'Ativo' : 'Não configurado'}</strong>
            </div>
            <div class="ap-sdn-arrow">→</div>
            <div class="ap-sdn-box">
              <span>🔌</span>
              <small>SWITCH CONTROLADO</small>
              <strong>${esc(sdn.switchName)}</strong>
            </div>
            <div class="ap-sdn-arrow">→</div>
            <div class="ap-sdn-box">
              <span>🌐</span>
              <small>REDE VIRTUAL</small>
              <strong>${esc(sdn.vnet?.name || 'Não definida')}</strong>
            </div>
          </div>

          <div class="ap-rule-grid">
            ${sdn.rules.length
              ? sdn.rules.map((rule, index) => `
                  <div class="ap-rule-card ${rule.action === 'bloquear' ? 'block' : 'allow'}">
                    <small>REGRA ${index + 1}</small>
                    <strong>${esc(equipmentName(rule.sourceId))} → ${esc(equipmentName(rule.destinationId))}</strong>
                    <span>${rule.action === 'bloquear' ? '⛔ BLOQUEAR' : '✅ PERMITIR'}</span>
                    <p>${esc(rule.reason || 'Sem justificativa')}</p>
                  </div>
                `).join('')
              : emptyValue('As regras do SDN ainda não foram salvas')}
          </div>
        `
      })
    });

    const lastFloor = floors[floors.length - 1];
    const lastFloorEquipment = equipmentForFloor(lastFloor.id, floors);
    slidesOut.push({
      key: 'expansao',
      title: 'Expansão',
      prompts: NOTE_PROMPTS.expansao,
      html: slideShell({
        eyebrow: '08 • EXPANSÃO',
        title: 'A empresa cresceu — e a rede também',
        subtitle: 'A expansão exigiu novos setores, equipamentos e conexões sem perder a organização do projeto.',
        number: slidesOut.length + 1,
        className: 'ap-expansion-slide',
        body: `
          <div class="ap-expansion-layout">
            <div class="ap-big-number">
              <span>${floors.length}</span>
              <strong>ANDARES</strong>
              <small>estrutura física atual</small>
            </div>

            <div class="ap-expansion-arrow">＋</div>

            <div class="ap-big-number">
              <span>${departments.length}</span>
              <strong>SETORES</strong>
              <small>áreas da empresa</small>
            </div>

            <div class="ap-expansion-arrow">＋</div>

            <div class="ap-big-number">
              <span>${lastFloorEquipment.length}</span>
              <strong>EQUIPAMENTOS</strong>
              <small>no último andar criado</small>
            </div>
          </div>

          <div class="ap-callout">
            <span>🏗️</span>
            <div>
              <strong>${esc(lastFloor.name || 'Novo andar')}</strong>
              <p>A equipe deve explicar como organizou a expansão e por que essa distribuição faz sentido para a empresa.</p>
            </div>
          </div>
        `
      })
    });

    slidesOut.push({
      key: 'conclusao',
      title: 'Conclusão',
      prompts: NOTE_PROMPTS.conclusao,
      html: slideShell({
        eyebrow: '09 • CONCLUSÃO',
        title: 'Uma empresa conectada, organizada e preparada para crescer',
        subtitle: 'O projeto reuniu infraestrutura, endereçamento, segurança, dados, nuvem e controle de rede.',
        number: slidesOut.length + 1,
        className: 'ap-conclusion',
        body: `
          <div class="ap-conclusion-grid">
            ${statCard('🏬', floors.length, 'andares')}
            ${statCard('🗂️', departments.length, 'departamentos')}
            ${statCard('💻', equipment.length, 'equipamentos')}
            ${statCard('🔗', connections.length, 'conexões')}
          </div>

          <div class="ap-final-message">
            <span>✓</span>
            <div>
              <strong>Projeto de Redes concluído pela equipe</strong>
              <p>Agora o grupo deve fechar a apresentação contando as principais decisões, dificuldades e aprendizados.</p>
            </div>
          </div>
        `
      })
    });

    return slidesOut;
  }

  function inject() {
    const screen = E('#apresentacao');
    if (!screen || screen.dataset.ready === '1') return;

    screen.dataset.ready = '1';
    screen.innerHTML = `
      <div class="section-title ap-page-title">
        <div>
          <p class="eyebrow">APRESENTAÇÃO DO PROJETO</p>
          <h2>Apresentação da Empresa</h2>
        </div>
        <div class="ap-page-actions">
          <span id="apSaveStatus" class="ap-save-status">Apresentação salva</span>
          <button
            id="btnSalvarRoteiro"
            class="btn btn-primary"
            type="button"
            data-auth-action="salvar a apresentação do projeto"
          >
            💾 Salvar apresentação
          </button>
          <button id="btnIniciarApresentacao" class="btn btn-secondary" type="button">
            ▶ Apresentar
          </button>
        </div>
      </div>

      <div class="ap-guide">
        <div>
          <strong>🎤 A apresentação já usa os dados reais do projeto.</strong>
          <p>O grupo deve revisar os slides e completar somente o roteiro de fala de cada etapa.</p>
        </div>
        <div class="ap-guide-pills">
          <span>1. Revise</span>
          <span>2. Complete a fala</span>
          <span>3. Apresente</span>
        </div>
      </div>

      <section class="ap-customize">
        <div class="ap-customize-head">
          <div>
            <small>IDENTIDADE DA APRESENTAÇÃO</small>
            <h3>Escolha o design e adicione o logo da empresa</h3>
          </div>
          <span>As escolhas ficam salvas no projeto do grupo</span>
        </div>

        <div class="ap-customize-grid">
          <div>
            <small class="ap-customize-label">DESIGN DOS SLIDES</small>
            <div id="apThemePicker" class="ap-theme-picker"></div>
          </div>

          <div class="ap-logo-control">
            <small class="ap-customize-label">LOGO DA EMPRESA</small>
            <div class="ap-logo-control-box">
              <div id="apLogoPreview" class="ap-logo-preview"></div>
              <div class="ap-logo-control-copy">
                <strong>PNG transparente</strong>
                <span>O fundo precisa estar removido. Máximo: 2 MB.</span>
                <div>
                  <label class="btn btn-secondary ap-logo-file">
                    📁 Importar logo
                    <input id="apLogoInput" type="file" accept="image/png,.png" />
                  </label>
                  <button id="btnRemoverLogo" class="btn btn-secondary" type="button">Remover</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="ap-workspace">
        <aside id="apThumbs" class="ap-thumbs"></aside>

        <main class="ap-main">
          <div id="apStage" class="ap-stage"></div>

          <div class="ap-controls">
            <button id="btnApAnterior" class="btn btn-secondary" type="button">← Anterior</button>
            <div class="ap-progress">
              <span id="apCounter"></span>
              <div><i id="apProgressBar"></i></div>
            </div>
            <button id="btnApProximo" class="btn btn-primary" type="button">Próximo →</button>
          </div>

          <section id="apSpeakerPanel" class="ap-speaker-panel">
            <div class="ap-speaker-head">
              <div>
                <small>ROTEIRO DA EQUIPE</small>
                <h3>O que explicar neste slide</h3>
              </div>
              <span>Não aparece para o público</span>
            </div>

            <div id="apPromptList" class="ap-prompt-list"></div>

            <label class="ap-note-label">
              Como nossa equipe vai explicar esta parte?
              <textarea
                id="apNote"
                rows="4"
                placeholder="Escrevam aqui palavras-chave ou uma fala curta. Não precisa decorar um texto inteiro."
              ></textarea>
            </label>
          </section>
        </main>
      </div>
    `;

    E('#btnApAnterior')?.addEventListener('click', () => goTo(currentIndex - 1));
    E('#btnApProximo')?.addEventListener('click', () => goTo(currentIndex + 1));
    E('#btnSalvarRoteiro')?.addEventListener('click', saveNotes);
    E('#btnIniciarApresentacao')?.addEventListener('click', startPresentation);
    E('#apLogoInput')?.addEventListener('change', handleLogoImport);
    E('#btnRemoverLogo')?.addEventListener('click', removeLogo);

    E('#apNote')?.addEventListener('input', event => {
      const slide = slides[currentIndex];
      if (!slide) return;

      draftNotes[slide.key] = event.target.value;
      dirty = true;
      updateSaveStatus();
      renderThumbs();
    });

    document.addEventListener('keydown', event => {
      const root = E('#apresentacao');
      if (!root?.classList.contains('active')) return;

      if (document.activeElement?.matches('textarea,input')) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') goTo(currentIndex + 1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') goTo(currentIndex - 1);
      if (event.key === 'Home') goTo(0);
      if (event.key === 'End') goTo(slides.length - 1);
      if (event.key === 'Escape' && E('#apPresenter')?.classList.contains('active')) stopPresentation();
    });
  }

  function currentTheme() {
    return THEMES.find(theme => theme.id === draftThemeId) || THEMES[0];
  }

  function renderThemePicker() {
    const box = E('#apThemePicker');
    if (!box) return;

    box.innerHTML = THEMES.map(theme => `
      <button
        type="button"
        class="ap-theme-card ${theme.id === draftThemeId ? 'active' : ''}"
        data-theme-id="${esc(theme.id)}"
      >
        <span class="ap-theme-swatches">
          ${theme.swatches.map(color => `<i style="background:${color}"></i>`).join('')}
        </span>
        <strong>${esc(theme.name)}</strong>
        <small>${esc(theme.description)}</small>
      </button>
    `).join('');

    box.querySelectorAll('[data-theme-id]').forEach(button => {
      button.addEventListener('click', () => {
        const themeId = button.dataset.themeId;
        if (!THEMES.some(theme => theme.id === themeId) || themeId === draftThemeId) return;

        draftThemeId = themeId;
        dirty = true;
        renderThemePicker();
        refreshSlides();
        updateSaveStatus();
      });
    });
  }

  function renderLogoPreview() {
    const preview = E('#apLogoPreview');
    const remove = E('#btnRemoverLogo');
    if (!preview) return;

    preview.innerHTML = draftLogoDataUrl
      ? `<img src="${draftLogoDataUrl}" alt="Logo importado" />`
      : '<span>PNG</span>';

    preview.classList.toggle('has-logo', !!draftLogoDataUrl);
    if (remove) remove.disabled = !draftLogoDataUrl;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      image.src = dataUrl;
    });
  }

  async function pngHasTransparency(dataUrl) {
    const image = await loadImage(dataUrl);
    const max = 280;
    const scale = Math.min(1, max / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 250) return true;
    }

    return false;
  }

  async function handleLogoImport(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      alert('Use somente um arquivo PNG.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('O logo precisa ter no máximo 2 MB.');
      input.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const transparent = await pngHasTransparency(dataUrl);

      if (!transparent) {
        alert('Esse PNG não possui transparência. Remova o fundo do logo e tente novamente.');
        input.value = '';
        return;
      }

      draftLogoDataUrl = dataUrl;
      draftLogoFileName = file.name;
      dirty = true;
      renderLogoPreview();
      refreshSlides();
      updateSaveStatus();
    } catch (error) {
      alert(error?.message || 'Não foi possível importar o logo.');
    } finally {
      input.value = '';
    }
  }

  function removeLogo() {
    if (!draftLogoDataUrl) return;

    draftLogoDataUrl = '';
    draftLogoFileName = '';
    dirty = true;
    renderLogoPreview();
    refreshSlides();
    updateSaveStatus();
  }

  function renderThumbs() {
    const box = E('#apThumbs');
    if (!box) return;

    box.innerHTML = slides.map((slide, index) => {
      const noteDone = String(draftNotes[slide.key] || '').trim().length >= 12;
      return `
        <button
          type="button"
          class="ap-thumb ${index === currentIndex ? 'active' : ''}"
          data-slide-index="${index}"
        >
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${esc(slide.title)}</strong>
          <i class="${noteDone ? 'done' : ''}" title="${noteDone ? 'Roteiro preenchido' : 'Roteiro pendente'}"></i>
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-slide-index]').forEach(button => {
      button.addEventListener('click', () => goTo(Number(button.dataset.slideIndex)));
    });
  }

  function renderCurrent() {
    const slide = slides[currentIndex];
    if (!slide) return;

    const stage = E('#apStage');
    if (stage) stage.innerHTML = slide.html;

    const prompts = E('#apPromptList');
    if (prompts) {
      prompts.innerHTML = slide.prompts.map(text => `<p><span>→</span>${esc(text)}</p>`).join('');
    }

    const note = E('#apNote');
    if (note) note.value = draftNotes[slide.key] || '';

    const counter = E('#apCounter');
    if (counter) counter.textContent = `${currentIndex + 1} / ${slides.length}`;

    const bar = E('#apProgressBar');
    if (bar) bar.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;

    const prev = E('#btnApAnterior');
    const next = E('#btnApProximo');
    if (prev) prev.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === slides.length - 1;

    renderThumbs();
  }

  function goTo(index) {
    if (!slides.length) return;
    currentIndex = Math.max(0, Math.min(slides.length - 1, index));
    renderCurrent();
    renderPresenterSlide();
  }

  function updateSaveStatus() {
    const status = E('#apSaveStatus');
    if (!status) return;

    status.textContent = dirty ? 'Alterações não salvas' : 'Apresentação salva';
    status.classList.toggle('pending', dirty);
  }

  function saveNotes() {
    const data = ensurePresentationData();
    data.notes = { ...draftNotes };
    data.themeId = draftThemeId;
    data.logoDataUrl = draftLogoDataUrl;
    data.logoFileName = draftLogoFileName;
    data.updatedAt = new Date().toISOString();
    dirty = false;

    if (typeof addHistory === 'function') {
      addHistory('Apresentação', 'Apresentação do projeto foi atualizada: roteiro, design e identidade visual.');
    }

    updateSaveStatus();
    renderThemePicker();
    renderLogoPreview();
    renderThumbs();
  }

  function createPresenter() {
    let overlay = E('#apPresenter');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'apPresenter';
    overlay.className = 'ap-presenter';
    overlay.innerHTML = `
      <div id="apPresenterSlide" class="ap-presenter-slide"></div>
      <div class="ap-presenter-controls">
        <button id="apPresenterPrev" type="button">←</button>
        <span id="apPresenterCounter"></span>
        <button id="apPresenterNext" type="button">→</button>
        <button id="apPresenterClose" type="button">✕</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#apPresenterPrev')?.addEventListener('click', () => goTo(currentIndex - 1));
    overlay.querySelector('#apPresenterNext')?.addEventListener('click', () => goTo(currentIndex + 1));
    overlay.querySelector('#apPresenterClose')?.addEventListener('click', stopPresentation);

    return overlay;
  }

  function renderPresenterSlide() {
    const overlay = E('#apPresenter');
    if (!overlay?.classList.contains('active')) return;

    const slide = slides[currentIndex];
    const stage = E('#apPresenterSlide');
    if (stage && slide) stage.innerHTML = slide.html;

    const counter = E('#apPresenterCounter');
    if (counter) counter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  async function startPresentation() {
    const overlay = createPresenter();
    overlay.classList.add('active');
    renderPresenterSlide();

    try {
      await overlay.requestFullscreen?.();
    } catch (_) {}
  }

  async function stopPresentation() {
    E('#apPresenter')?.classList.remove('active');

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch (_) {}
  }

  function refreshSlides() {
    const oldKey = slides[currentIndex]?.key || 'capa';
    slides = buildSlides();

    const index = slides.findIndex(slide => slide.key === oldKey);
    currentIndex = index >= 0 ? index : Math.min(currentIndex, slides.length - 1);

    renderCurrent();
  }

  function renderScreen() {
    const data = ensurePresentationData();

    if (!dirty) {
      draftNotes = { ...(data.notes || {}) };
      draftThemeId = data.themeId || 'tech-blue';
      draftLogoDataUrl = data.logoDataUrl || '';
      draftLogoFileName = data.logoFileName || '';
    }

    renderThemePicker();
    renderLogoPreview();
    refreshSlides();
    updateSaveStatus();
  }

  function bindNav() {
    const button = E('[data-target="apresentacao"]');
    if (!button || button.dataset.apBound === '1') return;

    button.dataset.apBound = '1';
    button.addEventListener('click', () => setTimeout(renderScreen, 0));
  }

  function watchProjectOpen() {
    const input = E('#inputAbrirProjeto');
    if (!input || input.dataset.apWatch === '1') return;

    input.dataset.apWatch = '1';
    input.addEventListener('change', () => {
      const before = project;
      let checks = 0;

      if (loadWatch) clearInterval(loadWatch);

      loadWatch = setInterval(() => {
        checks += 1;

        if (project !== before || checks >= 40) {
          clearInterval(loadWatch);
          loadWatch = null;

          if (project !== before) {
            dirty = false;
            currentIndex = 0;
            const data = ensurePresentationData();
            draftNotes = { ...(data.notes || {}) };
            draftThemeId = data.themeId || 'tech-blue';
            draftLogoDataUrl = data.logoDataUrl || '';
            draftLogoFileName = data.logoFileName || '';
            if (E('#apresentacao')?.classList.contains('active')) renderScreen();
          }
        }
      }, 100);
    });
  }

  window.apresentacaoPossuiRascunho = () => dirty;

  document.addEventListener('fullscreenchange', () => {
    const overlay = E('#apPresenter');
    if (overlay?.classList.contains('active') && !document.fullscreenElement) {
      overlay.classList.remove('active');
    }
  });

  function start() {
    const data = ensurePresentationData();
    draftNotes = { ...(data.notes || {}) };
    draftThemeId = data.themeId || 'tech-blue';
    draftLogoDataUrl = data.logoDataUrl || '';
    draftLogoFileName = data.logoFileName || '';
    inject();
    bindNav();
    watchProjectOpen();
    renderScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
