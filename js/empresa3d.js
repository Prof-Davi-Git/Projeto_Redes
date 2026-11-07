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

  function box3d({ x, y, z, w, h, d, cls = '', front = '#eef2f7', side = '#cbd5e1', top = '#f8fafc' }) {
    return `
      <div
        class="e3d-proc-box ${cls}"
        style="
          --x:${x}px;--y:${y}px;--z:${z}px;
          --w:${w}px;--h:${h}px;--d:${d}px;
          --front:${front};--side:${side};--top:${top};
        "
      >
        <i class="face front"></i>
        <i class="face back"></i>
        <i class="face right"></i>
        <i class="face left"></i>
        <i class="face top"></i>
        <i class="face bottom"></i>
      </div>
    `;
  }

  function corporateWindows() {
    const front = [];
    const side = [];

    const frontXs = [-205, -135, -65, 65, 135, 205];
    const sideZs = [-110, -40, 40, 110];

    [-48, 48].forEach(y => {
      frontXs.forEach(x => {
        front.push(box3d({
          x, y, z: 153,
          w: 58, h: 68, d: 4,
          cls: 'glass',
          front: 'linear-gradient(145deg,#0f4c75,#3f88b8)',
          side: '#173d57',
          top: '#7dd3fc'
        }));
      });

      sideZs.forEach(z => {
        side.push(box3d({
          x: 263, y, z,
          w: 4, h: 68, d: 58,
          cls: 'glass side-glass',
          front: '#173d57',
          side: 'linear-gradient(145deg,#0f4c75,#3f88b8)',
          top: '#7dd3fc'
        }));
      });
    });

    return front.join('') + side.join('');
  }

  function renderCorporate3D(data) {
    const viewer = $('#empresa3dViewer');
    if (!viewer) return;

    viewer.innerHTML = `
      <div class="e3d-proc-stage" id="e3dProcStage">
        <div class="e3d-proc-help">
          <span>🖱️ Arraste para girar</span>
          <span>🔍 Use o scroll para zoom</span>
        </div>

        <div class="e3d-proc-controls">
          <button type="button" data-e3d-zoom="in" title="Aproximar">＋</button>
          <button type="button" data-e3d-zoom="out" title="Afastar">−</button>
          <button type="button" data-e3d-reset title="Centralizar">↺</button>
        </div>

        <div class="e3d-proc-shadow"></div>

        <div class="e3d-proc-scene" id="e3dProcScene">
          <div class="e3d-proc-world" id="e3dProcWorld">
            ${box3d({ x:0,y:150,z:0,w:760,h:12,d:520,cls:'ground',front:'#d9dde2',side:'#c7ccd2',top:'#dfe3e7' })}

            ${box3d({ x:0,y:15,z:0,w:520,h:220,d:300,cls:'building-shell',front:'#f4f6f8',side:'#d8dde3',top:'#e4e8ed' })}

            ${corporateWindows()}

            ${box3d({ x:-15,y:54,z:196,w:190,h:12,d:92,cls:'canopy',front:'#cfd5dc',side:'#aeb6c0',top:'#e8ebee' })}
            ${box3d({ x:-15,y:68,z:154,w:154,h:82,d:6,cls:'entrance-glass',front:'linear-gradient(145deg,#7fb1cf,#d7ecf8)',side:'#6e91a8',top:'#dbeafe' })}

            ${box3d({ x:-170,y:125,z:170,w:150,h:18,d:48,cls:'planter',front:'#d1d5db',side:'#b6bec8',top:'#e5e7eb' })}
            ${box3d({ x:185,y:125,z:170,w:130,h:18,d:48,cls:'planter',front:'#d1d5db',side:'#b6bec8',top:'#e5e7eb' })}

            ${box3d({ x:-120,y:-112,z:-35,w:74,h:30,d:58,cls:'roof-unit',front:'#b8bec6',side:'#8d98a5',top:'#d6dbe1' })}
            ${box3d({ x:10,y:-112,z:15,w:88,h:32,d:64,cls:'roof-unit',front:'#b8bec6',side:'#8d98a5',top:'#d6dbe1' })}
            ${box3d({ x:165,y:-122,z:-38,w:98,h:50,d:82,cls:'roof-room',front:'#e5e7eb',side:'#cbd5e1',top:'#f3f4f6' })}

            <div class="e3d-proc-roof-rail rail-front"></div>
            <div class="e3d-proc-roof-rail rail-right"></div>
          </div>
        </div>

        <div class="e3d-proc-caption">
          <strong>Modelo 1 — Corporativo Moderno</strong>
          <span>2 andares • fachada branca • vidro azul • cobertura plana</span>
        </div>

        <div class="e3d-proc-summary">
          <span>🏬 ${data.floors.length} andar(es) no projeto</span>
          <span>💻 ${data.equipment.length} equipamentos cadastrados</span>
        </div>
      </div>
    `;

    bindCorporate3DControls();
  }

  function bindCorporate3DControls() {
    const stage = $('#e3dProcStage');
    const world = $('#e3dProcWorld');
    if (!stage || !world) return;

    let yaw = -34;
    let pitch = -18;
    let zoom = 0.92;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      world.style.setProperty('--yaw', yaw + 'deg');
      world.style.setProperty('--pitch', pitch + 'deg');
      world.style.setProperty('--zoom', zoom);
    };

    const reset = () => {
      yaw = -34;
      pitch = -18;
      zoom = 0.92;
      apply();
    };

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('.e3d-proc-controls')) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      stage.setPointerCapture?.(event.pointerId);
      stage.classList.add('dragging');
    });

    stage.addEventListener('pointermove', event => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      yaw += dx * 0.45;
      pitch = clamp(pitch - dy * 0.28, -52, 18);
      lastX = event.clientX;
      lastY = event.clientY;
      apply();
    });

    const stop = event => {
      dragging = false;
      stage.classList.remove('dragging');
      try { stage.releasePointerCapture?.(event.pointerId); } catch (_) {}
    };

    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);

    stage.addEventListener('wheel', event => {
      event.preventDefault();
      zoom = clamp(zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.55, 1.65);
      apply();
    }, { passive: false });

    stage.querySelector('[data-e3d-zoom="in"]')?.addEventListener('click', event => {
      event.stopPropagation();
      zoom = clamp(zoom + 0.12, 0.55, 1.65);
      apply();
    });

    stage.querySelector('[data-e3d-zoom="out"]')?.addEventListener('click', event => {
      event.stopPropagation();
      zoom = clamp(zoom - 0.12, 0.55, 1.65);
      apply();
    });

    stage.querySelector('[data-e3d-reset]')?.addEventListener('click', event => {
      event.stopPropagation();
      reset();
    });

    apply();
  }

  function renderExterior() {
    const viewer = $('#empresa3dViewer');
    if (!viewer) return;

    const data = getBuildingData();

    if (selectedModel === 'corporativo') {
      renderCorporate3D(data);
      return;
    }

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
