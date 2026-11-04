const icons = {
  computador: '💻',
  notebook: '💼',
  switch: '🔌',
  roteador: '🌐',
  servidor: '🗄️',
  impressora: '🖨️',
  'access-point': '📶'
};

const typeNames = {
  computador: 'PC',
  notebook: 'Notebook',
  switch: 'Switch',
  roteador: 'Roteador',
  servidor: 'Servidor',
  impressora: 'Impressora',
  'access-point': 'Access Point'
};

const MAP_DEFAULT = { zoom: 1, width: 1400, height: 900 };
const MAP_LIMITS = {
  minZoom: 0.5,
  maxZoom: 1.5,
  zoomStep: 0.1,
  maxWidth: 3600,
  maxHeight: 2400,
  expandX: 500,
  expandY: 400,
  edgeGap: 140
};

let project = emptyProject();
let editingId = null;
let connectMode = false;
let firstConnect = null;
let connectionPointer = null;
let suppressConnectionDoubleClickUntil = 0;

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

function emptyProject() {
  return {
    version: 2,
    company: {
      name: 'Minha Empresa',
      group: '',
      members: '',
      description: ''
    },
    departments: [],
    equipment: [],
    connections: [],
    history: [],
    mapView: { ...MAP_DEFAULT }
  };
}

function ensureMapView() {
  if (!project.mapView || typeof project.mapView !== 'object') {
    project.mapView = { ...MAP_DEFAULT };
  }

  project.mapView.zoom = clamp(Number(project.mapView.zoom) || 1, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom);
  project.mapView.width = clamp(Math.round(Number(project.mapView.width) || MAP_DEFAULT.width), MAP_DEFAULT.width, MAP_LIMITS.maxWidth);
  project.mapView.height = clamp(Math.round(Number(project.mapView.height) || MAP_DEFAULT.height), MAP_DEFAULT.height, MAP_LIMITS.maxHeight);

  const maxX = project.equipment.reduce((m, e) => Math.max(m, Number(e.x) || 0), 0);
  const maxY = project.equipment.reduce((m, e) => Math.max(m, Number(e.y) || 0), 0);

  if (maxX + 300 > project.mapView.width) {
    project.mapView.width = Math.min(MAP_LIMITS.maxWidth, maxX + 300);
  }
  if (maxY + 240 > project.mapView.height) {
    project.mapView.height = Math.min(MAP_LIMITS.maxHeight, maxY + 240);
  }

  return project.mapView;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusText(status) {
  return status === 'manutencao' ? 'Em manutenção' : status === 'inativo' ? 'Inativo' : 'Ativo';
}

function addHistory(type, description) {
  project.history.unshift({ id: id('hist'), date: today(), type, description });
}

function historyValue(value, emptyText = 'vazio') {
  const text = String(value ?? '').trim();
  return text || emptyText;
}

function departmentName(depId) {
  if (!depId) return 'Sem departamento';
  return project.departments.find(dep => dep.id === depId)?.name || 'Departamento não encontrado';
}

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupCompany();
  setupDepartments();
  setupMap();
  setupSaveOpen();
  renderAll();
});

function setupNav() {
  $$('.nav-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      $$('.screen').forEach(screen => screen.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.target).classList.add('active');

      if (btn.dataset.target === 'mapa') {
        setTimeout(() => {
          updateMapGeometry();
          drawConnections();
        }, 50);
      }
    });
  });
}

