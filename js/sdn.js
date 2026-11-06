/* =========================================================
   CONTROLE SDN - versão simplificada
   - Um único fluxo para os alunos
   - Um único salvamento autenticado
   - Mantém o formato de dados esperado pela Missão 04
   - Compatível com JSONs antigos do projeto
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

  const uid = prefix => typeof id === 'function'
    ? id(prefix)
    : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const equipmentById = equipmentId =>
    (project.equipment || []).find(item => item.id === equipmentId) || null;

  const departmentById = departmentId =>
    (project.departments || []).find(item => item.id === departmentId) || null;

  const switches = () =>
    (project.equipment || []).filter(item => item.type === 'switch');

  const hosts = () =>
    (project.equipment || []).filter(item =>
      item.type === 'computador' || item.type === 'notebook'
    );

  let dirty = false;
  let loadWatch = null;
  let primaryIds = {
    vnet: null,
    rule1: null,
    rule2: null
  };

  function ensureSdn() {
    if (!project.company || typeof project.company !== 'object') {
      project.company = {};
    }

    const old = project.company.sdn || {};
    const sdn = {
      version: 1,
      controller: {
        active: old?.controller?.active === true,
        switchIds: Array.isArray(old?.controller?.switchIds)
          ? [...new Set(old.controller.switchIds.map(String))]
          : [],
        updatedAt: String(old?.controller?.updatedAt || '')
      },
      virtualNetworks: Array.isArray(old?.virtualNetworks)
        ? old.virtualNetworks
        : [],
      rules: Array.isArray(old?.rules)
        ? old.rules
        : [],
      simulations: Array.isArray(old?.simulations)
        ? old.simulations
        : []
    };

    project.company.sdn = sdn;
    return sdn;
  }

  function hasDraft() {
    return dirty;
  }

  window.sdnPossuiRascunho = hasDraft;

  function inject() {
    const sidebar = E('.sidebar');
    const content = E('.content');
    if (!sidebar || !content) return;

    if (!E('[data-target="sdn"]')) {
      const button = document.createElement('button');
      button.className = 'nav-btn';
      button.dataset.target = 'sdn';
      button.innerHTML = '🧠 Controle SDN';

      const anchor =
        E('[data-target="nuvem"]') ||
        E('[data-target="mapa"]');

      if (anchor) anchor.insertAdjacentElement('afterend', button);
      else sidebar.appendChild(button);
    }

    if (E('#sdn')) return;

    const screen = document.createElement('section');
    screen.id = 'sdn';
    screen.className = 'screen';
    screen.innerHTML = `
      <div class="section-title">
        <p class="eyebrow">VIRTUALIZAÇÃO E CONTROLE</p>
        <h2>Controle SDN</h2>
      </div>

      <div class="sdn-intro sdn-simple-intro">
        <strong>🧠 No SDN, o controlador pensa e o switch executa.</strong>
        <p>
          Preencham os 4 passos abaixo. No final, cliquem apenas uma vez em
          <strong>Salvar e testar Controle SDN</strong>.
        </p>
      </div>

      <div class="sdn-simple-steps">
        <section class="sdn-section sdn-simple-step">
          <div class="sdn-step-badge">1</div>
          <div class="sdn-step-content">
            <div class="sdn-section-head">
              <small>CONTROLADOR</small>
              <h3>Qual switch será controlado?</h3>
              <p>
                Escolham um switch que já existe no Mapa da Rede.
                Ao salvar, o Controlador SDN será ativado automaticamente.
              </p>
            </div>

            <article class="sdn-card">
              <div class="sdn-fields sdn-fields-one">
                <label>
                  Switch controlado
                  <select id="sdnSimpleSwitch"></select>
                </label>
              </div>

              <div class="sdn-help-box">
                <strong>O que isso representa?</strong>
                <span>O controlador toma a decisão e o switch aplica a regra na rede.</span>
              </div>
            </article>
          </div>
        </section>

        <section class="sdn-section sdn-simple-step">
          <div class="sdn-step-badge">2</div>
          <div class="sdn-step-content">
            <div class="sdn-section-head">
              <small>REDE VIRTUAL</small>
              <h3>Como os departamentos serão organizados?</h3>
              <p>
                Criem uma rede virtual e escolham quais departamentos farão parte dela.
              </p>
            </div>

            <article class="sdn-card">
              <div class="sdn-fields">
                <label>
                  Nome da rede virtual
                  <input
                    id="sdnSimpleVnetName"
                    type="text"
                    placeholder="Ex.: Rede Administrativa"
                  >
                </label>

                <label>
                  Finalidade
                  <input
                    id="sdnSimpleVnetPurpose"
                    type="text"
                    placeholder="Ex.: Organizar os setores administrativos"
                  >
                </label>
              </div>

              <div class="sdn-subtitle">
                <strong>Departamentos da rede virtual</strong>
                <p>Marquem pelo menos um departamento.</p>
              </div>

              <div id="sdnSimpleDepartments" class="sdn-department-list"></div>
            </article>
          </div>
        </section>

        <section class="sdn-section sdn-simple-step">
          <div class="sdn-step-badge">3</div>
          <div class="sdn-step-content">
            <div class="sdn-section-head">
              <small>REGRAS DE COMUNICAÇÃO</small>
              <h3>O que será permitido ou bloqueado?</h3>
              <p>
                Criem duas regras. Em cada uma, escolham origem, destino,
                a decisão e expliquem o motivo.
              </p>
            </div>

            <div class="sdn-rule-simple-grid">
              <article class="sdn-card sdn-simple-rule-card">
                <div class="sdn-saved-head">
                  <strong>Regra 1</strong>
                  <span>Obrigatória</span>
                </div>

                <div class="sdn-fields">
                  <label>
                    Origem
                    <select id="sdnRule1Source"></select>
                  </label>

                  <label>
                    Destino
                    <select id="sdnRule1Destination"></select>
                  </label>

                  <label>
                    Decisão
                    <select id="sdnRule1Action">
                      <option value="">Selecione...</option>
                      <option value="permitir">✓ Permitir comunicação</option>
                      <option value="bloquear">✕ Bloquear comunicação</option>
                    </select>
                  </label>

                  <label class="full">
                    Por quê?
                    <textarea
                      id="sdnRule1Reason"
                      rows="2"
                      placeholder="Explique por que essa comunicação deve ser permitida ou bloqueada."
                    ></textarea>
                  </label>
                </div>
              </article>

              <article class="sdn-card sdn-simple-rule-card">
                <div class="sdn-saved-head">
                  <strong>Regra 2</strong>
                  <span>Obrigatória</span>
                </div>

                <div class="sdn-fields">
                  <label>
                    Origem
                    <select id="sdnRule2Source"></select>
                  </label>

                  <label>
                    Destino
                    <select id="sdnRule2Destination"></select>
                  </label>

                  <label>
                    Decisão
                    <select id="sdnRule2Action">
                      <option value="">Selecione...</option>
                      <option value="permitir">✓ Permitir comunicação</option>
                      <option value="bloquear">✕ Bloquear comunicação</option>
                    </select>
                  </label>

                  <label class="full">
                    Por quê?
                    <textarea
                      id="sdnRule2Reason"
                      rows="2"
                      placeholder="Explique por que essa comunicação deve ser permitida ou bloqueada."
                    ></textarea>
                  </label>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="sdn-section sdn-simple-step">
          <div class="sdn-step-badge">4</div>
          <div class="sdn-step-content">
            <div class="sdn-section-head">
              <small>TESTE DA REDE</small>
              <h3>Qual regra será testada?</h3>
              <p>
                Escolham uma das duas regras. O sistema salvará toda a configuração
                e fará uma simulação de pacote usando essa regra.
              </p>
            </div>

            <article class="sdn-card">
              <div class="sdn-simulation-controls sdn-simple-final">
                <label>
                  Regra para testar
                  <select id="sdnSimpleSimulationRule">
                    <option value="1">Regra 1</option>
                    <option value="2">Regra 2</option>
                  </select>
                </label>

                <button
                  id="btnSalvarSdnCompleto"
                  class="btn btn-primary"
                  type="button"
                  data-auth-action="salvar e testar toda a configuração do Controle SDN"
                >
                  💾 Salvar e testar Controle SDN
                </button>
              </div>

              <div id="sdnSimpleStatus" class="sdn-simple-status">
                Preencham os passos acima para concluir.
              </div>

              <div id="sdnSimpleResult" class="sdn-simulation-result"></div>
            </article>
          </div>
        </section>
      </div>

      <section class="sdn-section">
        <div class="sdn-section-head">
          <small>RESUMO PARA O RELATÓRIO E APRESENTAÇÃO</small>
          <h3>O que a equipe configurou</h3>
          <p>
            Depois de salvar, este quadro mostra exatamente os pontos que a equipe
            deve saber explicar.
          </p>
        </div>

        <div id="sdnSimpleSummary" class="sdn-simple-summary"></div>
      </section>
    `;

    content.appendChild(screen);
  }

  function optionList(items, selectedId, placeholder) {
    const first = `<option value="">${esc(placeholder)}</option>`;

    return first + items.map(item => {
      const department = departmentById(item.departmentId)?.name || 'Sem departamento';
      const selected = item.id === selectedId ? ' selected' : '';
      return `
        <option value="${esc(item.id)}"${selected}>
          ${esc(item.name)} — ${esc(department)}
        </option>
      `;
    }).join('');
  }

  function renderSwitchSelect(selectedId = '') {
    const select = E('#sdnSimpleSwitch');
    if (!select) return;

    const list = switches();
    if (!list.length) {
      select.innerHTML = '<option value="">Nenhum switch disponível no Mapa da Rede</option>';
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML =
      '<option value="">Selecione um switch...</option>' +
      list.map(item => {
        const floor = item.floorId
          ? project.company?.building?.floors?.find(f => f.id === item.floorId)?.name
          : '';
        const extra = floor ? ` — ${floor}` : '';
        return `
          <option value="${esc(item.id)}" ${item.id === selectedId ? 'selected' : ''}>
            ${esc(item.name)}${esc(extra)}
          </option>
        `;
      }).join('');
  }

  function renderDepartments(selectedIds = []) {
    const box = E('#sdnSimpleDepartments');
    if (!box) return;

    const list = project.departments || [];
    const selected = new Set(selectedIds);

    if (!list.length) {
      box.innerHTML =
        '<div class="sdn-empty">Criem primeiro os departamentos da empresa.</div>';
      return;
    }

    box.innerHTML = list.map(item => `
      <label class="sdn-check-item compact">
        <input
          type="checkbox"
          value="${esc(item.id)}"
          ${selected.has(item.id) ? 'checked' : ''}
        >
        <span><strong>${esc(item.name)}</strong></span>
      </label>
    `).join('');
  }

  function renderHostSelect(selectId, selectedId = '') {
    const select = E(selectId);
    if (!select) return;

    const list = hosts();
    select.innerHTML = optionList(
      list,
      selectedId,
      list.length
        ? 'Selecione um computador...'
        : 'Nenhum computador disponível'
    );
    select.disabled = !list.length;
  }

  function renderAllHostSelects(values = {}) {
    renderHostSelect('#sdnRule1Source', values.rule1Source || '');
    renderHostSelect('#sdnRule1Destination', values.rule1Destination || '');
    renderHostSelect('#sdnRule2Source', values.rule2Source || '');
    renderHostSelect('#sdnRule2Destination', values.rule2Destination || '');
  }

  function currentFormValues() {
    const selectedDepartments = Array
      .from(document.querySelectorAll('#sdnSimpleDepartments input:checked'))
      .map(input => input.value);

    return {
      switchId: E('#sdnSimpleSwitch')?.value || '',
      vnetName: E('#sdnSimpleVnetName')?.value.trim() || '',
      vnetPurpose: E('#sdnSimpleVnetPurpose')?.value.trim() || '',
      departmentIds: selectedDepartments,
      rule1: {
        sourceId: E('#sdnRule1Source')?.value || '',
        destinationId: E('#sdnRule1Destination')?.value || '',
        action: E('#sdnRule1Action')?.value || '',
        reason: E('#sdnRule1Reason')?.value.trim() || ''
      },
      rule2: {
        sourceId: E('#sdnRule2Source')?.value || '',
        destinationId: E('#sdnRule2Destination')?.value || '',
        action: E('#sdnRule2Action')?.value || '',
        reason: E('#sdnRule2Reason')?.value.trim() || ''
      },
      simulationRule: E('#sdnSimpleSimulationRule')?.value === '2' ? 2 : 1
    };
  }

  function validateRule(rule, number, validHostIds) {
    if (!validHostIds.has(rule.sourceId) || !validHostIds.has(rule.destinationId)) {
      return `Na Regra ${number}, escolham a origem e o destino.`;
    }

    if (rule.sourceId === rule.destinationId) {
      return `Na Regra ${number}, origem e destino precisam ser computadores diferentes.`;
    }

    if (!['permitir', 'bloquear'].includes(rule.action)) {
      return `Na Regra ${number}, escolham Permitir ou Bloquear.`;
    }

    if (!rule.reason) {
      return `Na Regra ${number}, expliquem o motivo da decisão.`;
    }

    return '';
  }

  function validate(values) {
    const validSwitchIds = new Set(switches().map(item => item.id));
    const validDepartmentIds = new Set((project.departments || []).map(item => item.id));
    const validHostIds = new Set(hosts().map(item => item.id));

    if (!validSwitchIds.has(values.switchId)) {
      return 'Passo 1: escolham um switch existente no Mapa da Rede.';
    }

    if (!values.vnetName) {
      return 'Passo 2: deem um nome para a rede virtual.';
    }

    if (!values.vnetPurpose) {
      return 'Passo 2: escrevam a finalidade da rede virtual.';
    }

    const validDepartments = values.departmentIds.filter(id => validDepartmentIds.has(id));
    if (!validDepartments.length) {
      return 'Passo 2: escolham pelo menos um departamento para a rede virtual.';
    }

    const rule1Error = validateRule(values.rule1, 1, validHostIds);
    if (rule1Error) return rule1Error;

    const rule2Error = validateRule(values.rule2, 2, validHostIds);
    if (rule2Error) return rule2Error;

    if (
      values.rule1.sourceId === values.rule2.sourceId &&
      values.rule1.destinationId === values.rule2.destinationId
    ) {
      return 'As duas regras precisam representar comunicações diferentes.';
    }

    return '';
  }

  function setStatus(message, type = '') {
    const box = E('#sdnSimpleStatus');
    if (!box) return;

    box.className = 'sdn-simple-status' + (type ? ' ' + type : '');
    box.textContent = message;
  }

  function simulationResultHtml(rule, selectedSwitch) {
    const source = equipmentById(rule.sourceId);
    const destination = equipmentById(rule.destinationId);
    const allow = rule.action === 'permitir';

    return `
      <div class="sdn-plane-summary">
        <span>
          <strong>Control Plane:</strong>
          o Controlador SDN encontrou a regra escolhida.
        </span>
        <span>
          <strong>Data Plane:</strong>
          ${esc(selectedSwitch?.name || 'Switch')} executou a decisão.
        </span>
      </div>

      <div class="sdn-simple-test-result ${allow ? 'allow' : 'block'}">
        <strong>
          ${allow ? '✅ COMUNICAÇÃO PERMITIDA' : '⛔ COMUNICAÇÃO BLOQUEADA'}
        </strong>
        <p>
          ${esc(source?.name || 'Origem')}
          →
          ${esc(destination?.name || 'Destino')}
        </p>
        <small>${esc(rule.reason)}</small>
      </div>
    `;
  }

  function saveAll() {
    const values = currentFormValues();
    const error = validate(values);

    if (error) {
      setStatus(error, 'error');
      alert(error);
      return;
    }

    const sdn = ensureSdn();
    const now = new Date().toISOString();

    const vnetId =
      primaryIds.vnet ||
      sdn.virtualNetworks[0]?.id ||
      uid('vnet');

    const rule1Id =
      primaryIds.rule1 ||
      sdn.rules[0]?.id ||
      uid('sdnrule');

    const rule2Id =
      primaryIds.rule2 ||
      sdn.rules[1]?.id ||
      uid('sdnrule');

    const vnet = {
      id: vnetId,
      name: values.vnetName,
      purpose: values.vnetPurpose,
      departmentIds: [...new Set(values.departmentIds)],
      updatedAt: now
    };

    const rule1 = {
      id: rule1Id,
      sourceId: values.rule1.sourceId,
      destinationId: values.rule1.destinationId,
      action: values.rule1.action,
      reason: values.rule1.reason,
      updatedAt: now
    };

    const rule2 = {
      id: rule2Id,
      sourceId: values.rule2.sourceId,
      destinationId: values.rule2.destinationId,
      action: values.rule2.action,
      reason: values.rule2.reason,
      updatedAt: now
    };

    const selectedRule = values.simulationRule === 2 ? rule2 : rule1;
    const simulation = {
      id: uid('sdnsim'),
      sourceId: selectedRule.sourceId,
      destinationId: selectedRule.destinationId,
      ruleId: selectedRule.id,
      action: selectedRule.action,
      switchId: values.switchId,
      createdAt: now
    };

    sdn.controller = {
      active: true,
      switchIds: [values.switchId],
      updatedAt: now
    };

    // A nova interface trabalha com uma rede virtual principal e duas regras.
    // Dados antigos extras não são necessários para a atividade atual e poderiam
    // confundir os alunos, então a configuração salva passa a refletir exatamente
    // o que está visível nesta tela.
    sdn.virtualNetworks = [vnet];
    sdn.rules = [rule1, rule2];

    const oldSimulations = Array.isArray(sdn.simulations)
      ? sdn.simulations
      : [];

    sdn.simulations = [
      simulation,
      ...oldSimulations.filter(item =>
        item?.ruleId === rule1.id || item?.ruleId === rule2.id
      )
    ].slice(0, 20);

    primaryIds = {
      vnet: vnet.id,
      rule1: rule1.id,
      rule2: rule2.id
    };

    dirty = false;

    const selectedSwitch = equipmentById(values.switchId);
    E('#sdnSimpleResult').innerHTML =
      simulationResultHtml(selectedRule, selectedSwitch);

    setStatus(
      '✅ Controle SDN salvo com sucesso. A simulação também foi registrada.',
      'success'
    );

    if (typeof addHistory === 'function') {
      addHistory(
        'SDN',
        `Controle SDN salvo: switch "${selectedSwitch?.name || 'Switch'}", rede virtual "${vnet.name}", 2 regras de comunicação e 1 simulação registrada.`
      );
    }

    renderSummary();

    if (typeof renderAll === 'function') {
      renderAll();
    }

    window.atualizarMissoes?.();
  }

  function renderSummary() {
    const box = E('#sdnSimpleSummary');
    if (!box) return;

    const sdn = ensureSdn();
    const switchId = sdn.controller?.switchIds?.[0];
    const selectedSwitch = equipmentById(switchId);
    const vnet = sdn.virtualNetworks?.[0];
    const rules = (sdn.rules || []).slice(0, 2);
    const lastSimulation = sdn.simulations?.[0];

    if (
      sdn.controller?.active !== true ||
      !selectedSwitch ||
      !vnet ||
      rules.length < 2
    ) {
      box.innerHTML = `
        <div class="sdn-empty">
          A configuração ainda não foi concluída.
          Preencham os quatro passos e salvem.
        </div>
      `;
      return;
    }

    const departments = (vnet.departmentIds || [])
      .map(departmentId => departmentById(departmentId)?.name)
      .filter(Boolean)
      .join(', ');

    const ruleCards = rules.map((rule, index) => {
      const source = equipmentById(rule.sourceId);
      const destination = equipmentById(rule.destinationId);
      const allow = rule.action === 'permitir';

      return `
        <article class="sdn-summary-card">
          <small>REGRA ${index + 1}</small>
          <strong>
            ${esc(source?.name || 'Origem')}
            →
            ${esc(destination?.name || 'Destino')}
          </strong>
          <span class="sdn-rule-action ${allow ? 'allow' : 'block'}">
            ${allow ? '✓ Permitir' : '✕ Bloquear'}
          </span>
          <p>${esc(rule.reason || '')}</p>
        </article>
      `;
    }).join('');

    box.innerHTML = `
      <div class="sdn-summary-grid">
        <article class="sdn-summary-card">
          <small>CONTROLADOR</small>
          <strong>🧠 Ativo</strong>
          <p>Switch controlado: <b>${esc(selectedSwitch.name)}</b></p>
        </article>

        <article class="sdn-summary-card">
          <small>REDE VIRTUAL</small>
          <strong>🌐 ${esc(vnet.name)}</strong>
          <p>${esc(vnet.purpose)}</p>
          <p><b>Departamentos:</b> ${esc(departments || 'Nenhum')}</p>
        </article>

        ${ruleCards}

        <article class="sdn-summary-card sdn-summary-wide">
          <small>SIMULAÇÃO</small>
          <strong>
            ${lastSimulation ? '▶ Teste registrado' : 'Nenhum teste registrado'}
          </strong>
          <p>
            ${lastSimulation
              ? 'A equipe pode usar este resultado para explicar na apresentação como o controlador decide e o switch executa.'
              : 'Salvem a configuração para registrar uma simulação.'}
          </p>
        </article>
      </div>
    `;
  }

  function loadFromProject() {
    const sdn = ensureSdn();
    const currentSwitchIds = new Set(switches().map(item => item.id));
    const currentHostIds = new Set(hosts().map(item => item.id));
    const currentDepartmentIds = new Set((project.departments || []).map(item => item.id));

    const selectedSwitch =
      (sdn.controller?.switchIds || []).find(id => currentSwitchIds.has(id)) ||
      '';

    const vnet = sdn.virtualNetworks?.[0] || null;
    const rule1 = sdn.rules?.[0] || null;
    const rule2 = sdn.rules?.[1] || null;

    primaryIds = {
      vnet: vnet?.id || null,
      rule1: rule1?.id || null,
      rule2: rule2?.id || null
    };

    renderSwitchSelect(selectedSwitch);

    E('#sdnSimpleVnetName').value = vnet?.name || '';
    E('#sdnSimpleVnetPurpose').value = vnet?.purpose || '';

    const selectedDepartments = Array.isArray(vnet?.departmentIds)
      ? vnet.departmentIds.filter(id => currentDepartmentIds.has(id))
      : [];

    renderDepartments(selectedDepartments);

    renderAllHostSelects({
      rule1Source: currentHostIds.has(rule1?.sourceId) ? rule1.sourceId : '',
      rule1Destination: currentHostIds.has(rule1?.destinationId) ? rule1.destinationId : '',
      rule2Source: currentHostIds.has(rule2?.sourceId) ? rule2.sourceId : '',
      rule2Destination: currentHostIds.has(rule2?.destinationId) ? rule2.destinationId : ''
    });

    E('#sdnRule1Action').value =
      ['permitir', 'bloquear'].includes(rule1?.action)
        ? rule1.action
        : '';

    E('#sdnRule1Reason').value = rule1?.reason || '';

    E('#sdnRule2Action').value =
      ['permitir', 'bloquear'].includes(rule2?.action)
        ? rule2.action
        : '';

    E('#sdnRule2Reason').value = rule2?.reason || '';

    const lastSimulationRuleId = sdn.simulations?.[0]?.ruleId;
    E('#sdnSimpleSimulationRule').value =
      lastSimulationRuleId && lastSimulationRuleId === rule2?.id
        ? '2'
        : '1';

    dirty = false;
    setStatus(
      sdn.controller?.active && selectedSwitch && vnet && rule1 && rule2
        ? 'Configuração carregada. Altere apenas o que for necessário e salve novamente.'
        : 'Preencham os passos acima para concluir.'
    );

    E('#sdnSimpleResult').innerHTML = '';
    renderSummary();
  }

  function markDirty() {
    dirty = true;
    setStatus('Existem alterações aguardando salvamento.', 'pending');
  }

  function bind() {
    E('[data-target="sdn"]')?.addEventListener('click', () => {
      if (!dirty) loadFromProject();
      else {
        renderSwitchSelect(E('#sdnSimpleSwitch')?.value || '');
        renderSummary();
      }
    });

    E('#sdn')?.addEventListener('input', event => {
      if (event.target.closest('#btnSalvarSdnCompleto')) return;
      markDirty();
    });

    E('#sdn')?.addEventListener('change', event => {
      if (event.target.closest('#btnSalvarSdnCompleto')) return;
      markDirty();
    });

    E('#btnSalvarSdnCompleto')?.addEventListener('click', saveAll);
  }

  function watchOpen() {
    const input = E('#inputAbrirProjeto');
    if (!input || input.dataset.sdnSimpleWatch === '1') return;

    input.dataset.sdnSimpleWatch = '1';
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
            primaryIds = { vnet: null, rule1: null, rule2: null };
            ensureSdn();
            loadFromProject();
            window.atualizarMissoes?.();
          }
        }
      }, 100);
    });
  }

  const previousSave =
    typeof saveProject === 'function'
      ? saveProject
      : null;

  if (previousSave) {
    saveProject = function() {
      if (hasDraft()) {
        alert(
          'Existem alterações não salvas em Controle SDN.\n\n' +
          'Clique em "Salvar e testar Controle SDN" antes de baixar o projeto.'
        );
        return;
      }

      return previousSave();
    };
  }

  window.addEventListener('beforeunload', event => {
    if (!hasDraft()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  function start() {
    ensureSdn();
    bind();
    watchOpen();
    loadFromProject();
  }

  inject();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
