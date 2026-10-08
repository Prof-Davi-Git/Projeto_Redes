/* CONTROLE SDN - extensão compatível com os JSONs existentes */
(() => {
  if (typeof project === 'undefined') return;
  let controllerDirty = false, vnetDirty = false, ruleDirty = false, editingVnet = null, editingRule = null, loadWatch = null;
  const E = s => document.querySelector(s);
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const uid = p => typeof id === 'function' ? id(p) : p + '_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  const equipment = idValue => (project.equipment || []).find(x => x.id === idValue) || null;
  const department = idValue => (project.departments || []).find(x => x.id === idValue) || null;
  const switches = () => (project.equipment || []).filter(x => x.type === 'switch');
  const hosts = () => (project.equipment || []).filter(x => x.type === 'computador' || x.type === 'notebook');

  function ensureSdn() {
    if (!project.company || typeof project.company !== 'object') project.company = {};
    const old = project.company.sdn;
    if (old && old.version === 1 && old.controller && Array.isArray(old.virtualNetworks) && Array.isArray(old.rules) && Array.isArray(old.simulations)) return old;
    const sdn = {
      version: 1,
      controller: {
        active: old?.controller?.active === true,
        switchIds: Array.isArray(old?.controller?.switchIds) ? [...new Set(old.controller.switchIds.map(String))] : [],
        updatedAt: String(old?.controller?.updatedAt || '')
      },
      virtualNetworks: Array.isArray(old?.virtualNetworks) ? old.virtualNetworks : [],
      rules: Array.isArray(old?.rules) ? old.rules : [],
      simulations: Array.isArray(old?.simulations) ? old.simulations : []
    };
    project.company.sdn = sdn;
    return sdn;
  }

  function hasDraft() { return controllerDirty || vnetDirty || ruleDirty; }
  window.sdnPossuiRascunho = hasDraft;

  function inject() {
    const sidebar = E('.sidebar'), content = E('.content');
    if (!sidebar || !content) return;
    if (!E('[data-target="sdn"]')) {
      const b = document.createElement('button');
      b.className = 'nav-btn'; b.dataset.target = 'sdn'; b.innerHTML = '🧠 Controle SDN';
      const anchor = E('[data-target="nuvem"]') || E('[data-target="mapa"]');
      anchor ? anchor.insertAdjacentElement('afterend', b) : sidebar.appendChild(b);
    }
    if (E('#sdn')) return;
    const screen = document.createElement('section');
    screen.id = 'sdn'; screen.className = 'screen';
    screen.innerHTML =
      '<div class="section-title"><p class="eyebrow">VIRTUALIZAÇÃO E CONTROLE</p><h2>Controle SDN</h2></div>' +
      '<div class="sdn-intro"><strong>🧠 A infraestrutura física continua a mesma.</strong><p>Agora a empresa adiciona uma camada de controle por software sobre os switches e computadores que já existem no Mapa da Rede.</p></div>' +
      '<section class="sdn-section"><div class="sdn-section-head"><small>CONTROL PLANE</small><h3>Controlador SDN</h3><p>Ativem o controlador e escolham quais switches existentes receberão regras dele.</p></div><article class="sdn-card">' +
      '<label class="sdn-controller-toggle"><input id="sdnControllerActive" type="checkbox"><span><strong>Ativar Controlador SDN</strong><small>O controlador representa o plano de controle: ele toma as decisões da rede.</small></span></label>' +
      '<div class="sdn-subtitle"><strong>Switches controlados</strong><p>Escolham pelo menos um switch que já existe no mapa.</p></div><div id="sdnSwitchList" class="sdn-switch-list"></div>' +
      '<div class="sdn-actions"><button id="btnSalvarControladorSdn" class="btn btn-primary" type="button" data-auth-action="salvar a configuração do Controlador SDN">💾 Salvar controlador</button></div></article></section>' +
      '<section class="sdn-section"><div class="sdn-section-head"><small>VIRTUALIZAÇÃO DE REDE</small><h3>Redes virtuais da empresa</h3><p>Criem uma organização lógica usando departamentos que já existem. O mapa físico não precisa ser refeito.</p></div><div class="sdn-two-columns">' +
      '<article class="sdn-card"><h4 id="sdnVnetTitle">Criar rede virtual</h4><div class="sdn-fields"><label>Nome<input id="sdnVnetName" type="text" placeholder="Nome criado pelo grupo"></label><label class="full">Finalidade<textarea id="sdnVnetPurpose" rows="3" placeholder="Para que essa rede virtual será usada?"></textarea></label></div>' +
      '<div class="sdn-subtitle"><strong>Departamentos</strong><p>Escolham os setores que farão parte.</p></div><div id="sdnDepartmentList" class="sdn-department-list"></div><div class="sdn-actions"><button id="btnSalvarVnetSdn" class="btn btn-primary" type="button" data-auth-action="salvar uma rede virtual SDN">💾 Salvar rede virtual</button><button id="btnCancelarVnetSdn" class="btn btn-secondary hidden" type="button">Cancelar</button></div></article>' +
      '<aside class="sdn-card"><h4>Redes virtuais criadas</h4><p>A divisão é lógica; computadores, switches e cabos continuam os mesmos.</p><div id="sdnVnetList" class="sdn-saved-list"></div></aside></div></section>' +
      '<section class="sdn-section"><div class="sdn-section-head"><small>REGRAS DE COMUNICAÇÃO</small><h3>O controlador decide</h3><p>Criem regras simples entre dois computadores da empresa.</p></div><div class="sdn-two-columns">' +
      '<article class="sdn-card"><h4 id="sdnRuleTitle">Criar regra SDN</h4><div class="sdn-fields"><label>Origem<select id="sdnRuleSource"></select></label><label>Destino<select id="sdnRuleDestination"></select></label><label>Ação<select id="sdnRuleAction"><option value="">Selecione...</option><option value="permitir">Permitir comunicação</option><option value="bloquear">Bloquear comunicação</option></select></label><label class="full">Justificativa<textarea id="sdnRuleReason" rows="3" placeholder="Por que essa regra faz sentido?"></textarea></label></div>' +
      '<div class="sdn-actions"><button id="btnSalvarRegraSdn" class="btn btn-primary" type="button" data-auth-action="salvar uma regra de comunicação SDN">💾 Salvar regra</button><button id="btnCancelarRegraSdn" class="btn btn-secondary hidden" type="button">Cancelar</button></div></article>' +
      '<aside class="sdn-card"><h4>Regras do controlador</h4><div id="sdnRuleList" class="sdn-saved-list"></div></aside></div></section>' +
      '<section class="sdn-section"><div class="sdn-section-head"><small>DATA PLANE</small><h3>Simular envio de pacote</h3><p>Escolham dois computadores com uma regra cadastrada e acompanhem o caminho da decisão.</p></div><article class="sdn-card"><div class="sdn-simulation-controls"><label>Origem<select id="sdnSimSource"></select></label><label>Destino<select id="sdnSimDestination"></select></label><button id="btnSimularPacoteSdn" class="btn btn-secondary" type="button" data-auth-action="executar uma simulação SDN">▶ Simular pacote</button></div><div id="sdnSimResult" class="sdn-simulation-result"><div class="sdn-empty">Nenhuma simulação realizada nesta sessão.</div></div></article></section>';
    content.appendChild(screen);
  }

  function renderSwitches() {
    const box = E('#sdnSwitchList'); if (!box) return;
    const list = switches(), selected = new Set(ensureSdn().controller.switchIds || []);
    if (!list.length) { box.innerHTML = '<div class="sdn-empty">Nenhum switch encontrado no Mapa da Rede.</div>'; return; }
    box.innerHTML = list.map(x => '<label class="sdn-check-item"><input type="checkbox" value="' + esc(x.id) + '" ' + (selected.has(x.id) ? 'checked' : '') + '><span><strong>' + esc(x.name) + '</strong><small>' + esc(department(x.departmentId)?.name || 'Sem departamento') + '</small></span></label>').join('');
  }

  function renderDepartments(selectedIds) {
    const box = E('#sdnDepartmentList'); if (!box) return;
    const selected = new Set(selectedIds || []), list = project.departments || [];
    if (!list.length) { box.innerHTML = '<div class="sdn-empty">Nenhum departamento criado.</div>'; return; }
    box.innerHTML = list.map(x => '<label class="sdn-check-item compact"><input type="checkbox" value="' + esc(x.id) + '" ' + (selected.has(x.id) ? 'checked' : '') + '><span><strong>' + esc(x.name) + '</strong></span></label>').join('');
  }

  function hostOptions(selected) {
    return '<option value="">Selecione...</option>' + hosts().map(x => '<option value="' + esc(x.id) + '" ' + (x.id === selected ? 'selected' : '') + '>' + esc(x.name) + ' — ' + esc(department(x.departmentId)?.name || 'Sem departamento') + '</option>').join('');
  }

  function renderHostSelects() {
    ['#sdnRuleSource','#sdnRuleDestination','#sdnSimSource','#sdnSimDestination'].forEach(sel => {
      const el = E(sel); if (!el) return; const prev = el.value; el.innerHTML = hostOptions(prev); if (hosts().some(x => x.id === prev)) el.value = prev;
    });
  }

  function loadController() {
    const c = ensureSdn().controller; E('#sdnControllerActive').checked = c.active === true; renderSwitches(); controllerDirty = false;
  }

  function saveController() {
    const sdn = ensureSdn(), active = E('#sdnControllerActive').checked;
    const valid = new Set(switches().map(x => x.id));
    const ids = Array.from(document.querySelectorAll('#sdnSwitchList input:checked')).map(x => x.value).filter(x => valid.has(x));
    if (active && !ids.length) return alert('Escolham pelo menos um switch antes de ativar o controlador.');
    sdn.controller = { active, switchIds: ids, updatedAt: new Date().toISOString() }; controllerDirty = false;
    if (typeof addHistory === 'function') addHistory('SDN', active ? 'Controlador SDN ativado para ' + ids.length + ' switch(es).' : 'Controlador SDN desativado.');
    if (typeof renderAll === 'function') renderAll(); window.atualizarMissoes?.(); alert('Configuração do controlador salva.');
  }

  function resetVnet(focus) {
    editingVnet = null; vnetDirty = false; E('#sdnVnetName').value = ''; E('#sdnVnetPurpose').value = ''; E('#sdnVnetTitle').textContent = 'Criar rede virtual'; E('#btnSalvarVnetSdn').textContent = '💾 Salvar rede virtual'; E('#btnCancelarVnetSdn').classList.add('hidden'); renderDepartments([]); if (focus) E('#sdnVnetName').focus();
  }

  function saveVnet() {
    const sdn = ensureSdn(), name = E('#sdnVnetName').value.trim(), purpose = E('#sdnVnetPurpose').value.trim();
    const valid = new Set((project.departments || []).map(x => x.id));
    const ids = Array.from(document.querySelectorAll('#sdnDepartmentList input:checked')).map(x => x.value).filter(x => valid.has(x));
    if (!name || !purpose || !ids.length) return alert('Preencham nome, finalidade e pelo menos um departamento.');
    if (sdn.virtualNetworks.some(x => x.id !== editingVnet && String(x.name).toLowerCase() === name.toLowerCase())) return alert('Já existe uma rede virtual com esse nome.');
    if (editingVnet) {
      const x = sdn.virtualNetworks.find(v => v.id === editingVnet); if (!x) return resetVnet(); Object.assign(x, { name, purpose, departmentIds: ids, updatedAt: new Date().toISOString() });
      if (typeof addHistory === 'function') addHistory('SDN', 'Rede virtual "' + name + '" atualizada.');
    } else {
      sdn.virtualNetworks.push({ id: uid('vnet'), name, purpose, departmentIds: ids, updatedAt: new Date().toISOString() });
      if (typeof addHistory === 'function') addHistory('SDN', 'Rede virtual "' + name + '" criada.');
    }