function setupCompany() {
  $('#btnSalvarEmpresa').addEventListener('click', () => {
    const previous = {
      name: project.company.name || 'Minha Empresa',
      group: project.company.group || '',
      members: project.company.members || '',
      description: project.company.description || ''
    };

    const next = {
      name: $('#empresaNome').value.trim() || 'Minha Empresa',
      group: $('#empresaGrupo').value.trim(),
      members: $('#empresaIntegrantes').value.trim(),
      description: $('#empresaDescricao').value.trim()
    };

    const changes = [];
    if (previous.name !== next.name) {
      changes.push(`nome: "${historyValue(previous.name)}" → "${historyValue(next.name)}"`);
    }
    if (previous.group !== next.group) {
      changes.push(`grupo: "${historyValue(previous.group)}" → "${historyValue(next.group)}"`);
    }
    if (previous.members !== next.members) {
      changes.push('integrantes atualizados');
    }
    if (previous.description !== next.description) {
      changes.push('descrição da empresa atualizada');
    }

    project.company.name = next.name;
    project.company.group = next.group;
    project.company.members = next.members;
    project.company.description = next.description;

    if (changes.length) {
      addHistory('Configuração', `Dados da empresa alterados: ${changes.join('; ')}.`);
    }

    renderAll();
    alert(changes.length ? 'Dados da empresa salvos.' : 'Nenhuma alteração foi identificada nos dados da empresa.');
  });
}

function setupDepartments() {
  $('#btnAdicionarDepartamento').addEventListener('click', () => {
    const name = $('#novoDepartamento').value.trim();
    if (!name) return alert('Digite o nome do departamento.');
    if (project.departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      return alert('Esse departamento já existe.');
    }

    project.departments.push({ id: id('dep'), name });
    $('#novoDepartamento').value = '';
    addHistory('Configuração', `Departamento "${name}" foi criado.`);
    renderAll();
  });
}

function deleteDepartment(depId) {
  const dep = project.departments.find(d => d.id === depId);
  if (!dep) return;
  if (project.equipment.some(e => e.departmentId === depId)) {
    return alert('Esse departamento ainda possui equipamentos. Mova-os antes de excluir.');
  }
  if (!confirm(`Excluir o departamento "${dep.name}"?`)) return;

  project.departments = project.departments.filter(d => d.id !== depId);
  addHistory('Correção', `Departamento "${dep.name}" foi removido.`);
  renderAll();
}

function setupMap() {
  $('#btnAdicionarEquipamento').addEventListener('click', addEquipment);
  $('#btnFecharModal').addEventListener('click', closeModal);
  $('#btnSalvarEquipamento').addEventListener('click', saveEquipmentEdit);
  $('#btnExcluirEquipamento').addEventListener('click', deleteCurrentEquipment);

  $('#btnZoomMenos')?.addEventListener('click', () => changeZoom(-MAP_LIMITS.zoomStep));
  $('#btnZoomMais')?.addEventListener('click', () => changeZoom(MAP_LIMITS.zoomStep));
  $('#btnZoomReset')?.addEventListener('click', () => setMapZoom(1));

  const canvas = $('#networkCanvas');
  canvas?.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? MAP_LIMITS.zoomStep : -MAP_LIMITS.zoomStep);
  }, { passive: false });

  canvas?.addEventListener('pointermove', updateConnectionPreview);
  canvas?.addEventListener('click', event => {
    if (!connectMode) return;
    if (event.target.closest('.equipment')) return;
    cancelConnect();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && connectMode) cancelConnect();
  });

  window.addEventListener('resize', () => {
    updateMapGeometry();
    drawConnections();
  });
}

function addEquipment() {
  const type = $('#tipoEquipamento').value;
  const n = project.equipment.filter(e => e.type === type).length + 1;
  const view = ensureMapView();
  const index = project.equipment.length;
  const columns = 6;
  const x = 50 + (index % columns) * 150;
  const y = 55 + Math.floor(index / columns) * 125;

  const equipment = {
    id: id('eq'),
    type,
    name: `${typeNames[type]}-${String(n).padStart(2, '0')}`,
    departmentId: '',
    ip: '',
    prefix: '',
    mac: '',
    status: 'ativo',
    notes: '',
    x: Math.min(x, view.width - 180),
    y: Math.min(y, view.height - 150)
  };

  project.equipment.push(equipment);
  addHistory('Expansão', `${typeNames[type] || type} "${equipment.name}" foi adicionado ao mapa da rede.`);
  renderAll();
}

