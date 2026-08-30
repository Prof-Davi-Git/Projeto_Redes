/* =========================================================
   ANDARES - Projeto de Redes
   - múltiplos mapas dentro da mesma empresa
   - compatibilidade automática com JSONs antigos
   - cada andar possui equipamentos e visualização próprios
   ========================================================= */

(() => {
  if (
    typeof project === 'undefined' ||
    typeof renderMap !== 'function' ||
    typeof renderAll !== 'function' ||
    typeof ensureMapView !== 'function'
  ) return;

  const DEFAULT_FLOOR_ID = 'floor_terreo';

  const originalRenderMap = renderMap;
  const originalRenderAll = renderAll;
  const originalStartConnect = typeof startConnect === 'function' ? startConnect : null;
  const originalOpenModal = typeof openModal === 'function' ? openModal : null;
  const originalSaveEquipmentEdit = typeof saveEquipmentEdit === 'function' ? saveEquipmentEdit : null;

  function floorUid() {
    if (typeof id === 'function') return id('floor');
    return `floor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function copyDefaultView(source = null) {
    const base = source && typeof source === 'object' ? source : {};
    return {
      zoom: Number(base.zoom) || MAP_DEFAULT.zoom,
      width: Number(base.width) || MAP_DEFAULT.width,
      height: Number(base.height) || MAP_DEFAULT.height
    };
  }

  function ensureBuilding() {
    if (!project.company || typeof project.company !== 'object') project.company = {};

    let building = project.company.building;
    const hasValidFloors = building && typeof building === 'object' && Array.isArray(building.floors) && building.floors.length;

    if (!hasValidFloors) {
      building = {
        version: 1,
        floors: [{ id: DEFAULT_FLOOR_ID, name: 'Térreo' }],
        activeFloorId: DEFAULT_FLOOR_ID,
        floorViews: {
          [DEFAULT_FLOOR_ID]: copyDefaultView(project.mapView)
        }
      };
      project.company.building = building;
    }

    building.version = 1;

    const usedIds = new Set();
    building.floors = building.floors.map((floor, index) => {
      let floorId = String(floor?.id || '').trim() || (index === 0 ? DEFAULT_FLOOR_ID : floorUid());
      while (usedIds.has(floorId)) floorId = floorUid();
      usedIds.add(floorId);

      return {
        id: floorId,
        name: String(floor?.name || '').trim() || (index === 0 ? 'Térreo' : `Andar ${index + 1}`)
      };
    });

    if (!building.floorViews || typeof building.floorViews !== 'object' || Array.isArray(building.floorViews)) {
      building.floorViews = {};
    }

    building.floors.forEach((floor, index) => {
      if (!building.floorViews[floor.id] || typeof building.floorViews[floor.id] !== 'object') {
        building.floorViews[floor.id] = copyDefaultView(index === 0 ? project.mapView : null);
      }
    });

    const validIds = new Set(building.floors.map(floor => floor.id));
    if (!validIds.has(building.activeFloorId)) {
      building.activeFloorId = building.floors[0].id;
    }

    const fallbackFloorId = building.floors[0].id;
    project.equipment.forEach(equipment => {
      if (!validIds.has(equipment.floorId)) equipment.floorId = fallbackFloorId;
    });

    return building;
  }

  function activeFloor() {
    const building = ensureBuilding();
    return building.floors.find(floor => floor.id === building.activeFloorId) || building.floors[0];
  }

  function floorById(floorId) {
    return ensureBuilding().floors.find(floor => floor.id === floorId) || null;
  }

  function equipmentOnFloor(floorId = activeFloor().id) {
    return project.equipment.filter(equipment => equipment.floorId === floorId);
  }

  ensureMapView = function() {
    const building = ensureBuilding();
    const floor = activeFloor();
    let view = building.floorViews[floor.id];

    if (!view || typeof view !== 'object') {
      view = copyDefaultView();
      building.floorViews[floor.id] = view;
    }

    view.zoom = clamp(Number(view.zoom) || 1, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom);
    view.width = clamp(Math.round(Number(view.width) || MAP_DEFAULT.width), MAP_DEFAULT.width, MAP_LIMITS.maxWidth);
    view.height = clamp(Math.round(Number(view.height) || MAP_DEFAULT.height), MAP_DEFAULT.height, MAP_LIMITS.maxHeight);

    const visibleEquipment = equipmentOnFloor(floor.id);
    const maxX = visibleEquipment.reduce((max, equipment) => Math.max(max, Number(equipment.x) || 0), 0);
    const maxY = visibleEquipment.reduce((max, equipment) => Math.max(max, Number(equipment.y) || 0), 0);

    if (maxX + 300 > view.width) view.width = Math.min(MAP_LIMITS.maxWidth, maxX + 300);
    if (maxY + 240 > view.height) view.height = Math.min(MAP_LIMITS.maxHeight, maxY + 240);

    // Mantém o campo legado para compatibilidade com o núcleo do projeto.
    project.mapView = view;
    return view;
  };

  renderMap = function() {
    ensureBuilding();
    const floor = activeFloor();
    const allEquipment = project.equipment;

    project.equipment = allEquipment.filter(equipment => equipment.floorId === floor.id);
    try {
      return originalRenderMap();
    } finally {
      project.equipment = allEquipment;
    }
  };

  addEquipment = function() {
    const floor = activeFloor();
    const type = document.querySelector('#tipoEquipamento')?.value;
    if (!type) return;

    const number = project.equipment.filter(equipment => equipment.type === type).length + 1;
    const view = ensureMapView();
    const visibleEquipment = equipmentOnFloor(floor.id);
    const index = visibleEquipment.length;
    const columns = 6;
    const x = 50 + (index % columns) * 150;
    const y = 55 + Math.floor(index / columns) * 125;

    const equipment = {
      id: typeof id === 'function' ? id('eq') : `eq_${Date.now()}`,
      type,
      name: `${typeNames[type] || type}-${String(number).padStart(2, '0')}`,
      departmentId: '',
      floorId: floor.id,
      ip: '',
      prefix: '',
      mac: '',
      status: 'ativo',
      notes: '',
      x: Math.min(x, view.width - 180),
      y: Math.min(y, view.height - 150)
    };

    project.equipment.push(equipment);
    addHistory(
      'Expansão',
      `${typeNames[type] || type} "${equipment.name}" foi adicionado ao mapa do andar "${floor.name}".`
    );
    renderAll();
  };

  if (originalStartConnect) {
    startConnect = function() {
      const floor = activeFloor();
      if (equipmentOnFloor(floor.id).length < 2) {
        return alert(`Adicione pelo menos dois equipamentos no andar "${floor.name}" para criar uma conexão.`);
      }
      return originalStartConnect();
    };
  }

  function injectFloorManager() {
    const mapSection = document.querySelector('#mapa');
    const toolbar = mapSection?.querySelector('.toolbar');
    if (!mapSection || !toolbar || document.querySelector('#floorManager')) return;

    const manager = document.createElement('div');
    manager.id = 'floorManager';
    manager.className = 'floor-manager';
    manager.innerHTML = `
      <div class="floor-manager-head">
        <div class="floor-manager-title">
          <small>ANDARES DA EMPRESA</small>
          <strong>Selecione o andar que deseja organizar</strong>
        </div>
        <div class="floor-add">
          <input id="novoAndarNome" type="text" placeholder="Ex.: 1º Andar, Anexo ou Galpão" />
          <button id="btnAdicionarAndar" class="btn btn-secondary" type="button">+ Adicionar andar</button>
        </div>
      </div>
      <div id="floorTabs" class="floor-tabs"></div>
      <div class="floor-current">
        <div id="floorCurrentInfo" class="floor-current-info"></div>
        <div class="floor-current-actions">
          <button id="btnRenomearAndar" class="floor-small-btn" type="button">Renomear andar</button>
          <button id="btnExcluirAndar" class="floor-small-btn danger" type="button">Excluir andar</button>
        </div>
      </div>
    `;

    mapSection.insertBefore(manager, toolbar);

    manager.querySelector('#btnAdicionarAndar').addEventListener('click', createFloor);
    manager.querySelector('#btnRenomearAndar').addEventListener('click', renameFloor);
    manager.querySelector('#btnExcluirAndar').addEventListener('click', deleteFloor);

    manager.querySelector('#novoAndarNome').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        createFloor();
      }
    });
  }

  function injectFloorFieldInEquipmentModal() {
    const form = document.querySelector('#modalEquipamento .form-grid');
    if (!form || document.querySelector('#equipFloor')) return;

    const label = document.createElement('label');
    label.id = 'equipFloorField';
    label.innerHTML = 'Andar<select id="equipFloor"></select>';

    if (form.children.length > 1) form.insertBefore(label, form.children[1]);
    else form.appendChild(label);
  }

  function injectFloorColumnInAddressTable() {
    const headRow = document.querySelector('#enderecamento thead tr');
    if (!headRow || headRow.querySelector('[data-floor-column]')) return;

    const headers = Array.from(headRow.children);
    const departmentHeader = headers.find(header => header.textContent.trim() === 'Departamento');
    const th = document.createElement('th');
    th.dataset.floorColumn = '1';
    th.textContent = 'Andar';

    if (departmentHeader?.nextSibling) headRow.insertBefore(th, departmentHeader.nextSibling);
    else headRow.appendChild(th);
  }

  function injectFloorStat() {
    const stats = document.querySelector('#dashboard .stats');
    if (!stats || document.querySelector('#statAndares')) return;

    const card = document.createElement('article');
    card.className = 'stat-card';
    card.innerHTML = '<span>🏬</span><div><small>Andares</small><strong id="statAndares">1</strong></div>';
    stats.appendChild(card);
  }

  function renderFloorTabs() {
    const building = ensureBuilding();
    const tabs = document.querySelector('#floorTabs');
    const currentInfo = document.querySelector('#floorCurrentInfo');
    const deleteButton = document.querySelector('#btnExcluirAndar');
    const current = activeFloor();

    if (tabs) {
      tabs.innerHTML = building.floors.map(floor => {
        const count = equipmentOnFloor(floor.id).length;
        return `
          <button class="floor-tab ${floor.id === current.id ? 'active' : ''}" type="button" data-floor-id="${escapeHtml(floor.id)}">
            <span>${escapeHtml(floor.name)}</span>
            <span class="floor-tab-count">${count}</span>
          </button>
        `;
      }).join('');

      tabs.querySelectorAll('.floor-tab').forEach(button => {
        button.addEventListener('click', () => switchFloor(button.dataset.floorId));
      });
    }

    const count = equipmentOnFloor(current.id).length;
    if (currentInfo) {
      currentInfo.innerHTML = `<strong>${escapeHtml(current.name)}</strong> • ${count} equipamento(s) neste mapa`;
    }

    if (deleteButton) {
      deleteButton.disabled = building.floors.length <= 1;
      deleteButton.title = building.floors.length <= 1
        ? 'A empresa precisa manter pelo menos um andar.'
        : 'Excluir o andar atual se ele estiver vazio.';
    }

    const stat = document.querySelector('#statAndares');
    if (stat) stat.textContent = building.floors.length;

    const badge = document.querySelector('#floorLocationBadge');
    if (badge) badge.innerHTML = `Andar atual: <strong>${escapeHtml(current.name)}</strong>`;
  }

  function renderAddressTableWithFloors() {
    ensureBuilding();
    injectFloorColumnInAddressTable();

    const body = document.querySelector('#tabelaEnderecos');
    if (!body) return;
    body.innerHTML = '';

    if (!project.equipment.length) {
      body.innerHTML = '<tr><td colspan="8">Nenhum equipamento cadastrado.</td></tr>';
      return;
    }

    project.equipment.forEach(equipment => {
      const department = project.departments.find(dep => dep.id === equipment.departmentId);
      const floor = floorById(equipment.floorId);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(equipment.name)}</td>
        <td>${escapeHtml(typeNames[equipment.type] || equipment.type)}</td>
        <td>${escapeHtml(department ? department.name : '-')}</td>
        <td>${escapeHtml(floor ? floor.name : 'Térreo')}</td>
        <td>${escapeHtml(equipment.ip || '-')}</td>
        <td>${escapeHtml(equipment.prefix || '-')}</td>
        <td>${escapeHtml(equipment.mac || '-')}</td>
        <td><span class="status ${equipment.status}">${statusText(equipment.status)}</span></td>
      `;
      body.appendChild(row);
    });
  }

  function createFloor() {
    const input = document.querySelector('#novoAndarNome');
    const name = input?.value.trim() || '';
    if (!name) return alert('Digite um nome para o novo andar.');

    const building = ensureBuilding();
    if (building.floors.some(floor => floor.name.toLowerCase() === name.toLowerCase())) {
      return alert('Já existe um andar com esse nome.');
    }

    const floor = { id: floorUid(), name };
    building.floors.push(floor);
    building.floorViews[floor.id] = copyDefaultView();
    building.activeFloorId = floor.id;
    project.mapView = building.floorViews[floor.id];

    if (input) input.value = '';

    addHistory('Expansão', `Andar "${name}" foi criado no Mapa da Rede.`);
    resetMapViewport();
    renderAll();
  }

  function renameFloor() {
    const building = ensureBuilding();
    const floor = activeFloor();
    const nextName = prompt('Digite o novo nome do andar:', floor.name);
    if (nextName === null) return;

    const name = nextName.trim();
    if (!name) return alert('O nome do andar não pode ficar vazio.');
    if (name === floor.name) return;
    if (building.floors.some(item => item.id !== floor.id && item.name.toLowerCase() === name.toLowerCase())) {
      return alert('Já existe um andar com esse nome.');
    }

    const previousName = floor.name;
    floor.name = name;
    addHistory('Configuração', `Andar "${previousName}" foi renomeado para "${name}".`);
    renderAll();
  }

  function deleteFloor() {
    const building = ensureBuilding();
    const floor = activeFloor();

    if (building.floors.length <= 1) {
      return alert('A empresa precisa manter pelo menos um andar.');
    }

    const count = equipmentOnFloor(floor.id).length;
    if (count) {
      return alert(`O andar "${floor.name}" possui ${count} equipamento(s). Mova ou exclua esses equipamentos antes de excluir o andar.`);
    }

    if (!confirm(`Excluir o andar "${floor.name}"?`)) return;

    building.floors = building.floors.filter(item => item.id !== floor.id);
    delete building.floorViews[floor.id];
    building.activeFloorId = building.floors[0].id;
    project.mapView = building.floorViews[building.activeFloorId];

    addHistory('Correção', `Andar "${floor.name}" foi removido do Mapa da Rede.`);
    resetMapViewport();
    renderAll();
  }

  function switchFloor(floorId) {
    const building = ensureBuilding();
    if (!building.floors.some(floor => floor.id === floorId)) return;
    if (building.activeFloorId === floorId) return;

    building.activeFloorId = floorId;
    project.mapView = building.floorViews[floorId] || copyDefaultView();
    building.floorViews[floorId] = project.mapView;

    if (typeof cancelConnect === 'function') cancelConnect();
    if (typeof closeModal === 'function') closeModal();
    resetMapViewport();
    renderAll();
  }

  function resetMapViewport() {
    const canvas = document.querySelector('#networkCanvas');
    if (canvas) {
      canvas.scrollLeft = 0;
      canvas.scrollTop = 0;
    }
  }

  function fillFloorSelect(equipmentId) {
    const select = document.querySelector('#equipFloor');
    if (!select) return;

    const building = ensureBuilding();
    const equipment = project.equipment.find(item => item.id === equipmentId);
    if (!equipment) return;

    select.innerHTML = building.floors.map(floor =>
      `<option value="${escapeHtml(floor.id)}">${escapeHtml(floor.name)}</option>`
    ).join('');
    select.value = equipment.floorId || building.floors[0].id;
  }

  if (originalOpenModal) {
    openModal = function(equipmentId) {
      const result = originalOpenModal(equipmentId);
      fillFloorSelect(equipmentId);
      return result;
    };
  }

  if (originalSaveEquipmentEdit) {
    saveEquipmentEdit = function() {
      const equipment = project.equipment.find(item => item.id === editingId);
      const select = document.querySelector('#equipFloor');

      if (equipment && select) {
        const building = ensureBuilding();
        const previousFloorId = equipment.floorId || building.floors[0].id;
        const nextFloorId = select.value || previousFloorId;

        if (nextFloorId !== previousFloorId) {
          const previousFloor = floorById(previousFloorId);
          const nextFloor = floorById(nextFloorId);
          if (!nextFloor) return alert('Selecione um andar válido.');

          const linkedConnections = project.connections.filter(connection =>
            connection.from === equipment.id || connection.to === equipment.id
          );

          if (linkedConnections.length) {
            const confirmed = confirm(
              `O equipamento "${equipment.name}" possui ${linkedConnections.length} conexão(ões). ` +
              `Ao movê-lo para outro andar, essas conexões serão removidas. Deseja continuar?`
            );
            if (!confirmed) return;
          }

          equipment.floorId = nextFloorId;
          if (linkedConnections.length) {
            project.connections = project.connections.filter(connection =>
              connection.from !== equipment.id && connection.to !== equipment.id
            );
          }

          const removedText = linkedConnections.length
            ? ` ${linkedConnections.length} conexão(ões) vinculada(s) foram removidas.`
            : '';

          addHistory(
            'Configuração',
            `Equipamento "${equipment.name}" foi movido do andar "${previousFloor?.name || 'Térreo'}" para "${nextFloor.name}".${removedText}`
          );
        }
      }

      return originalSaveEquipmentEdit();
    };
  }

  renderAddressTable = renderAddressTableWithFloors;

  renderAll = function() {
    ensureBuilding();
    const result = originalRenderAll();
    renderFloorTabs();
    return result;
  };

  function start() {
    ensureBuilding();
    injectFloorManager();
    injectFloorFieldInEquipmentModal();
    injectFloorColumnInAddressTable();
    injectFloorStat();
    renderFloorTabs();
    renderAddressTableWithFloors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
