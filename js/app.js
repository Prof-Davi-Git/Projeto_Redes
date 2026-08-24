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

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupCompany();
  setupDepartments();
  setupMap();
  setupHistory();
  setupSaveOpen();
  $('#historicoData').value = today();
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
    project.company.name = $('#empresaNome').value.trim() || 'Minha Empresa';
    project.company.group = $('#empresaGrupo').value.trim();
    project.company.members = $('#empresaIntegrantes').value.trim();
    project.company.description = $('#empresaDescricao').value.trim();
    addHistory('Configuração', 'Dados da empresa foram atualizados.');
    renderAll();
    alert('Dados da empresa salvos.');
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
  $('#btnConectar').addEventListener('click', startConnect);
  $('#btnCancelarConexao').addEventListener('click', cancelConnect);
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
  addHistory('Expansão', `${equipment.name} foi adicionado ao mapa.`);
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
      <span class="icon">${icons[equipment.type] || '🔧'}</span>
      <strong>${escapeHtml(equipment.name)}</strong>
      <small>${escapeHtml(equipment.ip || (dep ? dep.name : 'Sem configuração'))}</small>
    `;

    el.addEventListener('pointerdown', dragStart);
    el.addEventListener('dblclick', event => {
      event.stopPropagation();
      openModal(equipment.id);
    });
    el.addEventListener('click', event => {
      if (connectMode) {
        event.stopPropagation();
        selectConnect(equipment.id);
      }
    });

    world.appendChild(el);
  });

  setTimeout(drawConnections, 0);
}

function dragStart(event) {
  if (connectMode) return;

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

function startConnect() {
  if (project.equipment.length < 2) return alert('Adicione pelo menos dois equipamentos.');
  connectMode = true;
  firstConnect = null;
  $('#btnConectar').classList.add('hidden');
  $('#btnCancelarConexao').classList.remove('hidden');
  $('#statusConexao').textContent = 'Modo conectar: clique no primeiro equipamento.';
  $('#statusConexao').classList.add('active');
}

function cancelConnect() {
  connectMode = false;
  firstConnect = null;
  $('#btnConectar').classList.remove('hidden');
  $('#btnCancelarConexao').classList.add('hidden');
  $('#statusConexao').textContent = 'Arraste os equipamentos para organizar a rede. Dê dois cliques para editar.';
  $('#statusConexao').classList.remove('active');
  $$('.equipment').forEach(el => el.classList.remove('selected'));
}

function selectConnect(eqId) {
  if (!firstConnect) {
    firstConnect = eqId;
    document.querySelector(`.equipment[data-id="${eqId}"]`)?.classList.add('selected');
    $('#statusConexao').textContent = 'Agora clique no segundo equipamento.';
    return;
  }

  if (firstConnect === eqId) return alert('Escolha outro equipamento.');

  const exists = project.connections.some(c =>
    (c.from === firstConnect && c.to === eqId) ||
    (c.from === eqId && c.to === firstConnect)
  );

  if (exists) {
    alert('Esses equipamentos já estão conectados.');
    return cancelConnect();
  }

  const a = project.equipment.find(e => e.id === firstConnect);
  const b = project.equipment.find(e => e.id === eqId);
  project.connections.push({ id: id('con'), from: firstConnect, to: eqId });
  addHistory('Configuração', `Conexão criada entre ${a.name} e ${b.name}.`);
  cancelConnect();
  renderAll();
}

function drawConnections() {
  const svg = $('#connectionLayer');
  if (!svg) return;

  const view = ensureMapView();
  svg.setAttribute('viewBox', `0 0 ${view.width} ${view.height}`);
  svg.innerHTML = '';

  project.connections.forEach(connection => {
    const a = document.querySelector(`.equipment[data-id="${connection.from}"]`);
    const b = document.querySelector(`.equipment[data-id="${connection.to}"]`);
    if (!a || !b) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.offsetLeft + a.offsetWidth / 2);
    line.setAttribute('y1', a.offsetTop + a.offsetHeight / 2);
    line.setAttribute('x2', b.offsetLeft + b.offsetWidth / 2);
    line.setAttribute('y2', b.offsetTop + b.offsetHeight / 2);
    line.setAttribute('stroke', '#2563eb');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '.75');
    svg.appendChild(line);
  });
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

  equipment.name = $('#equipNome').value.trim() || equipment.name;
  equipment.departmentId = $('#equipDepartamento').value;
  equipment.ip = $('#equipIp').value.trim();
  equipment.prefix = $('#equipPrefixo').value.trim();
  equipment.mac = $('#equipMac').value.trim();
  equipment.status = $('#equipStatus').value;
  equipment.notes = $('#equipObservacoes').value.trim();

  addHistory('Configuração', `${equipment.name} teve suas configurações atualizadas.`);
  closeModal();
  renderAll();
}

function deleteCurrentEquipment() {
  const equipment = project.equipment.find(item => item.id === editingId);
  if (!equipment) return;
  if (!confirm(`Excluir ${equipment.name}?`)) return;

  project.equipment = project.equipment.filter(item => item.id !== equipment.id);
  project.connections = project.connections.filter(c => c.from !== equipment.id && c.to !== equipment.id);
  addHistory('Correção', `${equipment.name} foi removido da rede.`);
  closeModal();
  renderAll();
}

function setupHistory() {
  $('#btnAdicionarHistorico').addEventListener('click', () => {
    const description = $('#historicoDescricao').value.trim();
    if (!description) return alert('Descreva o que foi feito.');

    project.history.unshift({
      id: id('hist'),
      date: $('#historicoData').value || today(),
      type: $('#historicoTipo').value,
      description
    });

    $('#historicoDescricao').value = '';
    $('#historicoData').value = today();
    renderAll();
  });
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
    list.innerHTML = '<div class="panel"><p>Nenhuma alteração registrada ainda.</p></div>';
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