function updateMapGeometry() {
  const view = ensureMapView();
  const zoomSpace = $('#networkZoomSpace');
  const world = $('#networkWorld');
  const svg = $('#connectionLayer');

  if (!zoomSpace || !world) return;

  world.style.width = `${view.width}px`;
  world.style.height = `${view.height}px`;
  world.style.transform = `scale(${view.zoom})`;

  zoomSpace.style.width = `${view.width * view.zoom}px`;
  zoomSpace.style.height = `${view.height * view.zoom}px`;

  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${view.width} ${view.height}`);
    svg.style.width = `${view.width}px`;
    svg.style.height = `${view.height}px`;
  }

  const label = $('#zoomPercentual');
  if (label) label.textContent = `${Math.round(view.zoom * 100)}%`;

  const statusSize = $('#mapSizeLabel');
  if (statusSize) statusSize.textContent = `${view.width} × ${view.height}`;
}

function setMapZoom(newZoom) {
  const canvas = $('#networkCanvas');
  const view = ensureMapView();
  if (!canvas) return;

  const oldZoom = view.zoom;
  const centerX = (canvas.scrollLeft + canvas.clientWidth / 2) / oldZoom;
  const centerY = (canvas.scrollTop + canvas.clientHeight / 2) / oldZoom;

  view.zoom = clamp(Math.round(newZoom * 10) / 10, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom);
  updateMapGeometry();

  canvas.scrollLeft = Math.max(0, centerX * view.zoom - canvas.clientWidth / 2);
  canvas.scrollTop = Math.max(0, centerY * view.zoom - canvas.clientHeight / 2);
}

function changeZoom(delta) {
  const view = ensureMapView();
  setMapZoom(view.zoom + delta);
}

function expandMapIfNeeded(x, y, equipmentWidth = 120, equipmentHeight = 94) {
  const view = ensureMapView();
  let changed = false;

  if (x + equipmentWidth > view.width - MAP_LIMITS.edgeGap && view.width < MAP_LIMITS.maxWidth) {
    view.width = Math.min(MAP_LIMITS.maxWidth, view.width + MAP_LIMITS.expandX);
    changed = true;
  }

  if (y + equipmentHeight > view.height - MAP_LIMITS.edgeGap && view.height < MAP_LIMITS.maxHeight) {
    view.height = Math.min(MAP_LIMITS.maxHeight, view.height + MAP_LIMITS.expandY);
    changed = true;
  }

  if (changed) updateMapGeometry();
  return changed;
}

function autoScrollWhileDragging(pointerEvent) {
  const canvas = $('#networkCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const margin = 42;
  const speed = 18;

  if (pointerEvent.clientX > rect.right - margin) canvas.scrollLeft += speed;
  else if (pointerEvent.clientX < rect.left + margin) canvas.scrollLeft -= speed;

  if (pointerEvent.clientY > rect.bottom - margin) canvas.scrollTop += speed;
  else if (pointerEvent.clientY < rect.top + margin) canvas.scrollTop -= speed;
}

function renderMap() {
  const world = $('#networkWorld');
  if (!world) return;

  updateMapGeometry();
  world.querySelectorAll('.equipment').forEach(el => el.remove());
  $('#emptyNetwork').classList.toggle('hidden', project.equipment.length > 0);

  project.equipment.forEach(equipment => {
    const el = document.createElement('div');
    el.className = 'equipment';
    el.dataset.id = equipment.id;
    el.style.left = `${equipment.x}px`;
    el.style.top = `${equipment.y}px`;

    const dep = project.departments.find(d => d.id === equipment.departmentId);
    el.innerHTML = `
      <button
        type="button"
        class="equipment-edit-btn"
        title="Editar configuração"
        aria-label="Editar configuração de ${escapeHtml(equipment.name)}"
      >⚙</button>
      <span class="icon">${icons[equipment.type] || '🔧'}</span>
      <strong>${escapeHtml(equipment.name)}</strong>
      <small>${escapeHtml(equipment.ip || (dep ? dep.name : 'Sem configuração'))}</small>
    `;

    const editButton = el.querySelector('.equipment-edit-btn');
    editButton?.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
    });
    editButton?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (connectMode) cancelConnect();
      openModal(equipment.id);
    });

    el.addEventListener('pointerdown', dragStart);
    el.addEventListener('dblclick', event => {
      if (event.target.closest('.equipment-edit-btn, .connection-remove-handle')) return;
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() < suppressConnectionDoubleClickUntil) return;
      startConnectionFrom(equipment.id, event);
    });
    el.addEventListener('click', event => {
      if (event.target.closest('.equipment-edit-btn, .connection-remove-handle')) return;
      if (!connectMode) return;
      event.preventDefault();
      event.stopPropagation();
      selectConnect(equipment.id);
    });

    world.appendChild(el);
  });

  setTimeout(drawConnections, 0);
}

function dragStart(event) {
  if (connectMode || event.target.closest('.equipment-edit-btn, .connection-remove-handle')) return;

  const el = event.currentTarget;
  const equipment = project.equipment.find(item => item.id === el.dataset.id);
  const canvas = $('#networkCanvas');
  const view = ensureMapView();

  if (!equipment || !canvas) return;

  event.preventDefault();
  el.setPointerCapture(event.pointerId);

  const elementRect = el.getBoundingClientRect();
  const offsetX = (event.clientX - elementRect.left) / view.zoom;
  const offsetY = (event.clientY - elementRect.top) / view.zoom;

  function move(pointerEvent) {
    const currentView = ensureMapView();
    const canvasRect = canvas.getBoundingClientRect();

    autoScrollWhileDragging(pointerEvent);

    let x = (pointerEvent.clientX - canvasRect.left + canvas.scrollLeft) / currentView.zoom - offsetX;
    let y = (pointerEvent.clientY - canvasRect.top + canvas.scrollTop) / currentView.zoom - offsetY;

    x = Math.max(0, x);
    y = Math.max(0, y);

    expandMapIfNeeded(x, y, el.offsetWidth, el.offsetHeight);

    const expandedView = ensureMapView();
    x = Math.min(x, expandedView.width - el.offsetWidth);
    y = Math.min(y, expandedView.height - el.offsetHeight);

    equipment.x = Math.round(x);
    equipment.y = Math.round(y);
    el.style.left = `${equipment.x}px`;
    el.style.top = `${equipment.y}px`;
    drawConnections();
  }

  function up() {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
  }

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
}

function defaultMapStatus() {
  return 'Arraste os equipamentos para organizar a rede. Dê dois cliques em um equipamento para iniciar uma conexão. Use ⚙ para editar. Passe o mouse sobre a saída de um cabo para desconectar.';
}

function mapPointFromEvent(event) {
  const canvas = $('#networkCanvas');
  const view = ensureMapView();
  if (!canvas || !event) return null;

  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left + canvas.scrollLeft) / view.zoom,
    y: (event.clientY - rect.top + canvas.scrollTop) / view.zoom
  };
}

function equipmentCenter(element) {
  return {
    x: element.offsetLeft + element.offsetWidth / 2,
    y: element.offsetTop + element.offsetHeight / 2
  };
}

function equipmentAnchor(element, targetX, targetY) {
  const center = equipmentCenter(element);
  const dx = targetX - center.x;
  const dy = targetY - center.y;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return center;

  const halfWidth = Math.max(1, element.offsetWidth / 2);
  const halfHeight = Math.max(1, element.offsetHeight / 2);
  const tx = Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const ty = Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(tx, ty);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale
  };
}

function startConnect() {
  // Compatibilidade com extensões antigas. A conexão agora começa pelo duplo clique.
  const status = $('#statusConexao');
  if (status) {
    status.textContent = 'Dê dois cliques no equipamento de origem para liberar o cabo.';
    status.classList.add('active');
  }
}

function startConnectionFrom(eqId, event = null) {
  const visibleEquipment = Array.from(document.querySelectorAll('.equipment[data-id]'));
  if (visibleEquipment.length < 2) {
    return alert('Adicione pelo menos dois equipamentos neste andar.');
  }

  const source = document.querySelector(`.equipment[data-id="${eqId}"]`);
  const equipment = project.equipment.find(item => item.id === eqId);
  if (!source || !equipment) return;

  connectMode = true;
  firstConnect = eqId;
  connectionPointer = mapPointFromEvent(event) || equipmentCenter(source);

  document.querySelectorAll('.equipment').forEach(element => element.classList.remove('selected'));
  source.classList.add('selected');
  $('#networkWorld')?.classList.add('is-connecting');

  const status = $('#statusConexao');
  if (status) {
    status.textContent = `Cabo liberado de "${equipment.name}". Mova o mouse e clique no equipamento de destino. Pressione ESC para cancelar.`;
    status.classList.add('active');
  }

  drawConnections();
}

function cancelConnect(resetStatus = true) {
  connectMode = false;
  firstConnect = null;
  connectionPointer = null;

  $('#networkWorld')?.classList.remove('is-connecting');
  document.querySelectorAll('.equipment').forEach(element => element.classList.remove('selected'));

  if (resetStatus) {
    const status = $('#statusConexao');
    if (status) {
      status.textContent = defaultMapStatus();
      status.classList.remove('active');
    }
  }

  drawConnections();
}

function updateConnectionPreview(event) {
  if (!connectMode || !firstConnect) return;

  connectionPointer = mapPointFromEvent(event);
  if (!connectionPointer) return;

  const source = document.querySelector(`.equipment[data-id="${firstConnect}"]`);
  if (!source) return cancelConnect();

  let preview = document.querySelector('#connectionPreviewLine');
  if (!preview) {
    drawConnections();
    preview = document.querySelector('#connectionPreviewLine');
    if (!preview) return;
  }

  const anchor = equipmentAnchor(source, connectionPointer.x, connectionPointer.y);
  preview.setAttribute('x1', anchor.x);
  preview.setAttribute('y1', anchor.y);
  preview.setAttribute('x2', connectionPointer.x);
  preview.setAttribute('y2', connectionPointer.y);
}

function selectConnect(eqId) {
  if (!connectMode || !firstConnect) return;
  if (firstConnect === eqId) return;

  const exists = project.connections.some(connection =>
    (connection.from === firstConnect && connection.to === eqId) ||
    (connection.from === eqId && connection.to === firstConnect)
  );

  if (exists) {
    alert('Esses equipamentos já estão conectados.');
    return cancelConnect();
  }

  const source = project.equipment.find(equipment => equipment.id === firstConnect);
  const target = project.equipment.find(equipment => equipment.id === eqId);
  if (!source || !target) return cancelConnect();

  project.connections.push({ id: id('con'), from: firstConnect, to: eqId });
  addHistory('Configuração', `Conexão criada entre "${source.name}" e "${target.name}".`);

  suppressConnectionDoubleClickUntil = Date.now() + 450;
  cancelConnect(false);
  renderAll();

  // Desenha imediatamente e repete no próximo frame para evitar o atraso visual
  // causado pela reconstrução do mapa em alguns navegadores.
  drawConnections();
  requestAnimationFrame(() => drawConnections());
  window.atualizarMissoes?.();

  const status = $('#statusConexao');
  if (status) {
    status.textContent = `Conexão criada: "${source.name}" ↔ "${target.name}".`;
    status.classList.add('active');
    setTimeout(() => {
      if (!connectMode && status.isConnected) {
        status.textContent = defaultMapStatus();
        status.classList.remove('active');
      }
    }, 1400);
  }
}

function setConnectionHighlight(connectionId, active) {
  document.querySelectorAll('.connection-line').forEach(line => {
    if (line.dataset.connectionId === connectionId) {
      line.classList.toggle('connection-line-danger', active);
    }
  });
}

function addDisconnectHandle(element, connection, anchor, otherEquipment) {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'connection-remove-handle';
  handle.dataset.connectionId = connection.id;
  handle.style.left = `${anchor.x - element.offsetLeft}px`;
  handle.style.top = `${anchor.y - element.offsetTop}px`;
  handle.textContent = '×';
  handle.title = `Desconectar de ${otherEquipment?.name || 'equipamento'}`;
  handle.setAttribute(
    'aria-label',
    `Desconectar de ${otherEquipment?.name || 'equipamento'}`
  );

  handle.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
  });
  handle.addEventListener('mouseenter', () => setConnectionHighlight(connection.id, true));
  handle.addEventListener('mouseleave', () => setConnectionHighlight(connection.id, false));
  handle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    disconnectConnection(connection.id);
  });

  element.appendChild(handle);
}

function disconnectConnection(connectionId) {
  const connection = project.connections.find(item => item.id === connectionId);
  if (!connection) return;

  const source = project.equipment.find(equipment => equipment.id === connection.from);
  const target = project.equipment.find(equipment => equipment.id === connection.to);

  project.connections = project.connections.filter(item => item.id !== connectionId);
  addHistory(
    'Correção',
    `Conexão removida entre "${source?.name || 'Equipamento'}" e "${target?.name || 'Equipamento'}".`
  );

  renderAll();
  drawConnections();
  requestAnimationFrame(() => drawConnections());
  window.atualizarMissoes?.();

  const status = $('#statusConexao');
  if (status) {
    status.textContent = `Conexão removida: "${source?.name || 'Equipamento'}" ↔ "${target?.name || 'Equipamento'}".`;
    status.classList.add('active');
    setTimeout(() => {
      if (!connectMode && status.isConnected) {
        status.textContent = defaultMapStatus();
        status.classList.remove('active');
      }
    }, 1400);
  }
}

function drawConnections() {
  const svg = $('#connectionLayer');
  if (!svg) return;

  const view = ensureMapView();
  svg.setAttribute('viewBox', `0 0 ${view.width} ${view.height}`);
  svg.innerHTML = '';

  document.querySelectorAll('.connection-remove-handle').forEach(handle => handle.remove());

  project.connections.forEach(connection => {
    const a = document.querySelector(`.equipment[data-id="${connection.from}"]`);
    const b = document.querySelector(`.equipment[data-id="${connection.to}"]`);
    if (!a || !b) return;

    const centerA = equipmentCenter(a);
    const centerB = equipmentCenter(b);
    const anchorA = equipmentAnchor(a, centerB.x, centerB.y);
    const anchorB = equipmentAnchor(b, centerA.x, centerA.y);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('connection-line');
    line.dataset.connectionId = connection.id;
    line.setAttribute('x1', anchorA.x);
    line.setAttribute('y1', anchorA.y);
    line.setAttribute('x2', anchorB.x);
    line.setAttribute('y2', anchorB.y);
    line.setAttribute('stroke', '#2563eb');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '.82');
    svg.appendChild(line);

    const equipmentA = project.equipment.find(item => item.id === connection.from);
    const equipmentB = project.equipment.find(item => item.id === connection.to);
    addDisconnectHandle(a, connection, anchorA, equipmentB);
    addDisconnectHandle(b, connection, anchorB, equipmentA);
  });

  if (connectMode && firstConnect && connectionPointer) {
    const source = document.querySelector(`.equipment[data-id="${firstConnect}"]`);
    if (source) {
      const anchor = equipmentAnchor(source, connectionPointer.x, connectionPointer.y);
      const preview = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      preview.id = 'connectionPreviewLine';
      preview.classList.add('connection-preview');
      preview.setAttribute('x1', anchor.x);
      preview.setAttribute('y1', anchor.y);
      preview.setAttribute('x2', connectionPointer.x);
      preview.setAttribute('y2', connectionPointer.y);
      svg.appendChild(preview);
    }
  }
}

function fillDepartmentSelect() {
  const select = $('#equipDepartamento');
  select.innerHTML = '<option value="">Sem departamento</option>';
  project.departments.forEach(dep => {
    const option = document.createElement('option');
    option.value = dep.id;
    option.textContent = dep.name;
    select.appendChild(option);
  });
}

function openModal(eqId) {
  const equipment = project.equipment.find(item => item.id === eqId);
  if (!equipment) return;

  editingId = eqId;
  fillDepartmentSelect();
  $('#equipNome').value = equipment.name;
  $('#equipDepartamento').value = equipment.departmentId || '';
  $('#equipIp').value = equipment.ip;
  $('#equipPrefixo').value = equipment.prefix;
  $('#equipMac').value = equipment.mac;
  $('#equipStatus').value = equipment.status;
  $('#equipObservacoes').value = equipment.notes;
  $('#modalEquipamento').classList.remove('hidden');
}

function closeModal() {
  editingId = null;
  $('#modalEquipamento').classList.add('hidden');
}

function saveEquipmentEdit() {
  const equipment = project.equipment.find(item => item.id === editingId);
  if (!equipment) return;

  const previous = {
    name: equipment.name,
    departmentId: equipment.departmentId || '',
    ip: equipment.ip || '',
    prefix: equipment.prefix || '',
    mac: equipment.mac || '',
    status: equipment.status || 'ativo',
    notes: equipment.notes || ''
  };

  const next = {
    name: $('#equipNome').value.trim() || equipment.name,
    departmentId: $('#equipDepartamento').value,
    ip: $('#equipIp').value.trim(),
    prefix: $('#equipPrefixo').value.trim(),
    mac: $('#equipMac').value.trim(),
    status: $('#equipStatus').value,
    notes: $('#equipObservacoes').value.trim()
  };

  const changes = [];
  if (previous.name !== next.name) {
    changes.push(`nome: "${historyValue(previous.name)}" → "${historyValue(next.name)}"`);
  }
  if (previous.departmentId !== next.departmentId) {
    changes.push(`departamento: "${departmentName(previous.departmentId)}" → "${departmentName(next.departmentId)}"`);
  }
  if (previous.ip !== next.ip) {
    changes.push(`IP: ${historyValue(previous.ip)} → ${historyValue(next.ip)}`);
  }
  if (previous.prefix !== next.prefix) {
    changes.push(`prefixo: ${historyValue(previous.prefix)} → ${historyValue(next.prefix)}`);
  }
  if (previous.mac !== next.mac) {
    changes.push(`MAC: ${historyValue(previous.mac)} → ${historyValue(next.mac)}`);
  }
  if (previous.status !== next.status) {
    changes.push(`status: ${statusText(previous.status)} → ${statusText(next.status)}`);
  }
  if (previous.notes !== next.notes) {
    changes.push('observações atualizadas');
  }

  equipment.name = next.name;
  equipment.departmentId = next.departmentId;
  equipment.ip = next.ip;
  equipment.prefix = next.prefix;
  equipment.mac = next.mac;
  equipment.status = next.status;
  equipment.notes = next.notes;

  if (changes.length) {
    addHistory('Configuração', `Equipamento "${equipment.name}" alterado: ${changes.join('; ')}.`);
  }

  closeModal();
  renderAll();
}

function deleteCurrentEquipment() {
  const equipment = project.equipment.find(item => item.id === editingId);
  if (!equipment) return;
  if (!confirm(`Excluir ${equipment.name}?`)) return;

  const connectionsRemoved = project.connections.filter(c => c.from === equipment.id || c.to === equipment.id).length;

  project.equipment = project.equipment.filter(item => item.id !== equipment.id);
  project.connections = project.connections.filter(c => c.from !== equipment.id && c.to !== equipment.id);

  const connectionInfo = connectionsRemoved
    ? ` Também foram removidas ${connectionsRemoved} conexão(ões) vinculada(s) a ele.`
    : '';
  addHistory('Correção', `Equipamento "${equipment.name}" foi removido da rede.${connectionInfo}`);

  closeModal();
  renderAll();
}

function setupSaveOpen() {
  $('#btnSalvarProjeto').addEventListener('click', saveProject);

  $('#inputAbrirProjeto').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.company || !Array.isArray(data.equipment)) throw new Error();

        project = {
          version: data.version || 1,
          company: data.company || emptyProject().company,
          departments: Array.isArray(data.departments) ? data.departments : [],
          equipment: Array.isArray(data.equipment) ? data.equipment : [],
          connections: Array.isArray(data.connections) ? data.connections : [],
          history: Array.isArray(data.history) ? data.history : [],
          mapView: data.mapView && typeof data.mapView === 'object' ? data.mapView : { ...MAP_DEFAULT }
        };

        ensureMapView();
        cancelConnect();
        renderAll();
        alert('Projeto carregado com sucesso.');
      } catch {
        alert('Arquivo inválido. Selecione o JSON salvo por este projeto.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file, 'UTF-8');
  });
}

function saveProject() {
  ensureMapView();
  const safe = (project.company.name || 'Minha_Empresa')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\wÀ-ÿ-]/g, '');

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Rede_${safe}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderDashboard() {
  $('#statEquipamentos').textContent = project.equipment.length;
  $('#statDepartamentos').textContent = project.departments.length;
  $('#statConexoes').textContent = project.connections.length;
  $('#statHistorico').textContent = project.history.length;
  $('#tituloEmpresa').textContent = project.company.name || 'Minha Empresa';

  let text = `${project.company.name || 'Minha Empresa'} possui ${project.equipment.length} equipamento(s), ${project.departments.length} departamento(s) e ${project.connections.length} conexão(ões).`;
  if (project.company.description) text += ' ' + project.company.description;
  $('#resumoEmpresa').textContent = text;
}

function renderCompany() {
  $('#empresaNome').value = project.company.name || '';
  $('#empresaGrupo').value = project.company.group || '';
  $('#empresaIntegrantes').value = project.company.members || '';
  $('#empresaDescricao').value = project.company.description || '';
}

function renderDepartments() {
  const list = $('#listaDepartamentos');
  list.innerHTML = '';

  if (!project.departments.length) {
    list.innerHTML = '<div class="panel"><p>Nenhum departamento criado ainda.</p></div>';
    return;
  }

  project.departments.forEach(dep => {
    const count = project.equipment.filter(e => e.departmentId === dep.id).length;
    const card = document.createElement('article');
    card.className = 'department-card';
    card.innerHTML = `<h3>${escapeHtml(dep.name)}</h3><p>${count} equipamento(s)</p><button class="btn btn-danger">Excluir</button>`;
    card.querySelector('button').addEventListener('click', () => deleteDepartment(dep.id));
    list.appendChild(card);
  });
}

function renderAddressTable() {
  const body = $('#tabelaEnderecos');
  body.innerHTML = '';

  if (!project.equipment.length) {
    body.innerHTML = '<tr><td colspan="7">Nenhum equipamento cadastrado.</td></tr>';
    return;
  }

  project.equipment.forEach(equipment => {
    const dep = project.departments.find(d => d.id === equipment.departmentId);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(equipment.name)}</td>
      <td>${escapeHtml(typeNames[equipment.type] || equipment.type)}</td>
      <td>${escapeHtml(dep ? dep.name : '-')}</td>
      <td>${escapeHtml(equipment.ip || '-')}</td>
      <td>${escapeHtml(equipment.prefix || '-')}</td>
      <td>${escapeHtml(equipment.mac || '-')}</td>
      <td><span class="status ${equipment.status}">${statusText(equipment.status)}</span></td>
    `;
    body.appendChild(row);
  });
}

function renderHistory() {
  const list = $('#listaHistorico');
  list.innerHTML = '';

  if (!project.history.length) {
    list.innerHTML = '<div class="panel"><p>Nenhuma alteração automática registrada ainda.</p></div>';
    return;
  }

  project.history.forEach(item => {
    const [year, month, day] = (item.date || today()).split('-');
    const element = document.createElement('article');
    element.className = 'timeline-item';
    element.innerHTML = `<div class="timeline-meta">${day}/${month}/${year} • ${escapeHtml(item.type)}</div><p>${escapeHtml(item.description)}</p>`;
    list.appendChild(element);
  });
}

function renderAll() {
  ensureMapView();
  renderDashboard();
  renderCompany();
  renderDepartments();
  renderMap();
  renderAddressTable();
  renderHistory();
}
