/* =========================================================
   VISUALIZAÇÃO REALISTA DA EMPRESA
   - Gera uma imagem do andar diretamente no navegador
   - Usa os andares, departamentos, equipamentos, posições
     e conexões já existentes no Mapa da Rede
   - Sem API, sem biblioteca externa e sem créditos
   - Permite baixar cada andar em PNG
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

  const TYPE_NAMES = {
    computador: 'Computador',
    notebook: 'Notebook',
    switch: 'Switch',
    roteador: 'Roteador',
    servidor: 'Servidor',
    impressora: 'Impressora',
    'access-point': 'Access Point'
  };

  const DEPARTMENT_COLORS = [
    ['#dbeafe', '#2563eb'],
    ['#dcfce7', '#16a34a'],
    ['#fef3c7', '#d97706'],
    ['#fce7f3', '#db2777'],
    ['#ede9fe', '#7c3aed'],
    ['#cffafe', '#0891b2'],
    ['#fee2e2', '#dc2626'],
    ['#e2e8f0', '#475569']
  ];

  const state = {
    floorId: '',
    showPeople: true,
    showCables: true,
    presentation: false
  };

  let loadWatch = null;
  let resizeTimer = null;

  function ensureVisualPrefs() {
    if (!project.company || typeof project.company !== 'object') project.company = {};
    const old = project.company.visual && typeof project.company.visual === 'object'
      ? project.company.visual
      : {};

    project.company.visual = {
      ...old,
      visualVersion: 5,
      officeView: {
        showPeople: old.officeView?.showPeople !== false,
        showCables: old.officeView?.showCables !== false
      }
    };

    state.showPeople = project.company.visual.officeView.showPeople;
    state.showCables = project.company.visual.officeView.showCables;

    return project.company.visual;
  }

  function getData() {
    const building = project.company?.building;
    const floors = Array.isArray(building?.floors) && building.floors.length
      ? building.floors
      : [{ id: 'floor_terreo', name: 'Térreo' }];

    const floorIds = new Set(floors.map(f => f.id));
    const fallbackFloorId = floors[0].id;

    if (!state.floorId || !floorIds.has(state.floorId)) {
      state.floorId = building?.activeFloorId && floorIds.has(building.activeFloorId)
        ? building.activeFloorId
        : floors[0].id;
    }

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

  function floorIdForEquipment(item, data) {
    return data.floorIds.has(item.floorId) ? item.floorId : data.fallbackFloorId;
  }

  function equipmentOnFloor(floorId, data) {
    return data.equipment.filter(item => floorIdForEquipment(item, data) === floorId);
  }

  function connectionsOnFloor(floorId, data) {
    const ids = new Set(equipmentOnFloor(floorId, data).map(item => item.id));
    return data.connections.filter(c => ids.has(c.from) && ids.has(c.to));
  }

  function depById(id, data) {
    return data.departments.find(dep => dep.id === id) || null;
  }

  function hashString(text) {
    let h = 2166136261;
    for (const ch of String(text || '')) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function departmentStyle(depId, data) {
    const index = hashString(depId || 'sem-setor') % DEPARTMENT_COLORS.length;
    return DEPARTMENT_COLORS[index];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function withShadow(ctx, blur, color, offsetY, fn) {
    ctx.save();
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.shadowOffsetY = offsetY;
    fn();
    ctx.restore();
  }

  function drawFloorBase(ctx, W, H) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(1, '#e5e7eb');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    withShadow(ctx, 28, 'rgba(15,23,42,.18)', 12, () => {
      roundRect(ctx, 70, 70, W - 140, H - 140, 20, '#f3efe8', '#cbd5e1', 4);
    });

    // Padrão de piso discreto
    ctx.save();
    ctx.beginPath();
    ctx.rect(76, 76, W - 152, H - 152);
    ctx.clip();
    ctx.strokeStyle = 'rgba(148,163,184,.12)';
    ctx.lineWidth = 1;

    for (let x = 76; x < W - 76; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 76);
      ctx.lineTo(x, H - 76);
      ctx.stroke();
    }
    for (let y = 76; y < H - 76; y += 58) {
      ctx.beginPath();
      ctx.moveTo(76, y);
      ctx.lineTo(W - 76, y);
      ctx.stroke();
    }
    ctx.restore();

    // Paredes externas
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 14;
    ctx.strokeRect(76, 76, W - 152, H - 152);

    // Janelas na parede superior
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 8;
    for (let x = 145; x < W - 160; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, 76);
      ctx.lineTo(Math.min(x + 86, W - 90), 76);
      ctx.stroke();
    }

    // Entrada
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 55, H - 76);
    ctx.lineTo(W / 2 + 55, H - 76);
    ctx.stroke();
  }

  function originalNormalizedPoint(item, floorId, data) {
    const view = data.floorViews?.[floorId] || project.mapView || {};
    const mapW = Math.max(1, Number(view.width) || 1400);
    const mapH = Math.max(1, Number(view.height) || 900);

    return {
      x: clamp((Number(item.x) + 60) / mapW, 0.02, 0.98),
      y: clamp((Number(item.y) + 48) / mapH, 0.02, 0.98)
    };
  }

  function buildDepartmentGroups(items, floorId, data) {
    const grouped = new Map();

    items.forEach(item => {
      const key = item.departmentId || '__none__';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    return [...grouped.entries()].map(([depId, groupItems]) => {
      const original = groupItems.map(item => originalNormalizedPoint(item, floorId, data));
      const centroid = {
        x: original.reduce((sum, p) => sum + p.x, 0) / original.length,
        y: original.reduce((sum, p) => sum + p.y, 0) / original.length
      };

      return {
        depId,
        name: depId === '__none__'
          ? 'Infraestrutura compartilhada'
          : (depById(depId, data)?.name || 'Departamento'),
        items: groupItems,
        centroid
      };
    });
  }

  function chooseGrid(groupCount) {
    if (groupCount <= 1) return { cols: 1, rows: 1 };
    if (groupCount === 2) return { cols: 2, rows: 1 };
    if (groupCount === 3) return { cols: 3, rows: 1 };
    if (groupCount === 4) return { cols: 2, rows: 2 };
    if (groupCount <= 6) return { cols: 3, rows: 2 };

    const cols = Math.min(4, Math.ceil(Math.sqrt(groupCount)));
    return { cols, rows: Math.ceil(groupCount / cols) };
  }

  function assignGroupsToSlots(groups, slots, rows) {
    const remaining = [...slots];
    const sortedGroups = [...groups].sort((a, b) => {
      if (rows === 1) return a.centroid.x - b.centroid.x;
      const rowDelta = a.centroid.y - b.centroid.y;
      if (Math.abs(rowDelta) > 0.12) return rowDelta;
      return a.centroid.x - b.centroid.x;
    });

    const assigned = [];

    sortedGroups.forEach(group => {
      let bestIndex = 0;
      let bestScore = Infinity;

      remaining.forEach((slot, index) => {
        const dx = group.centroid.x - slot.nx;
        const dy = group.centroid.y - slot.ny;
        const score = dx * dx + dy * dy * 1.25;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      const slot = remaining.splice(bestIndex, 1)[0];
      assigned.push({ ...group, ...slot });
    });

    return assigned;
  }

  function buildOfficeLayout(items, floorId, data, W, H) {
    const groups = buildDepartmentGroups(items, floorId, data);
    if (!groups.length) return { zones: [], pointMap: new Map() };

    const { cols, rows } = chooseGrid(groups.length);
    const area = {
      x: 120,
      y: 205,
      w: W - 240,
      h: H - 360
    };

    const gapX = 34;
    const gapY = 34;
    const slotW = (area.w - gapX * (cols - 1)) / cols;
    const slotH = (area.h - gapY * (rows - 1)) / rows;
    const slots = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = area.x + col * (slotW + gapX);
        const y = area.y + row * (slotH + gapY);
        slots.push({
          x,
          y,
          w: slotW,
          h: slotH,
          nx: cols === 1 ? .5 : col / (cols - 1),
          ny: rows === 1 ? .5 : row / (rows - 1)
        });
      }
    }

    const assigned = assignGroupsToSlots(groups, slots, rows);
    const pointMap = new Map();

    const zones = assigned.map(zone => {
      const infrastructure = zone.items.filter(item =>
        !['computador', 'notebook'].includes(item.type)
      );
      const workstations = zone.items.filter(item =>
        ['computador', 'notebook'].includes(item.type)
      );

      const headerH = 62;
      const pad = 26;
      const infraH = infrastructure.length ? 128 : 22;
      const workX = zone.x + pad;
      const workY = zone.y + headerH + 18;
      const workW = zone.w - pad * 2;
      const workH = Math.max(110, zone.h - headerH - infraH - 42);

      if (workstations.length) {
        const desiredCols = Math.ceil(Math.sqrt(workstations.length * Math.max(1.15, workW / Math.max(1, workH))));
        const stationCols = clamp(desiredCols, 1, Math.min(4, workstations.length));
        const stationRows = Math.ceil(workstations.length / stationCols);
        const cellW = workW / stationCols;
        const cellH = workH / stationRows;

        workstations.forEach((item, index) => {
          const col = index % stationCols;
          const row = Math.floor(index / stationCols);
          pointMap.set(item.id, {
            x: workX + cellW * (col + .5),
            y: workY + cellH * (row + .5),
            zoneId: zone.depId
          });
        });
      }

      if (infrastructure.length) {
        const infraY = zone.y + zone.h - 66;
        const usableW = zone.w - pad * 2;
        const step = usableW / infrastructure.length;

        infrastructure.forEach((item, index) => {
          pointMap.set(item.id, {
            x: zone.x + pad + step * (index + .5),
            y: infraY,
            zoneId: zone.depId
          });
        });
      }

      return {
        ...zone,
        workstations,
        infrastructure
      };
    });

    return { zones, pointMap };
  }

  function drawDepartmentZones(ctx, zones, data) {
    zones.forEach(zone => {
      const [fill, accent] = departmentStyle(zone.depId, data);

      ctx.save();
      ctx.globalAlpha = .68;
      roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 20, fill, accent, 4);
      ctx.restore();

      // Cabeçalho do setor
      ctx.save();
      ctx.globalAlpha = .94;
      roundRect(ctx, zone.x + 10, zone.y + 10, zone.w - 20, 46, 12, '#ffffff');
      ctx.restore();

      ctx.fillStyle = accent;
      ctx.font = '900 23px Arial, sans-serif';
      ctx.fillText(zone.name, zone.x + 28, zone.y + 41);

      ctx.fillStyle = '#64748b';
      ctx.font = '700 12px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${zone.items.length} equipamento(s)`,
        zone.x + zone.w - 28,
        zone.y + 40
      );
      ctx.textAlign = 'start';

      if (zone.infrastructure.length) {
        const lineY = zone.y + zone.h - 126;
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.globalAlpha = .28;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.moveTo(zone.x + 24, lineY);
        ctx.lineTo(zone.x + zone.w - 24, lineY);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#64748b';
        ctx.font = '800 11px Arial, sans-serif';
        ctx.fillText('ÁREA TÉCNICA / INFRAESTRUTURA', zone.x + 26, lineY + 21);
      }
    });
  }

  function drawPlant(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#8b5e3c';
    roundRect(ctx, -13, 4, 26, 20, 6, '#9a6a43');

    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 5;
    [
      [-2, 4, -14, -15],
      [1, 4, 13, -18],
      [0, 3, 0, -24],
      [-1, 4, -18, -3],
      [2, 4, 18, -5]
    ].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    });

    ctx.fillStyle = '#22c55e';
    [[-14,-16],[13,-18],[0,-25],[-19,-4],[18,-6]].forEach(([lx,ly]) => {
      ctx.beginPath();
      ctx.ellipse(lx, ly, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPerson(ctx, x, y, seed) {
    const shirts = ['#2563eb','#0f766e','#7c3aed','#be123c','#b45309','#475569'];
    const skin = ['#f1c27d','#e0ac69','#c68642','#8d5524'][seed % 4];
    const shirt = shirts[seed % shirts.length];

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -10, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shirt;
    roundRect(ctx, -8, -2, 16, 20, 7, shirt);

    ctx.fillStyle = '#334155';
    roundRect(ctx, -11, 16, 8, 15, 3, '#334155');
    roundRect(ctx, 3, 16, 8, 15, 3, '#334155');

    ctx.restore();
  }

  function drawWorkstation(ctx, x, y, item, data, isNotebook = false) {
    const [, accent] = departmentStyle(item.departmentId || item.id, data);

    ctx.save();
    ctx.globalAlpha = .13;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 78, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cadeira
    roundRect(ctx, x - 18, y + 42, 36, 28, 9, '#334155');
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(x, y + 76, 12, 0, Math.PI * 2);
    ctx.fill();

    // Mesa maior para facilitar a leitura
    withShadow(ctx, 9, 'rgba(15,23,42,.16)', 5, () => {
      roundRect(ctx, x - 58, y - 28, 116, 56, 9, '#b9895a', '#8b5e3c', 2);
    });

    if (isNotebook) {
      roundRect(ctx, x - 24, y - 14, 48, 28, 4, '#1e293b');
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(x - 19, y - 10, 38, 18);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 17);
      ctx.lineTo(x + 30, y + 17);
      ctx.stroke();
    } else {
      roundRect(ctx, x - 28, y - 19, 56, 34, 4, '#1e293b');
      const screen = ctx.createLinearGradient(x - 23, y - 14, x + 23, y + 10);
      screen.addColorStop(0, '#0ea5e9');
      screen.addColorStop(1, '#dbeafe');
      ctx.fillStyle = screen;
      ctx.fillRect(x - 23, y - 14, 46, 22);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x, y + 24);
      ctx.stroke();
    }

    roundRect(ctx, x - 21, y + 9, 42, 9, 2, '#e2e8f0');

    if (state.showPeople) {
      drawPerson(ctx, x, y + 77, hashString(item.id));
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.name || TYPE_NAMES[item.type]).slice(0, 22), x, y - 45);
    ctx.textAlign = 'start';
  }

  function drawPrinter(ctx, x, y, item) {
    withShadow(ctx, 7, 'rgba(15,23,42,.18)', 4, () => {
      roundRect(ctx, x - 30, y - 24, 60, 48, 8, '#e5e7eb', '#94a3b8', 2);
    });
    roundRect(ctx, x - 22, y - 35, 44, 22, 4, '#f8fafc', '#cbd5e1');
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 17, y - 2, 34, 13);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + 20, y - 12, 3, 0, Math.PI * 2);
    ctx.fill();
    labelEquipment(ctx, x, y + 43, item.name || 'Impressora');
  }

  function drawServer(ctx, x, y, item) {
    withShadow(ctx, 9, 'rgba(15,23,42,.2)', 5, () => {
      roundRect(ctx, x - 27, y - 44, 54, 88, 6, '#1e293b', '#0f172a', 2);
    });

    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#334155' : '#475569';
      roundRect(ctx, x - 21, y - 35 + i * 12, 42, 8, 2, ctx.fillStyle);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x + 14, y - 31 + i * 12, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    labelEquipment(ctx, x, y + 59, item.name || 'Servidor');
  }

  function drawSwitch(ctx, x, y, item) {
    withShadow(ctx, 6, 'rgba(15,23,42,.17)', 3, () => {
      roundRect(ctx, x - 42, y - 18, 84, 36, 6, '#334155', '#0f172a', 2);
    });

    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#22c55e' : '#94a3b8';
      ctx.fillRect(x - 32 + i * 9, y - 4, 5, 5);
    }
    labelEquipment(ctx, x, y + 34, item.name || 'Switch');
  }

  function drawRouter(ctx, x, y, item) {
    roundRect(ctx, x - 38, y - 16, 76, 32, 8, '#1e293b', '#0f172a', 2);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    [-25, 25].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 14);
      ctx.lineTo(x + dx, y - 43);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x + dx, y - 45, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x - 15 + i * 10, y + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    labelEquipment(ctx, x, y + 34, item.name || 'Roteador');
  }

  function drawAccessPoint(ctx, x, y, item) {
    withShadow(ctx, 5, 'rgba(15,23,42,.12)', 2, () => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 3;
    [8, 14, 20].forEach(r => {
      ctx.beginPath();
      ctx.arc(x, y + 4, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    });
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(x, y + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    labelEquipment(ctx, x, y + 41, item.name || 'Access Point');
  }

  function labelEquipment(ctx, x, y, text) {
    ctx.fillStyle = '#334155';
    ctx.font = '700 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(text).slice(0, 24), x, y);
    ctx.textAlign = 'start';
  }

  function drawEquipment(ctx, item, point, data) {
    switch (item.type) {
      case 'computador':
        drawWorkstation(ctx, point.x, point.y, item, data, false);
        break;
      case 'notebook':
        drawWorkstation(ctx, point.x, point.y, item, data, true);
        break;
      case 'impressora':
        drawPrinter(ctx, point.x, point.y, item);
        break;
      case 'servidor':
        drawServer(ctx, point.x, point.y, item);
        break;
      case 'switch':
        drawSwitch(ctx, point.x, point.y, item);
        break;
      case 'roteador':
        drawRouter(ctx, point.x, point.y, item);
        break;
      case 'access-point':
        drawAccessPoint(ctx, point.x, point.y, item);
        break;
      default:
        labelEquipment(ctx, point.x, point.y, item.name || item.type);
    }
  }

  function drawConnections(ctx, connections, pointMap) {
    if (!state.showCables) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(37,99,235,.28)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);

    connections.forEach(connection => {
      const a = pointMap.get(connection.from);
      const b = pointMap.get(connection.to);
      if (!a || !b) return;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const midX = (a.x + b.x) / 2;
      ctx.bezierCurveTo(midX, a.y, midX, b.y, b.x, b.y);
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawDecor(ctx, W, H, seedBase) {
    const positions = [
      [120, 130], [W - 120, 130], [120, H - 130], [W - 120, H - 130]
    ];

    positions.forEach((p, index) => {
      if ((hashString(seedBase + index) % 3) !== 0) {
        drawPlant(ctx, p[0], p[1], .9);
      }
    });

    // Pequena área de espera próxima à entrada.
    const cx = W / 2;
    const cy = H - 130;
    roundRect(ctx, cx - 100, cy - 28, 70, 36, 9, '#64748b');
    roundRect(ctx, cx + 30, cy - 28, 70, 36, 9, '#64748b');
    roundRect(ctx, cx - 22, cy - 18, 44, 25, 8, '#c59b6d');
  }

  function renderCanvas() {
    const canvas = $('#empresaRealCanvas');
    if (!canvas) return;

    const data = getData();
    const floor = data.floors.find(f => f.id === state.floorId) || data.floors[0];
    const items = equipmentOnFloor(floor.id, data);
    const connections = connectionsOnFloor(floor.id, data);

    const W = 1800;
    const H = 1100;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawFloorBase(ctx, W, H);

    const layout = buildOfficeLayout(items, floor.id, data, W, H);
    drawDepartmentZones(ctx, layout.zones, data);

    // Decoração apenas nas bordas, sem disputar espaço com os departamentos.
    drawPlant(ctx, 112, H - 120, 1);
    drawPlant(ctx, W - 112, H - 120, 1);

    drawConnections(ctx, connections, layout.pointMap);

    const priority = {
      computador: 2,
      notebook: 2,
      impressora: 3,
      switch: 4,
      roteador: 4,
      servidor: 5,
      'access-point': 6
    };

    [...items]
      .sort((a, b) => (priority[a.type] || 1) - (priority[b.type] || 1))
      .forEach(item => {
        const point = layout.pointMap.get(item.id);
        if (point) drawEquipment(ctx, item, point, data);
      });

    // Área de espera central junto à entrada, fora das zonas.
    const receptionY = H - 125;
    roundRect(ctx, W / 2 - 118, receptionY - 22, 80, 38, 10, '#64748b');
    roundRect(ctx, W / 2 + 38, receptionY - 22, 80, 38, 10, '#64748b');
    roundRect(ctx, W / 2 - 28, receptionY - 12, 56, 26, 8, '#c59b6d');

    // Cabeçalho da imagem
    const company = project.company?.name || 'Minha Empresa';
    ctx.save();
    roundRect(ctx, 105, 102, 520, 82, 15, 'rgba(255,255,255,.95)', '#cbd5e1', 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 27px Arial, sans-serif';
    ctx.fillText(company, 130, 138);
    ctx.fillStyle = '#475569';
    ctx.font = '700 16px Arial, sans-serif';
    ctx.fillText(
      `${floor.name || 'Andar'} • ${items.length} equipamentos • ${connections.length} conexões`,
      130,
      166
    );
    ctx.restore();

    ctx.fillStyle = 'rgba(71,85,105,.72)';
    ctx.font = '600 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Organização baseada no Mapa da Rede', W - 100, H - 88);
    ctx.textAlign = 'start';

    updateStats(floor, items, connections, data);
  }

  function updateStats(floor, items, connections, data) {
    const floorName = $('#empresaRealFloorName');
    const floorMeta = $('#empresaRealFloorMeta');
    if (floorName) floorName.textContent = floor?.name || 'Andar';

    if (floorMeta) {
      const depCount = new Set(items.map(item => item.departmentId).filter(Boolean)).size;
      floorMeta.textContent =
        `${items.length} equipamento(s) • ${connections.length} conexão(ões) • ${depCount} departamento(s)`;
    }

    const empty = $('#empresaRealEmpty');
    if (empty) empty.classList.toggle('hidden', items.length > 0);
  }

  function renderFloorTabs() {
    const data = getData();
    const box = $('#empresaRealFloorTabs');
    if (!box) return;

    box.innerHTML = data.floors.map((floor, index) => {
      const items = equipmentOnFloor(floor.id, data);
      return `
        <button
          type="button"
          class="empresa-real-floor-tab ${floor.id === state.floorId ? 'active' : ''}"
          data-floor-id="${esc(floor.id)}"
        >
          <span>${index === 0 ? '🏢' : '🏬'}</span>
          <strong>${esc(floor.name || 'Andar')}</strong>
          <small>${items.length} equipamentos</small>
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-floor-id]').forEach(button => {
      button.addEventListener('click', () => {
        state.floorId = button.dataset.floorId;
        renderFloorTabs();
        renderCanvas();
      });
    });
  }

  function inject() {
    const screen = $('#empresa3d');
    if (!screen) return;

    screen.dataset.empresa3dReady = '1';
    screen.innerHTML = `
      <div class="section-title empresa-real-title">
        <div>
          <p class="eyebrow">VISUALIZAÇÃO DA EMPRESA</p>
          <h2>Ambiente Realista da Empresa</h2>
        </div>
        <span class="empresa-real-badge">Gerado pelo próprio projeto</span>
      </div>

      <div class="empresa-real-intro">
        <div>
          <strong>🏢 Transforme o Mapa da Rede em um ambiente empresarial</strong>
          <p>
            O sistema usa os andares, departamentos, posições e equipamentos que a equipe
            já cadastrou. Não é necessário preencher nada novamente.
          </p>
        </div>
        <div class="empresa-real-intro-list">
          <span>✓ Cada andar gera uma imagem diferente</span>
          <span>✓ Pessoas e mobiliário são adicionados automaticamente</span>
          <span>✓ A imagem pode ser usada no relatório e na apresentação</span>
        </div>
      </div>

      <div class="empresa-real-toolbar">
        <div id="empresaRealFloorTabs" class="empresa-real-floor-tabs"></div>

        <div class="empresa-real-actions">
          <button id="btnEmpresaRealAtualizar" class="btn btn-primary" type="button">
            ✨ Gerar / Atualizar
          </button>
          <button id="btnEmpresaRealPessoas" class="btn btn-secondary" type="button"></button>
          <button id="btnEmpresaRealCabos" class="btn btn-secondary" type="button"></button>
          <button id="btnEmpresaRealApresentacao" class="btn btn-secondary" type="button">
            🎥 Apresentação
          </button>
        </div>
      </div>

      <section id="empresaRealViewer" class="empresa-real-viewer">
        <div class="empresa-real-viewer-head">
          <div>
            <small>ANDAR SELECIONADO</small>
            <h3 id="empresaRealFloorName">Andar</h3>
            <p id="empresaRealFloorMeta"></p>
          </div>
          <div class="empresa-real-viewer-actions">
            <button id="btnEmpresaRealFullscreen" class="btn btn-secondary" type="button">
              ⛶ Tela cheia
            </button>
            <button id="btnEmpresaRealDownload" class="btn btn-secondary" type="button">
              ⬇ Baixar PNG
            </button>
          </div>
        </div>

        <div class="empresa-real-canvas-wrap">
          <canvas id="empresaRealCanvas" aria-label="Visualização do andar da empresa"></canvas>
          <div id="empresaRealEmpty" class="empresa-real-empty hidden">
            <strong>Este andar ainda não possui equipamentos.</strong>
            <span>Volte ao Mapa da Rede, adicione os equipamentos e depois clique em Gerar / Atualizar.</span>
          </div>
        </div>

        <div class="empresa-real-note">
          <span>💡 Os departamentos seguem a organização do mapa; os equipamentos são espaçados automaticamente para facilitar a leitura.</span>
          <span>🔄 Se o mapa mudar, clique em <strong>Gerar / Atualizar</strong>.</span>
        </div>
      </section>
    `;

    bind();
    syncButtons();
  }

  function syncButtons() {
    const people = $('#btnEmpresaRealPessoas');
    const cables = $('#btnEmpresaRealCabos');

    if (people) {
      people.textContent = state.showPeople ? '👥 Pessoas: ON' : '👥 Pessoas: OFF';
      people.classList.toggle('active-toggle', state.showPeople);
    }

    if (cables) {
      cables.textContent = state.showCables ? '🔗 Cabos: ON' : '🔗 Cabos: OFF';
      cables.classList.toggle('active-toggle', state.showCables);
    }
  }

  function persistPrefs() {
    const visual = ensureVisualPrefs();
    visual.officeView.showPeople = state.showPeople;
    visual.officeView.showCables = state.showCables;
  }

  function bind() {
    $('#btnEmpresaRealAtualizar')?.addEventListener('click', () => {
      renderFloorTabs();
      renderCanvas();
    });

    $('#btnEmpresaRealPessoas')?.addEventListener('click', () => {
      state.showPeople = !state.showPeople;
      persistPrefs();
      syncButtons();
      renderCanvas();
    });

    $('#btnEmpresaRealCabos')?.addEventListener('click', () => {
      state.showCables = !state.showCables;
      persistPrefs();
      syncButtons();
      renderCanvas();
    });

    $('#btnEmpresaRealDownload')?.addEventListener('click', downloadCurrentFloor);
    $('#btnEmpresaRealFullscreen')?.addEventListener('click', toggleFullscreen);
    $('#btnEmpresaRealApresentacao')?.addEventListener('click', presentationMode);
  }

  function safeFilename(text) {
    return String(text || 'empresa')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 70) || 'empresa';
  }

  function downloadCurrentFloor() {
    const canvas = $('#empresaRealCanvas');
    if (!canvas) return;

    const data = getData();
    const floor = data.floors.find(f => f.id === state.floorId) || data.floors[0];

    const link = document.createElement('a');
    link.download =
      safeFilename(project.company?.name || 'empresa') +
      '_' +
      safeFilename(floor?.name || 'andar') +
      '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function toggleFullscreen() {
    const viewer = $('#empresaRealViewer');
    if (!viewer) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (viewer.requestFullscreen) {
        await viewer.requestFullscreen();
      }
    } catch (_) {}
  }

  async function presentationMode() {
    const viewer = $('#empresaRealViewer');
    if (!viewer) return;

    state.presentation = true;
    viewer.classList.add('presentation-mode');

    try {
      if (!document.fullscreenElement && viewer.requestFullscreen) {
        await viewer.requestFullscreen();
      }
    } catch (_) {}
  }

  function watchFullscreen() {
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        state.presentation = false;
        $('#empresaRealViewer')?.classList.remove('presentation-mode');
      }
    });
  }

  function renderScreen() {
    ensureVisualPrefs();

    const data = getData();
    if (!data.floorIds.has(state.floorId)) state.floorId = data.floors[0].id;

    renderFloorTabs();
    syncButtons();
    renderCanvas();
  }

  function bindNav() {
    const button = $('[data-target="empresa3d"]');
    if (!button || button.dataset.empresaRealBound === '1') return;

    button.dataset.empresaRealBound = '1';
    button.addEventListener('click', () => {
      setTimeout(renderScreen, 0);
    });
  }

  function watchProjectOpen() {
    const input = $('#inputAbrirProjeto');
    if (!input || input.dataset.empresaRealWatch === '1') return;

    input.dataset.empresaRealWatch = '1';
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
            ensureVisualPrefs();
            const data = getData();
            state.floorId = data.floors[0].id;
            if ($('#empresa3d')?.classList.contains('active')) renderScreen();
          }
        }
      }, 100);
    });
  }

  function bindResize() {
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if ($('#empresa3d')?.classList.contains('active')) renderCanvas();
      }, 120);
    });
  }

  function start() {
    ensureVisualPrefs();
    inject();
    bindNav();
    watchProjectOpen();
    watchFullscreen();
    bindResize();
    renderScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
