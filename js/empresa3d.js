/* =========================================================
   EMPRESA 3D - Projeto de Redes
   - 5 modelos visuais para os grupos escolherem
   - vista externa + vista interna automática
   - a vista interna usa os andares, posições, equipamentos
     e conexões já existentes no Mapa da Rede
   - não altera a topologia e não duplica cadastros
   ========================================================= */

(() => {
  if (typeof project === 'undefined') return;

  const $ = selector => document.querySelector(selector);
  const esc = value => typeof escapeHtml === 'function'
    ? escapeHtml(value)
    : String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const MODELS = [
    { id: 'corporativo', name: 'Corporativo', icon: '🏢', desc: 'Fachada empresarial moderna com vidro.' },
    { id: 'tecnologico', name: 'Tecnológico', icon: '💠', desc: 'Sede de tecnologia com visual digital.' },
    { id: 'industrial', name: 'Industrial', icon: '🏭', desc: 'Estrutura robusta para indústria e logística.' },
    { id: 'criativo', name: 'Criativo', icon: '🎨', desc: 'Escritório contemporâneo e mais colorido.' },
    { id: 'campus', name: 'Campus', icon: '🌳', desc: 'Sede horizontal com áreas verdes.' }
  ];

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
    computador: 'Computador',
    notebook: 'Notebook',
    switch: 'Switch',
    roteador: 'Roteador',
    servidor: 'Servidor',
    impressora: 'Impressora',
    'access-point': 'Access Point'
  };

  let selectedModel = 'corporativo';
  let currentView = 'external';
  let loadWatch = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function ensureVisual() {
    if (!project.company || typeof project.company !== 'object') project.company = {};

    const old = project.company.visual && typeof project.company.visual === 'object'
      ? project.company.visual
      : {};

    const legacyMap = {
      moderno: 'corporativo',
      empresarial: 'corporativo',
      tecnologico: 'tecnologico'
    };

    const candidate =
      old.modelId ||
      legacyMap[old.buildingStyle] ||
      'corporativo';

    const modelId = MODELS.some(model => model.id === candidate)
      ? candidate
      : 'corporativo';

    project.company.visual = {
      ...old,
      visualVersion: 4,
      modelId,
      updatedAt: String(old.updatedAt || '')
    };

    return project.company.visual;
  }

  function getBuildingData() {
    const building = project.company?.building;
    const floors = Array.isArray(building?.floors) && building.floors.length
      ? building.floors
      : [{ id: 'floor_terreo', name: 'Térreo' }];

    const floorIds = new Set(floors.map(floor => floor.id));
    const fallbackFloorId = floors[0].id;

    return {
      floors,
      floorIds,
      fallbackFloorId,
      floorViews: building?.floorViews && typeof building.floorViews === 'object'
        ? building.floorViews
        : {},
      equipment: Array.isArray(project.equipment) ? project.equipment : [],
      connections: Array.isArray(project.connections) ? project.connections : [],
      departments: Array.isArray(project.departments) ? project.departments : []
    };
  }

  function equipmentFloorId(item, data) {
    return data.floorIds.has(item.floorId)
      ? item.floorId
      : data.fallbackFloorId;
  }

  function equipmentOnFloor(floorId, data) {
    return data.equipment.filter(item => equipmentFloorId(item, data) === floorId);
  }

  function connectionsOnFloor(floorId, data) {
    const ids = new Set(equipmentOnFloor(floorId, data).map(item => item.id));
    return data.connections.filter(connection =>
      ids.has(connection.from) && ids.has(connection.to)
    );
  }

  function departmentName(id, data) {
    return data.departments.find(dep => dep.id === id)?.name || '';
  }

  function currentModel() {
    return MODELS.find(model => model.id === selectedModel) || MODELS[0];
  }

  function inject() {
    const screen = $('#empresa3d');
    if (!screen || screen.dataset.empresa3dReady === '1') return;

    screen.dataset.empresa3dReady = '1';
    screen.innerHTML = `
      <div class="section-title e3d-title">
        <div>
          <p class="eyebrow">VISUALIZAÇÃO DA EMPRESA</p>
          <h2>Minha Empresa 3D</h2>
        </div>
        <span class="e3d-tag">Visual complementar</span>
      </div>

      <div class="e3d-intro">
        <div>
          <strong>🏢 A sede visual da empresa criada pelo grupo</strong>
          <p>
            Escolham um modelo de prédio. A visão interna será criada automaticamente
            usando os mesmos andares e equipamentos do Mapa da Rede.
          </p>
        </div>
        <div class="e3d-intro-list">
          <span>✓ Não altera o mapa</span>
          <span>✓ Não cria equipamentos extras</span>
          <span>✓ Pode ser usada na apresentação</span>
        </div>
      </div>

      <section class="e3d-model-area">
        <div class="e3d-section-head">
          <div>
            <small>MODELO DA SEDE</small>
            <h3>Escolha uma das 5 opções</h3>
          </div>
          <button
            id="btnSalvarEmpresa3D"
            class="btn btn-primary"
            type="button"
            data-auth-action="salvar o modelo visual da Empresa 3D"
          >
            💾 Salvar modelo escolhido
          </button>
        </div>
        <div id="empresa3dModelGrid" class="e3d-model-grid"></div>
      </section>

      <section class="e3d-view-shell">
        <div class="e3d-toolbar">
          <div class="e3d-view-tabs">
            <button id="btnEmpresa3DExterna" class="e3d-view-btn active" type="button">
              🏢 Vista externa
            </button>
            <button id="btnEmpresa3DInterna" class="e3d-view-btn" type="button">
              🧩 Ver por dentro
            </button>
          </div>

          <div class="e3d-toolbar-actions">
            <span id="empresa3dSaveStatus" class="e3d-save-status"></span>
            <button id="btnEmpresa3DFullscreen" class="btn btn-secondary" type="button">
              ⛶ Tela cheia
            </button>
          </div>
        </div>

        <div id="empresa3dViewer" class="e3d-viewer"></div>
      </section>

      <div id="empresa3dLegend" class="e3d-legend"></div>
    `;

    $('#btnEmpresa3DExterna')?.addEventListener('click', () => setView('external'));
    $('#btnEmpresa3DInterna')?.addEventListener('click', () => setView('internal'));
    $('#btnSalvarEmpresa3D')?.addEventListener('click', saveModel);
    $('#btnEmpresa3DFullscreen')?.addEventListener('click', toggleFullscreen);
  }

  function renderModelOptions() {
    const grid = $('#empresa3dModelGrid');
    if (!grid) return;

    grid.innerHTML = MODELS.map(model => `
      <button
        class="e3d-model-card ${selectedModel === model.id ? 'active' : ''}"
        type="button"
        data-model-id="${esc(model.id)}"
      >
        <div class="e3d-mini-building model-${esc(model.id)}">
          <div class="e3d-mini-roof"></div>
          <div class="e3d-mini-windows">
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <div class="e3d-mini-door"></div>
        </div>
        <span>
          <strong>${model.icon} ${esc(model.name)}</strong>
          <small>${esc(model.desc)}</small>
        </span>
      </button>
    `).join('');

    grid.querySelectorAll('.e3d-model-card').forEach(button => {
      button.addEventListener('click', () => {
        const modelId = button.dataset.modelId;
        if (!MODELS.some(model => model.id === modelId)) return;

        selectedModel = modelId;
        renderModelOptions();
        renderViewer();

        const status = $('#empresa3dSaveStatus');
        if (status) {
          const saved = ensureVisual().modelId === selectedModel;
          status.textContent = saved ? 'Modelo salvo' : 'Modelo ainda não salvo';
          status.classList.toggle('pending', !saved);
        }
      });
    });
  }

  function renderLegend() {
    const box = $('#empresa3dLegend');
    if (!box) return;

    box.innerHTML = Object.entries(ICONS).map(([type, icon]) => `
      <span><b>${icon}</b> ${esc(TYPE_NAMES[type] || type)}</span>
    `).join('');
  }

  function setView(view) {
    currentView = view === 'internal' ? 'internal' : 'external';
    $('#btnEmpresa3DExterna')?.classList.toggle('active', currentView === 'external');
    $('#btnEmpresa3DInterna')?.classList.toggle('active', currentView === 'internal');
    renderViewer();
  }

  function exteriorFloors(count) {
    const safe = Math.max(1, Math.min(8, count));
    return Array.from({ length: safe }, () => `
      <div class="e3d-building-floor">
        <div class="e3d-window-row">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
    `).join('');
  }

  function renderExterior() {
    const viewer = $('#empresa3dViewer');
    if (!viewer) return;

    const data = getBuildingData();
    const model = currentModel();
    const companyName = project.company?.name || 'Minha Empresa';

    viewer.innerHTML = `
      <div class="e3d-external model-${esc(model.id)}">
        <div class="e3d-cloud cloud-a"></div>
        <div class="e3d-cloud cloud-b"></div>

        <div class="e3d-lawn lawn-a"></div>
        <div class="e3d-lawn lawn-b"></div>
        <div class="e3d-road"></div>

        <div class="e3d-building-wrap">
          <div class="e3d-building" style="--floor-count:${Math.max(1, Math.min(8, data.floors.length))}">
            <div class="e3d-building-side"></div>
            <div class="e3d-building-roof"></div>
            <div class="e3d-building-front">
              <div class="e3d-company-sign">
                <span>${model.icon}</span>
                <strong>${esc(companyName)}</strong>
                <small>${esc(model.name)}</small>
              </div>
              <div class="e3d-building-floors">
                ${exteriorFloors(data.floors.length)}
              </div>
              <div class="e3d-entry"><span></span></div>
            </div>
          </div>
        </div>

        <div class="e3d-stats">
          <span><b>🏬 ${data.floors.length}</b> andar(es)</span>
          <span><b>🗂️ ${data.departments.length}</b> departamentos</span>
          <span><b>💻 ${data.equipment.length}</b> equipamentos</span>
          <span><b>🔗 ${data.connections.length}</b> conexões</span>
        </div>

        <button id="btnEmpresa3DEntrar" class="e3d-enter-btn" type="button">
          Ver a empresa por dentro →
        </button>
      </div>
    `;

    $('#btnEmpresa3DEntrar')?.addEventListener('click', () => setView('internal'));
  }

  function pointFor(item, floorId, data) {
    const view = data.floorViews?.[floorId] || project.mapView || {};
    const width = Math.max(1, Number(view.width) || 1400);
    const height = Math.max(1, Number(view.height) || 900);

    const x = clamp((Number(item.x) || 0) / width, 0.03, 0.97);
    const y = clamp((Number(item.y) || 0) / height, 0.05, 0.95);

    return {
      left: x * 100,
      top: y * 100,
      svgX: x * 1000,
      svgY: y * 450
    };
  }

  function departmentChips(items, data) {
    const names = [...new Set(
      items
        .map(item => departmentName(item.departmentId, data))
        .filter(Boolean)
    )];

    if (!names.length) {
      return '<span class="e3d-dept muted">Sem departamento definido</span>';
    }

    return names.map(name => `
      <span class="e3d-dept">${esc(name)}</span>
    `).join('');
  }

  function renderFloor(floor, displayIndex, data) {
    const items = equipmentOnFloor(floor.id, data);
    const connections = connectionsOnFloor(floor.id, data);
    const itemMap = new Map(items.map(item => [item.id, item]));

    const lines = connections.map(connection => {
      const aItem = itemMap.get(connection.from);
      const bItem = itemMap.get(connection.to);
      if (!aItem || !bItem) return '';

      const a = pointFor(aItem, floor.id, data);
      const b = pointFor(bItem, floor.id, data);

      return `
        <line
          x1="${a.svgX.toFixed(1)}"
          y1="${a.svgY.toFixed(1)}"
          x2="${b.svgX.toFixed(1)}"
          y2="${b.svgY.toFixed(1)}"
        />
      `;
    }).join('');

    const nodes = items.map(item => {
      const p = pointFor(item, floor.id, data);
      const icon = ICONS[item.type] || '🔧';
      const dep = departmentName(item.departmentId, data);
      const title = [
        item.name || TYPE_NAMES[item.type] || item.type,
        TYPE_NAMES[item.type] || item.type,
        dep || 'Sem departamento',
        item.ip ? 'IP: ' + item.ip : ''
      ].filter(Boolean).join(' • ');

      return `
        <div
          class="e3d-node type-${esc(item.type)}"
          style="left:${p.left.toFixed(2)}%;top:${p.top.toFixed(2)}%"
          title="${esc(title)}"
        >
          <span>${icon}</span>
          <small>${esc(item.name || TYPE_NAMES[item.type] || item.type)}</small>
        </div>
      `;
    }).join('');

    return `
      <article class="e3d-floor-card">
        <div class="e3d-floor-head">
          <div>
            <small>CAMADA ${displayIndex + 1}</small>
            <h4>${esc(floor.name || 'Andar')}</h4>
          </div>
          <div class="e3d-floor-meta">
            <span>💻 ${items.length} equipamento(s)</span>
            <span>🔗 ${connections.length} conexão(ões)</span>
          </div>
        </div>

        <div class="e3d-floor-departments">
          ${departmentChips(items, data)}
        </div>

        <div class="e3d-floor-plan">
          <div class="e3d-floor-grid"></div>
          <svg class="e3d-lines" viewBox="0 0 1000 450" preserveAspectRatio="none">
            ${lines}
          </svg>
          ${nodes || '<div class="e3d-floor-empty">Nenhum equipamento cadastrado neste andar.</div>'}
        </div>
      </article>
    `;
  }

  function renderInternal() {
    const viewer = $('#empresa3dViewer');
    if (!viewer) return;

    const data = getBuildingData();
    const model = currentModel();
    const companyName = project.company?.name || 'Minha Empresa';

    viewer.innerHTML = `
      <div class="e3d-internal model-${esc(model.id)}">
        <div class="e3d-internal-head">
          <div>
            <small>VISÃO INTERNA AUTOMÁTICA</small>
            <h3>${esc(companyName)} — todos os andares</h3>
            <p>
              Os equipamentos abaixo são os mesmos do Mapa da Rede.
              As posições e conexões acompanham a topologia criada pelo grupo.
            </p>
          </div>
          <span class="e3d-live">● Sincronizado com o mapa</span>
        </div>

        <div class="e3d-cutaway">
          ${data.floors.map((floor, index) => renderFloor(floor, index, data)).join('')}
        </div>
      </div>
    `;
  }

  function renderViewer() {
    if (currentView === 'internal') renderInternal();
    else renderExterior();
  }

  function renderScreen() {
    inject();
    const visual = ensureVisual();

    selectedModel = MODELS.some(model => model.id === visual.modelId)
      ? visual.modelId
      : 'corporativo';

    renderModelOptions();
    renderViewer();
    renderLegend();

    const status = $('#empresa3dSaveStatus');
    if (status) {
      status.textContent = 'Modelo salvo';
      status.classList.remove('pending');
    }
  }

  function saveModel() {
    const visual = ensureVisual();
    const previous = visual.modelId;
    const model = currentModel();

    visual.modelId = selectedModel;
    visual.updatedAt = new Date().toISOString();

    const status = $('#empresa3dSaveStatus');
    if (status) {
      status.textContent = '✓ Modelo salvo';
      status.classList.remove('pending');
    }

    if (typeof addHistory === 'function' && previous !== selectedModel) {
      addHistory('Visual', `Modelo visual da Empresa 3D alterado para "${model.name}".`);
    }

    if (typeof renderAll === 'function') renderAll();
  }

  async function toggleFullscreen() {
    const viewer = $('#empresa3dViewer');
    if (!viewer) return;

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (viewer.requestFullscreen) await viewer.requestFullscreen();
    } catch (_) {}
  }

  function watchProjectOpen() {
    const input = $('#inputAbrirProjeto');
    if (!input || input.dataset.empresa3dWatch === '1') return;

    input.dataset.empresa3dWatch = '1';
    input.addEventListener('change', () => {
      const before = project;
      let checks = 0;

      if (loadWatch) clearInterval(loadWatch);

      loadWatch = setInterval(() => {
        checks += 1;
        if (project !== before || checks >= 40) {
          clearInterval(loadWatch);
          loadWatch = null;

          if (project !== before && $('#empresa3d')?.classList.contains('active')) {
            renderScreen();
          }
        }
      }, 100);
    });
  }

  function bindNav() {
    const button = $('[data-target="empresa3d"]');
    if (!button || button.dataset.empresa3dBound === '1') return;

    button.dataset.empresa3dBound = '1';
    button.addEventListener('click', () => setTimeout(renderScreen, 0));
  }

  const previousRenderAll = typeof renderAll === 'function' ? renderAll : null;
  if (previousRenderAll) {
    renderAll = function() {
      const result = previousRenderAll();
      if ($('#empresa3d')?.classList.contains('active')) renderScreen();
      return result;
    };
  }

  function start() {
    ensureVisual();
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
