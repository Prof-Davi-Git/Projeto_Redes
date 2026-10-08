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

    resetVnet(); renderVnets(); if (typeof renderAll === 'function') renderAll(); window.atualizarMissoes?.();
  }

  function editVnet(idValue) {
    const x = ensureSdn().virtualNetworks.find(v => v.id === idValue); if (!x) return; editingVnet = x.id; vnetDirty = false; E('#sdnVnetName').value = x.name || ''; E('#sdnVnetPurpose').value = x.purpose || ''; E('#sdnVnetTitle').textContent = 'Editar rede virtual'; E('#btnSalvarVnetSdn').textContent = '💾 Atualizar rede virtual'; E('#btnCancelarVnetSdn').classList.remove('hidden'); renderDepartments(x.departmentIds || []);
  }

  function deleteVnet(idValue) {
    const sdn = ensureSdn(), x = sdn.virtualNetworks.find(v => v.id === idValue); if (!x || !confirm('Excluir a rede virtual "' + x.name + '"?')) return; sdn.virtualNetworks = sdn.virtualNetworks.filter(v => v.id !== idValue); if (editingVnet === idValue) resetVnet(); if (typeof addHistory === 'function') addHistory('SDN', 'Rede virtual "' + x.name + '" removida.'); renderVnets(); if (typeof renderAll === 'function') renderAll(); window.atualizarMissoes?.();
  }

  function renderVnets() {
    const box = E('#sdnVnetList'); if (!box) return; const list = ensureSdn().virtualNetworks;
    if (!list.length) { box.innerHTML = '<div class="sdn-empty">Nenhuma rede virtual criada.</div>'; return; }
    box.innerHTML = list.map(x => '<article class="sdn-saved-item"><div class="sdn-saved-head"><strong>' + esc(x.name || 'Sem nome') + '</strong><span>🌐 Virtual</span></div><p>' + esc(x.purpose || '') + '</p><small><strong>Departamentos:</strong> ' + esc((x.departmentIds || []).map(i => department(i)?.name).filter(Boolean).join(', ') || 'Nenhum atual') + '</small><div class="sdn-mini-actions"><button class="sdn-mini-btn sdn-vnet-edit" data-id="' + esc(x.id) + '">Editar</button><button class="sdn-mini-btn danger sdn-vnet-delete" data-id="' + esc(x.id) + '" data-auth-action="excluir uma rede virtual SDN">Excluir</button></div></article>').join('');
    box.querySelectorAll('.sdn-vnet-edit').forEach(b => b.onclick = () => editVnet(b.dataset.id)); box.querySelectorAll('.sdn-vnet-delete').forEach(b => b.onclick = () => deleteVnet(b.dataset.id));
  }

  function resetRule(focus) {
    editingRule = null; ruleDirty = false; renderHostSelects(); E('#sdnRuleSource').value=''; E('#sdnRuleDestination').value=''; E('#sdnRuleAction').value=''; E('#sdnRuleReason').value=''; E('#sdnRuleTitle').textContent='Criar regra SDN'; E('#btnSalvarRegraSdn').textContent='💾 Salvar regra'; E('#btnCancelarRegraSdn').classList.add('hidden'); if (focus) E('#sdnRuleSource').focus();
  }

  function saveRule() {
    const sdn=ensureSdn(), sourceId=E('#sdnRuleSource').value, destinationId=E('#sdnRuleDestination').value, action=E('#sdnRuleAction').value, reason=E('#sdnRuleReason').value.trim(), valid=new Set(hosts().map(x=>x.id));
    if (!valid.has(sourceId) || !valid.has(destinationId) || sourceId===destinationId) return alert('Escolham dois computadores diferentes.');
    if (!['permitir','bloquear'].includes(action) || !reason) return alert('Escolham a ação e justifiquem a regra.');
    if (sdn.rules.some(x => x.id!==editingRule && x.sourceId===sourceId && x.destinationId===destinationId)) return alert('Já existe uma regra para essa origem e destino.');
    if (editingRule) { const x=sdn.rules.find(r=>r.id===editingRule); if (!x) return resetRule(); Object.assign(x,{sourceId,destinationId,action,reason,updatedAt:new Date().toISOString()}); if (typeof addHistory==='function') addHistory('SDN','Regra de comunicação SDN atualizada.'); }
    else { sdn.rules.push({id:uid('sdnrule'),sourceId,destinationId,action,reason,updatedAt:new Date().toISOString()}); if (typeof addHistory==='function') addHistory('SDN','Nova regra de comunicação SDN criada.'); }
    resetRule(); renderRules(); if (typeof renderAll==='function') renderAll(); window.atualizarMissoes?.();
  }

  function editRule(idValue) { const x=ensureSdn().rules.find(r=>r.id===idValue); if(!x)return; editingRule=x.id; ruleDirty=false; renderHostSelects(); E('#sdnRuleSource').value=x.sourceId; E('#sdnRuleDestination').value=x.destinationId; E('#sdnRuleAction').value=x.action; E('#sdnRuleReason').value=x.reason||''; E('#sdnRuleTitle').textContent='Editar regra SDN'; E('#btnSalvarRegraSdn').textContent='💾 Atualizar regra'; E('#btnCancelarRegraSdn').classList.remove('hidden'); }
  function deleteRule(idValue) { const sdn=ensureSdn(); if(!sdn.rules.some(r=>r.id===idValue)||!confirm('Excluir esta regra SDN?'))return; sdn.rules=sdn.rules.filter(r=>r.id!==idValue); if(editingRule===idValue)resetRule(); if(typeof addHistory==='function')addHistory('SDN','Regra de comunicação SDN removida.'); renderRules(); if(typeof renderAll==='function')renderAll(); window.atualizarMissoes?.(); }

  function renderRules() {
    const box=E('#sdnRuleList'); if(!box)return; const list=ensureSdn().rules;
    if(!list.length){box.innerHTML='<div class="sdn-empty">Nenhuma regra criada.</div>';return;}
    box.innerHTML=list.map(r=>{const a=equipment(r.sourceId),b=equipment(r.destinationId),allow=r.action==='permitir';return '<article class="sdn-saved-item"><div class="sdn-saved-head"><strong>'+esc(a?.name||'Origem removida')+' → '+esc(b?.name||'Destino removido')+'</strong><span class="sdn-rule-action '+(allow?'allow':'block')+'">'+(allow?'✓ Permitir':'✕ Bloquear')+'</span></div><p>'+esc(r.reason||'')+'</p><div class="sdn-mini-actions"><button class="sdn-mini-btn sdn-rule-edit" data-id="'+esc(r.id)+'">Editar</button><button class="sdn-mini-btn danger sdn-rule-delete" data-id="'+esc(r.id)+'" data-auth-action="excluir uma regra SDN">Excluir</button></div></article>';}).join('');
    box.querySelectorAll('.sdn-rule-edit').forEach(b=>b.onclick=()=>editRule(b.dataset.id)); box.querySelectorAll('.sdn-rule-delete').forEach(b=>b.onclick=()=>deleteRule(b.dataset.id));
  }

  function step(n,icon,title,text){return '<div class="sdn-sim-step"><span class="sdn-sim-number">'+n+'</span><span class="sdn-sim-icon">'+icon+'</span><div><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p></div></div>';}

  function simulate() {
    const sdn=ensureSdn(), sourceId=E('#sdnSimSource').value, destinationId=E('#sdnSimDestination').value, source=equipment(sourceId), dest=equipment(destinationId), current=new Map(switches().map(x=>[x.id,x])), sw=(sdn.controller.switchIds||[]).map(x=>current.get(x)).find(Boolean);
    if(!sdn.controller.active||!sw)return alert('Ativem e salvem primeiro o Controlador SDN com um switch.');
    if(!source||!dest||sourceId===destinationId)return alert('Escolham dois computadores diferentes.');
    const rule=sdn.rules.find(r=>r.sourceId===sourceId&&r.destinationId===destinationId&&['permitir','bloquear'].includes(r.action));
    if(!rule){E('#sdnSimResult').innerHTML='<div class="sdn-simulation-warning"><strong>⚠️ O switch ainda não possui uma decisão para esse tráfego.</strong><p>O primeiro pacote faria o switch consultar o controlador. Criem uma regra para essa origem e destino e simulem novamente.</p></div>';return;}
    const allow=rule.action==='permitir';
    E('#sdnSimResult').innerHTML='<div class="sdn-plane-summary"><span><strong>Control Plane:</strong> Controlador SDN decide a regra.</span><span><strong>Data Plane:</strong> '+esc(sw.name)+' executa a decisão.</span></div><div class="sdn-sim-flow">'+step(1,'💻','Host gera tráfego',source.name+' envia um pacote para '+dest.name+'.')+step(2,'🔌','Switch recebe o primeiro pacote',sw.name+' representa o Data Plane e precisa de uma regra.')+step(3,'🧠','Switch consulta o controlador','O Control Plane procura a regra cadastrada.')+step(4,'📋','Controlador envia a regra','Decisão: '+(allow?'Permitir':'Bloquear')+' comunicação.')+step(5,allow?'➡️':'⛔',allow?'Switch encaminha':'Switch bloqueia',allow?'O Data Plane encaminha o pacote.':'O Data Plane interrompe o pacote.')+step(6,allow?'💻':'🚫',allow?'Pacote chega ao destino':'Pacote não chega ao destino',allow?dest.name+' recebe o pacote.':dest.name+' não recebe o pacote.')+'</div>';
    sdn.simulations.unshift({id:uid('sdnsim'),sourceId,destinationId,ruleId:rule.id,action:rule.action,switchId:sw.id,createdAt:new Date().toISOString()}); if(sdn.simulations.length>20)sdn.simulations=sdn.simulations.slice(0,20);
    if(typeof addHistory==='function')addHistory('SDN','Simulação de pacote executada entre "'+source.name+'" e "'+dest.name+'".'); if(typeof renderAll==='function')renderAll(); window.atualizarMissoes?.();
  }

  function renderFromProject(){ensureSdn();loadController();resetVnet(false);resetRule(false);renderVnets();renderRules();renderHostSelects();if(E('#sdnSimResult'))E('#sdnSimResult').innerHTML='<div class="sdn-empty">Nenhuma simulação realizada nesta sessão.</div>';}
  function openScreen(){if(!hasDraft())renderFromProject();else{renderSwitches();renderVnets();renderRules();renderHostSelects();}}

  function bind(){
    E('[data-target="sdn"]')?.addEventListener('click',openScreen); E('#btnSalvarControladorSdn')?.addEventListener('click',saveController); E('#btnSalvarVnetSdn')?.addEventListener('click',saveVnet); E('#btnCancelarVnetSdn')?.addEventListener('click',()=>resetVnet(true)); E('#btnSalvarRegraSdn')?.addEventListener('click',saveRule); E('#btnCancelarRegraSdn')?.addEventListener('click',()=>resetRule(true)); E('#btnSimularPacoteSdn')?.addEventListener('click',simulate);
    E('#sdnControllerActive')?.addEventListener('change',()=>controllerDirty=true); E('#sdnSwitchList')?.addEventListener('change',()=>controllerDirty=true); ['#sdnVnetName','#sdnVnetPurpose','#sdnDepartmentList'].forEach(s=>{E(s)?.addEventListener('input',()=>vnetDirty=true);E(s)?.addEventListener('change',()=>vnetDirty=true);}); ['#sdnRuleSource','#sdnRuleDestination','#sdnRuleAction','#sdnRuleReason'].forEach(s=>{E(s)?.addEventListener('input',()=>ruleDirty=true);E(s)?.addEventListener('change',()=>ruleDirty=true);});
  }

  function watchOpen(){const input=E('#inputAbrirProjeto');if(!input||input.dataset.sdnWatch==='1')return;input.dataset.sdnWatch='1';input.addEventListener('change',()=>{const before=project;let n=0;if(loadWatch)clearInterval(loadWatch);loadWatch=setInterval(()=>{n++;if(project!==before||n>=40){clearInterval(loadWatch);loadWatch=null;if(project!==before){controllerDirty=vnetDirty=ruleDirty=false;editingVnet=editingRule=null;ensureSdn();renderFromProject();window.atualizarMissoes?.();}}},100);});}

  const previousSave=typeof saveProject==='function'?saveProject:null;
  if(previousSave)saveProject=function(){if(hasDraft()){alert('Existem alterações não salvas em Controle SDN.\n\nSalve ou cancele o que está em edição antes de baixar o projeto.');return;}return previousSave();};
  window.addEventListener('beforeunload',e=>{if(!hasDraft())return;e.preventDefault();e.returnValue='';});

  function start(){ensureSdn();bind();watchOpen();renderFromProject();}
  inject();
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
