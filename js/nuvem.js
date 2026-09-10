/* =========================================================
   NUVEM E CONTINUIDADE - Projeto de Redes
   Semana 19: IAM, menor privilégio e criptografia em trânsito
   Semana 20: backup, restore e continuidade de negócio

   Extensão isolada do núcleo do projeto.
   Dados novos ficam em project.company.cloudContinuity.
   JSONs antigos continuam compatíveis e recebem a estrutura vazia ao abrir.
   ========================================================= */

(() => {
  if (typeof project === 'undefined') return;

  const DAYS = [
    { id: 'domingo', label: 'Domingo' },
    { id: 'segunda', label: 'Segunda' },
    { id: 'terca', label: 'Terça' },
    { id: 'quarta', label: 'Quarta' },
    { id: 'quinta', label: 'Quinta' },
    { id: 'sexta', label: 'Sexta' },
    { id: 'sabado', label: 'Sábado' }
  ];

  const PERMISSIONS = [
    { id: 'visualizar', label: 'Visualizar' },
    { id: 'editar', label: 'Editar' },
    { id: 'excluir', label: 'Excluir' },
    { id: 'administrar', label: 'Administrar' }
  ];

  let editingResourceId = null;
  let resourceDirty = false;
  let backupDirty = false;
  let incidentDirty = false;
  let storageCheckPassed = false;
  let restoreCheckPassed = false;
  let incidentDraft = null;
  let projectLoadWatch = null;

  function uid(prefix) {
    if (typeof id === 'function') return id(prefix);
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function numberValue(value, fallback = 0) {
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? number : fallback;
  }

  function emptyBackup() {
    return {
      resourceId: '',
      dataAmount: '',
      dataUnit: 'GB',
      fullDay: '',
      incrementalDays: [],
      priority: '',
      dedupRatio: '',
      compressionPercent: '',
      storageEstimateGb: '',
      storageVerified: false,
      restoreSizeGb: '',
      bandwidthMbps: '',
      restoreEstimateMinutes: '',
      restoreVerified: false,
      updatedAt: ''
    };
  }

  function normalizeAccess(access) {
    const validPermissions = new Set(PERMISSIONS.map(item => item.id));
    return {
      departmentId: String(access?.departmentId || ''),
      permissions: Array.isArray(access?.permissions)
        ? [...new Set(access.permissions.map(String).filter(permission => validPermissions.has(permission)))]
        : []
    };
  }

  function normalizeResource(resource) {
    return {
      id: String(resource?.id || uid('cloud')),
      name: String(resource?.name || '').trim(),
      purpose: String(resource?.purpose || '').trim(),
      lgpdCadastroId: String(resource?.lgpdCadastroId || ''),
      transport: resource?.transport === 'tls13' || resource?.transport === 'none'
        ? resource.transport
        : '',
      accesses: Array.isArray(resource?.accesses)
        ? resource.accesses.map(normalizeAccess).filter(access => access.departmentId && access.permissions.length)
        : [],
      updatedAt: String(resource?.updatedAt || '')
    };
  }

  function normalizeBackup(backup) {
    const base = emptyBackup();
    if (!backup || typeof backup !== 'object') return base;

    return {
      ...base,
      resourceId: String(backup.resourceId || ''),
      dataAmount: backup.dataAmount === '' || backup.dataAmount == null ? '' : numberValue(backup.dataAmount),
      dataUnit: backup.dataUnit === 'TB' ? 'TB' : 'GB',
      fullDay: DAYS.some(day => day.id === backup.fullDay) ? backup.fullDay : '',
      incrementalDays: Array.isArray(backup.incrementalDays)
        ? [...new Set(backup.incrementalDays.map(String).filter(dayId => DAYS.some(day => day.id === dayId)))]
        : [],
      priority: ['alta', 'media', 'baixa'].includes(backup.priority) ? backup.priority : '',
      dedupRatio: backup.dedupRatio === '' || backup.dedupRatio == null ? '' : numberValue(backup.dedupRatio),
      compressionPercent: backup.compressionPercent === '' || backup.compressionPercent == null ? '' : numberValue(backup.compressionPercent),
      storageEstimateGb: backup.storageEstimateGb === '' || backup.storageEstimateGb == null ? '' : numberValue(backup.storageEstimateGb),
      storageVerified: backup.storageVerified === true,
      restoreSizeGb: backup.restoreSizeGb === '' || backup.restoreSizeGb == null ? '' : numberValue(backup.restoreSizeGb),
      bandwidthMbps: backup.bandwidthMbps === '' || backup.bandwidthMbps == null ? '' : numberValue(backup.bandwidthMbps),
      restoreEstimateMinutes: backup.restoreEstimateMinutes === '' || backup.restoreEstimateMinutes == null ? '' : numberValue(backup.restoreEstimateMinutes),
      restoreVerified: backup.restoreVerified === true,
      updatedAt: String(backup.updatedAt || '')
    };
  }

  function normalizeIncident(incident) {
    return {
      id: String(incident?.id || uid('incident')),
      resourceId: String(incident?.resourceId || ''),
      resourceName: String(incident?.resourceName || '').trim(),
      day: String(incident?.day || ''),
      scenario: String(incident?.scenario || '').trim(),
      answer: String(incident?.answer || '').trim(),
      justification: String(incident?.justification || '').trim(),
      createdAt: String(incident?.createdAt || '')
    };
  }

  function ensureCloud() {
    if (!project.company || typeof project.company !== 'object') project.company = {};

    const current = project.company.cloudContinuity;
    const ready = !!(
      current &&
      typeof current === 'object' &&
      current.version === 1 &&
      Array.isArray(current.resources) &&
      current.backup &&
      typeof current.backup === 'object' &&
      Array.isArray(current.incidents)
    );

    if (ready) return current;

    const normalized = {
      version: 1,
      resources: Array.isArray(current?.resources)
        ? current.resources.map(normalizeResource)
        : [],
      backup: normalizeBackup(current?.backup),
      incidents: Array.isArray(current?.incidents)
        ? current.incidents.map(normalizeIncident)
        : []
    };

    project.company.cloudContinuity = normalized;
    return normalized;
  }

  function getLgpdCadastros() {
    const lgpd = project.company?.lgpd;
    return Array.isArray(lgpd?.cadastros) ? lgpd.cadastros : [];
  }

  function resourceById(resourceId) {
    return ensureCloud().resources.find(resource => resource.id === resourceId) || null;
  }

  function departmentById(departmentId) {
    return (project.departments || []).find(department => department.id === departmentId) || null;
  }

  function dayLabel(dayId) {
    return DAYS.find(day => day.id === dayId)?.label || dayId || '-';
  }

  function permissionLabel(permissionId) {
    return PERMISSIONS.find(permission => permission.id === permissionId)?.label || permissionId;
  }

  function hasCloudDraft() {
    return resourceDirty || backupDirty || incidentDirty || !!incidentDraft;
  }

  window.nuvemPossuiRascunho = hasCloudDraft;

  function injectStructure() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    if (!sidebar || !content) return;

    let navButton = sidebar.querySelector('[data-target="nuvem"]');
    if (!navButton) {
      navButton = document.createElement('button');
      navButton.className = 'nav-btn';
      navButton.dataset.target = 'nuvem';
      navButton.innerHTML = '☁️ Nuvem e Continuidade';

      const lgpdButton = sidebar.querySelector('[data-target="lgpd"]');
      const companyButton = sidebar.querySelector('[data-target="empresa"]');
      const anchor = lgpdButton || companyButton;
      if (anchor) anchor.insertAdjacentElement('afterend', navButton);
      else sidebar.appendChild(navButton);
    }

    let screen = document.querySelector('#nuvem');
    if (!screen) {
      screen = document.createElement('section');
      screen.id = 'nuvem';
      screen.className = 'screen';
      screen.innerHTML = `
        <div class="section-title">
          <p class="eyebrow">SEGURANÇA E CONTINUIDADE</p>
          <h2>Nuvem e Continuidade</h2>
        </div>

        <div class="cloud-intro">
          <strong>☁️ A empresa cresceu e começou a utilizar serviços em nuvem.</strong>
          <p>Agora o grupo precisa decidir quais recursos serão usados, quem poderá acessá-los, como os dados serão protegidos durante a transmissão e como a empresa vai se recuperar caso aconteça uma falha.</p>
        </div>

        <section class="cloud-section">
          <div class="cloud-section-head">
            <small>SEMANA 19 • IAM E CRIPTOGRAFIA</small>
            <h3>Recursos e acessos na nuvem</h3>
            <p>Criem recursos coerentes com a empresa do grupo e distribuam as permissões entre os departamentos. Usem o princípio do menor privilégio nas decisões.</p>
          </div>

          <div class="cloud-layout">
            <article class="cloud-card">
              <h4 id="cloudResourceFormTitle">Criar recurso na nuvem</h4>
              <p>O recurso pode representar um sistema, serviço, arquivos ou dados que a empresa decidiu manter na nuvem.</p>

              <div class="cloud-fields">
                <label>
                  Nome do recurso
                  <input id="cloudResourceName" type="text" placeholder="Criem um nome coerente com a empresa" />
                </label>

                <label>
                  Cadastro da LGPD relacionado (opcional)
                  <select id="cloudResourceLgpd"></select>
                </label>

                <label class="full">
                  Para que esse recurso será usado?
                  <textarea id="cloudResourcePurpose" rows="3" placeholder="Expliquem a finalidade dentro da empresa"></textarea>
                </label>

                <label class="full">
                  Proteção dos dados durante a transmissão
                  <select id="cloudTransport">
                    <option value="">Selecione...</option>
                    <option value="tls13">HTTPS com TLS 1.3</option>
                    <option value="none">Sem criptografia em trânsito</option>
                  </select>
                </label>
              </div>

              <div class="cloud-subtitle">
                <strong>IAM — Quem pode fazer o quê?</strong>
                <p>Marquem somente as permissões que cada departamento realmente precisa para trabalhar com este recurso.</p>
              </div>
              <div id="cloudAccessList" class="cloud-access-list"></div>

              <div class="cloud-actions">
                <button id="btnSalvarRecursoNuvem" class="btn btn-primary" type="button" data-auth-action="salvar um recurso e suas permissões na nuvem">💾 Salvar recurso</button>
                <button id="btnCancelarRecursoNuvem" class="btn btn-secondary hidden" type="button">Cancelar edição</button>
              </div>
            </article>

            <aside class="cloud-card">
              <h4>Recursos da empresa</h4>
              <p>O grupo deve conseguir explicar por que cada recurso existe e por que cada departamento recebeu aquelas permissões.</p>
              <div id="cloudResourceList" class="cloud-resource-list"></div>
            </aside>
          </div>
        </section>

        <section class="cloud-section">
          <div class="cloud-section-head">
            <small>SEMANA 20 • BACKUP E RECUPERAÇÃO</small>
            <h3>Plano de backup e continuidade</h3>
            <p>Escolham um dos recursos da nuvem e montem um plano para que a empresa consiga recuperar os dados se algo der errado.</p>
          </div>

          <article class="cloud-card">
            <div class="cloud-backup-grid">
              <div>
                <div class="cloud-fields">
                  <label class="full">
                    Recurso protegido pelo backup
                    <select id="cloudBackupResource"></select>
                  </label>

                  <label>
                    Quantidade de dados
                    <input id="cloudDataAmount" type="number" min="0" step="0.01" placeholder="Ex.: 2" />
                  </label>

                  <label>
                    Unidade
                    <select id="cloudDataUnit">
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </label>

                  <label>
                    Dia do backup Full
                    <select id="cloudFullDay">
                      <option value="">Selecione...</option>
                      ${DAYS.map(day => `<option value="${day.id}">${day.label}</option>`).join('')}
                    </select>
                  </label>

                  <label>
                    Prioridade de recuperação
                    <select id="cloudRecoveryPriority">
                      <option value="">Selecione...</option>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </label>
                </div>

                <div class="cloud-subtitle">
                  <strong>Dias de backup Incremental</strong>
                  <p>Escolham os dias em que serão salvas apenas as alterações realizadas desde o último backup.</p>
                </div>
                <div id="cloudIncrementalDays" class="cloud-days">
                  ${DAYS.map(day => `
                    <label class="cloud-day">
                      <input type="checkbox" value="${day.id}" /> ${day.label}
                    </label>
                  `).join('')}
                </div>
              </div>

              <div>
                <div class="cloud-calculator">
                  <h5>📦 Planejamento do espaço</h5>
                  <p>Façam a estimativa antes de verificar. O sistema só mostra o resultado depois que o grupo informa sua resposta.</p>
                  <div class="cloud-inline-fields">
                    <label>Deduplicação (x:1)<input id="cloudDedupRatio" type="number" min="1" step="0.1" placeholder="Ex.: 8" /></label>
                    <label>Compressão (%)<input id="cloudCompression" type="number" min="0" max="99" step="1" placeholder="Ex.: 40" /></label>
                    <label>Estimativa do grupo (GB)<input id="cloudStorageEstimate" type="number" min="0" step="0.1" placeholder="Resposta do grupo" /></label>
                  </div>
                  <div class="cloud-check-row">
                    <button id="btnVerificarArmazenamento" class="btn btn-secondary" type="button">Verificar cálculo</button>
                    <span id="cloudStorageResult" class="cloud-check-result"></span>
                  </div>
                </div>

                <div class="cloud-calculator">
                  <h5>⏱️ Estimativa de Restore</h5>
                  <p>Considerem o tamanho a restaurar e a velocidade disponível na rede. Informem primeiro a estimativa do grupo.</p>
                  <div class="cloud-inline-fields">
                    <label>Tamanho (GB)<input id="cloudRestoreSize" type="number" min="0" step="0.1" placeholder="Ex.: 60" /></label>
                    <label>Rede (Mbps)<input id="cloudBandwidth" type="number" min="0" step="0.1" placeholder="Ex.: 120" /></label>
                    <label>Estimativa (min)<input id="cloudRestoreEstimate" type="number" min="0" step="0.1" placeholder="Resposta do grupo" /></label>
                  </div>
                  <div class="cloud-check-row">
                    <button id="btnVerificarRestore" class="btn btn-secondary" type="button">Verificar estimativa</button>
                    <span id="cloudRestoreResult" class="cloud-check-result"></span>
                  </div>
                </div>
              </div>
            </div>

            <div id="cloudBackupSummary" class="cloud-plan-summary"></div>

            <div class="cloud-actions">
              <button id="btnSalvarPlanoContinuidade" class="btn btn-primary" type="button" data-auth-action="salvar o plano de backup e continuidade">💾 Salvar plano de backup</button>
            </div>
          </article>
        </section>

        <section class="cloud-section">
          <div class="cloud-section-head">
            <small>DESAFIO • CONTINUIDADE DE NEGÓCIO</small>
            <h3>Incidente na empresa</h3>
            <p>Depois de salvar o plano de backup, gerem uma situação-problema e expliquem como a empresa recuperaria os dados.</p>
          </div>

          <div class="cloud-incident-box">
            <h4>🚨 Simulação de incidente</h4>
            <p class="cloud-help">O cenário é criado a partir do plano de backup salvo pelo grupo. A resposta não é corrigida automaticamente: ela deverá ser revisada com o professor.</p>

            <div class="cloud-actions">
              <button id="btnGerarIncidente" class="btn btn-secondary" type="button">🎲 Gerar incidente</button>
            </div>

            <div id="cloudIncidentDraft"></div>
            <div id="cloudIncidentHistory" class="cloud-incident-history"></div>
          </div>
        </section>
      `;
      content.appendChild(screen);
    }
  }

  function fillLgpdOptions(selected = '') {
    const select = document.querySelector('#cloudResourceLgpd');
    if (!select) return;

    const cadastros = getLgpdCadastros();
    select.innerHTML = '<option value="">Não vincular a um cadastro</option>' + cadastros.map(cadastro =>
      `<option value="${esc(cadastro.id)}">${esc(cadastro.nome || 'Cadastro sem nome')}</option>`
    ).join('');
    select.value = cadastros.some(cadastro => cadastro.id === selected) ? selected : '';
  }

  function renderAccessMatrix(accesses = []) {
    const container = document.querySelector('#cloudAccessList');
    if (!container) return;

    const departments = Array.isArray(project.departments) ? project.departments : [];
    if (!departments.length) {
      container.innerHTML = '<div class="cloud-access-empty">Crie primeiro os departamentos da empresa para distribuir as permissões de IAM.</div>';
      return;
    }

    const accessMap = new Map(accesses.map(access => [access.departmentId, new Set(access.permissions)]));

    container.innerHTML = departments.map(department => {
      const selected = accessMap.get(department.id) || new Set();
      return `
        <div class="cloud-access-row" data-department-id="${esc(department.id)}">
          <strong>${esc(department.name)}</strong>
          <div class="cloud-permissions">
            ${PERMISSIONS.map(permission => `
              <label>
                <input type="checkbox" value="${permission.id}" ${selected.has(permission.id) ? 'checked' : ''} />
                ${permission.label}
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function readAccesses() {
    return Array.from(document.querySelectorAll('#cloudAccessList .cloud-access-row')).map(row => {
      const permissions = Array.from(row.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
      return {
        departmentId: row.dataset.departmentId || '',
        permissions
      };
    }).filter(access => access.departmentId && access.permissions.length);
  }

  function resetResourceForm(focus = false) {
    editingResourceId = null;
    resourceDirty = false;

    const name = document.querySelector('#cloudResourceName');
    const purpose = document.querySelector('#cloudResourcePurpose');
    const transport = document.querySelector('#cloudTransport');
    const title = document.querySelector('#cloudResourceFormTitle');
    const saveButton = document.querySelector('#btnSalvarRecursoNuvem');
    const cancelButton = document.querySelector('#btnCancelarRecursoNuvem');

    if (name) name.value = '';
    if (purpose) purpose.value = '';
    if (transport) transport.value = '';
    if (title) title.textContent = 'Criar recurso na nuvem';
    if (saveButton) saveButton.textContent = '💾 Salvar recurso';
    cancelButton?.classList.add('hidden');

    fillLgpdOptions('');
    renderAccessMatrix([]);
    if (focus) name?.focus();
  }

  function editResource(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource) return;

    editingResourceId = resource.id;
    resourceDirty = false;

    document.querySelector('#cloudResourceName').value = resource.name;
    document.querySelector('#cloudResourcePurpose').value = resource.purpose;
    document.querySelector('#cloudTransport').value = resource.transport;
    document.querySelector('#cloudResourceFormTitle').textContent = 'Editar recurso na nuvem';
    document.querySelector('#btnSalvarRecursoNuvem').textContent = '💾 Atualizar recurso';
    document.querySelector('#btnCancelarRecursoNuvem')?.classList.remove('hidden');

    fillLgpdOptions(resource.lgpdCadastroId);
    renderAccessMatrix(resource.accesses);
    document.querySelector('#cloudResourceName')?.focus();
  }

  function saveResource() {
    const cloud = ensureCloud();
    const name = document.querySelector('#cloudResourceName')?.value.trim() || '';
    const purpose = document.querySelector('#cloudResourcePurpose')?.value.trim() || '';
    const lgpdCadastroId = document.querySelector('#cloudResourceLgpd')?.value || '';
    const transport = document.querySelector('#cloudTransport')?.value || '';
    const accesses = readAccesses();

    if (!name) return alert('Escrevam o nome do recurso da nuvem.');
    if (!purpose) return alert('Expliquem para que esse recurso será usado.');
    if (!transport) return alert('Escolham como os dados serão protegidos durante a transmissão.');
    if (!accesses.length) return alert('Definam pelo menos uma permissão de acesso para um departamento.');

    const duplicate = cloud.resources.some(resource =>
      resource.id !== editingResourceId && resource.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return alert('Já existe um recurso na nuvem com esse nome.');

    const now = new Date().toISOString();

    if (editingResourceId) {
      const resource = cloud.resources.find(item => item.id === editingResourceId);
      if (!resource) return resetResourceForm();

      resource.name = name;
      resource.purpose = purpose;
      resource.lgpdCadastroId = lgpdCadastroId;
      resource.transport = transport;
      resource.accesses = accesses;
      resource.updatedAt = now;

      if (typeof addHistory === 'function') {
        addHistory('Nuvem', `Recurso de nuvem "${name}" e suas permissões foram atualizados.`);
      }
    } else {
      cloud.resources.push({
        id: uid('cloud'),
        name,
        purpose,
        lgpdCadastroId,
        transport,
        accesses,
        updatedAt: now
      });

      if (typeof addHistory === 'function') {
        addHistory('Nuvem', `Recurso de nuvem "${name}" foi criado com regras de acesso e proteção em trânsito.`);
      }
    }

    resourceDirty = false;
    resetResourceForm();
    renderResourceList();
    renderBackupResourceOptions(true);
    renderBackupSummary();
    if (typeof renderAll === 'function') renderAll();
    window.atualizarMissoes?.();
  }

  function deleteResource(resourceId) {
    const cloud = ensureCloud();
    const resource = cloud.resources.find(item => item.id === resourceId);
    if (!resource) return;

    if (!confirm(`Excluir o recurso "${resource.name}" da área de nuvem?`)) return;

    cloud.resources = cloud.resources.filter(item => item.id !== resourceId);

    if (cloud.backup.resourceId === resourceId) {
      cloud.backup = emptyBackup();
      backupDirty = false;
      storageCheckPassed = false;
      restoreCheckPassed = false;
    }

    if (editingResourceId === resourceId) resetResourceForm();

    if (typeof addHistory === 'function') {
      addHistory('Nuvem', `Recurso de nuvem "${resource.name}" foi removido.`);
    }

    renderResourceList();
    loadBackupForm();
    renderBackupSummary();
    if (typeof renderAll === 'function') renderAll();
    window.atualizarMissoes?.();
  }

  function renderResourceList() {
    const cloud = ensureCloud();
    const container = document.querySelector('#cloudResourceList');
    if (!container) return;

    if (!cloud.resources.length) {
      container.innerHTML = '<div class="cloud-resource-empty">Nenhum recurso na nuvem foi criado ainda.</div>';
      return;
    }

    const lgpd = getLgpdCadastros();

    container.innerHTML = cloud.resources.map(resource => {
      const accessSummary = resource.accesses.map(access => {
        const department = departmentById(access.departmentId);
        const permissions = access.permissions.map(permissionLabel).join(', ');
        return `${department?.name || 'Departamento não encontrado'}: ${permissions}`;
      }).join(' • ');

      const cadastro = lgpd.find(item => item.id === resource.lgpdCadastroId);
      const safe = resource.transport === 'tls13';

      return `
        <article class="cloud-resource-item">
          <div class="cloud-resource-top">
            <h5>${esc(resource.name || 'Recurso sem nome')}</h5>
            <span class="cloud-transport ${safe ? 'safe' : 'unsafe'}">${safe ? '🔒 TLS 1.3' : '🔓 Sem criptografia'}</span>
          </div>
          <p>${esc(resource.purpose || 'Finalidade não informada')}</p>
          <div class="cloud-resource-meta">
            <span><strong>IAM:</strong> ${esc(accessSummary || 'Sem permissões definidas')}</span>
            <span><strong>LGPD:</strong> ${esc(cadastro?.nome || 'Sem cadastro relacionado')}</span>
          </div>
          <div class="cloud-resource-actions">
            <button class="cloud-mini-btn cloud-resource-edit" type="button" data-id="${esc(resource.id)}">Editar</button>
            <button class="cloud-mini-btn danger cloud-resource-delete" type="button" data-id="${esc(resource.id)}" data-auth-action="excluir um recurso da nuvem">Excluir</button>
          </div>
        </article>
      `;
    }).join('');

    container.querySelectorAll('.cloud-resource-edit').forEach(button => {
      button.addEventListener('click', () => editResource(button.dataset.id));
    });

    container.querySelectorAll('.cloud-resource-delete').forEach(button => {
      button.addEventListener('click', () => deleteResource(button.dataset.id));
    });
  }

  function renderBackupResourceOptions(preserveCurrent = false) {
    const select = document.querySelector('#cloudBackupResource');
    if (!select) return;

    const cloud = ensureCloud();
    const previous = preserveCurrent ? select.value : cloud.backup.resourceId;
    select.innerHTML = '<option value="">Selecione...</option>' + cloud.resources.map(resource =>
      `<option value="${esc(resource.id)}">${esc(resource.name)}</option>`
    ).join('');

    select.value = cloud.resources.some(resource => resource.id === previous) ? previous : '';
  }

  function setCheckedIncrementalDays(days) {
    const selected = new Set(days || []);
    document.querySelectorAll('#cloudIncrementalDays input[type="checkbox"]').forEach(input => {
      input.checked = selected.has(input.value);
    });
  }

  function getCheckedIncrementalDays() {
    return Array.from(document.querySelectorAll('#cloudIncrementalDays input[type="checkbox"]:checked')).map(input => input.value);
  }

  function setCheckMessage(selector, message, ok = null) {
    const element = document.querySelector(selector);
    if (!element) return;
    element.textContent = message || '';
    element.classList.remove('ok', 'error');
    if (ok === true) element.classList.add('ok');
    if (ok === false) element.classList.add('error');
  }

  function loadBackupForm() {
    const backup = ensureCloud().backup;

    renderBackupResourceOptions(false);
    document.querySelector('#cloudDataAmount').value = backup.dataAmount;
    document.querySelector('#cloudDataUnit').value = backup.dataUnit;
    document.querySelector('#cloudFullDay').value = backup.fullDay;
    document.querySelector('#cloudRecoveryPriority').value = backup.priority;
    document.querySelector('#cloudDedupRatio').value = backup.dedupRatio;
    document.querySelector('#cloudCompression').value = backup.compressionPercent;
    document.querySelector('#cloudStorageEstimate').value = backup.storageEstimateGb;
    document.querySelector('#cloudRestoreSize').value = backup.restoreSizeGb;
    document.querySelector('#cloudBandwidth').value = backup.bandwidthMbps;
    document.querySelector('#cloudRestoreEstimate').value = backup.restoreEstimateMinutes;
    setCheckedIncrementalDays(backup.incrementalDays);

    storageCheckPassed = backup.storageVerified === true;
    restoreCheckPassed = backup.restoreVerified === true;
    backupDirty = false;

    setCheckMessage(
      '#cloudStorageResult',
      storageCheckPassed ? '✓ Cálculo verificado.' : '',
      storageCheckPassed ? true : null
    );
    setCheckMessage(
      '#cloudRestoreResult',
      restoreCheckPassed ? '✓ Estimativa verificada.' : '',
      restoreCheckPassed ? true : null
    );
  }

  function dataAmountInGb() {
    const amount = numberValue(document.querySelector('#cloudDataAmount')?.value);
    const unit = document.querySelector('#cloudDataUnit')?.value || 'GB';
    return unit === 'TB' ? amount * 1000 : amount;
  }

  function verifyStorage() {
    const dataGb = dataAmountInGb();
    const dedup = numberValue(document.querySelector('#cloudDedupRatio')?.value);
    const compression = numberValue(document.querySelector('#cloudCompression')?.value, -1);
    const estimate = numberValue(document.querySelector('#cloudStorageEstimate')?.value);

    if (dataGb <= 0 || dedup <= 0 || compression < 0 || compression >= 100 || estimate <= 0) {
      storageCheckPassed = false;
      setCheckMessage('#cloudStorageResult', 'Preencham quantidade de dados, deduplicação, compressão e a estimativa do grupo.', false);
      return;
    }

    const expected = (dataGb / dedup) * (1 - compression / 100);
    const tolerance = Math.max(1, expected * 0.05);
    const correct = Math.abs(estimate - expected) <= tolerance;
    storageCheckPassed = correct;

    if (correct) {
      setCheckMessage('#cloudStorageResult', `✓ Estimativa coerente: aproximadamente ${expected.toFixed(1)} GB.`, true);
    } else {
      setCheckMessage('#cloudStorageResult', `Revejam o cálculo. Com os valores informados, o resultado fica próximo de ${expected.toFixed(1)} GB.`, false);
    }
  }

  function verifyRestore() {
    const sizeGb = numberValue(document.querySelector('#cloudRestoreSize')?.value);
    const bandwidth = numberValue(document.querySelector('#cloudBandwidth')?.value);
    const estimate = numberValue(document.querySelector('#cloudRestoreEstimate')?.value);

    if (sizeGb <= 0 || bandwidth <= 0 || estimate <= 0) {
      restoreCheckPassed = false;
      setCheckMessage('#cloudRestoreResult', 'Preencham tamanho, velocidade da rede e a estimativa do grupo.', false);
      return;
    }

    // Conversão didática usada no conteúdo: 1 GB ≈ 8.000 Mb.
    const expectedMinutes = (sizeGb * 8000 / bandwidth) / 60;
    const tolerance = Math.max(1, expectedMinutes * 0.05);
    const correct = Math.abs(estimate - expectedMinutes) <= tolerance;
    restoreCheckPassed = correct;

    if (correct) {
      setCheckMessage('#cloudRestoreResult', `✓ Estimativa coerente: aproximadamente ${expectedMinutes.toFixed(1)} minutos.`, true);
    } else {
      setCheckMessage('#cloudRestoreResult', `Revejam a estimativa. Com esses valores, o tempo fica próximo de ${expectedMinutes.toFixed(1)} minutos.`, false);
    }
  }

  function saveBackupPlan() {
    const cloud = ensureCloud();
    const resourceId = document.querySelector('#cloudBackupResource')?.value || '';
    const resource = cloud.resources.find(item => item.id === resourceId) || null;
    const dataAmount = numberValue(document.querySelector('#cloudDataAmount')?.value);
    const dataUnit = document.querySelector('#cloudDataUnit')?.value === 'TB' ? 'TB' : 'GB';
    const fullDay = document.querySelector('#cloudFullDay')?.value || '';
    const incrementalDays = getCheckedIncrementalDays();
    const priority = document.querySelector('#cloudRecoveryPriority')?.value || '';
    const dedupRatio = numberValue(document.querySelector('#cloudDedupRatio')?.value);
    const compressionPercent = numberValue(document.querySelector('#cloudCompression')?.value, -1);
    const storageEstimateGb = numberValue(document.querySelector('#cloudStorageEstimate')?.value);
    const restoreSizeGb = numberValue(document.querySelector('#cloudRestoreSize')?.value);
    const bandwidthMbps = numberValue(document.querySelector('#cloudBandwidth')?.value);
    const restoreEstimateMinutes = numberValue(document.querySelector('#cloudRestoreEstimate')?.value);

    if (!resource) return alert('Escolham qual recurso da nuvem será protegido pelo plano.');
    if (dataAmount <= 0) return alert('Informem a quantidade de dados que será protegida.');
    if (!fullDay) return alert('Escolham o dia do backup Full.');
    if (!incrementalDays.length) return alert('Escolham pelo menos um dia de backup Incremental.');
    if (incrementalDays.includes(fullDay)) return alert('O mesmo dia não deve ser marcado como Full e Incremental neste plano.');
    if (!priority) return alert('Definam a prioridade de recuperação do recurso.');
    if (dedupRatio <= 0 || compressionPercent < 0 || compressionPercent >= 100 || storageEstimateGb <= 0) {
      return alert('Completem o planejamento de espaço do backup.');
    }
    if (!storageCheckPassed) return alert('Verifiquem e acertem primeiro o cálculo do espaço de armazenamento.');
    if (restoreSizeGb <= 0 || bandwidthMbps <= 0 || restoreEstimateMinutes <= 0) {
      return alert('Completem a estimativa de Restore.');
    }
    if (!restoreCheckPassed) return alert('Verifiquem e acertem primeiro a estimativa de Restore.');

    cloud.backup = {
      resourceId,
      dataAmount,
      dataUnit,
      fullDay,
      incrementalDays,
      priority,
      dedupRatio,
      compressionPercent,
      storageEstimateGb,
      storageVerified: true,
      restoreSizeGb,
      bandwidthMbps,
      restoreEstimateMinutes,
      restoreVerified: true,
      updatedAt: new Date().toISOString()
    };

    backupDirty = false;

    if (typeof addHistory === 'function') {
      addHistory('Continuidade', `Plano de backup e recuperação do recurso "${resource.name}" foi salvo.`);
    }

    renderBackupSummary();
    if (typeof renderAll === 'function') renderAll();
    window.atualizarMissoes?.();
  }

  function renderBackupSummary() {
    const container = document.querySelector('#cloudBackupSummary');
    if (!container) return;

    const cloud = ensureCloud();
    const backup = cloud.backup;
    const resource = cloud.resources.find(item => item.id === backup.resourceId) || null;

    if (!resource || !backup.fullDay) {
      container.innerHTML = '<strong>Plano ainda não salvo.</strong> Preencham as decisões acima, verifiquem os dois cálculos e salvem o plano.';
      return;
    }

    const incrementals = backup.incrementalDays.map(dayLabel).join(', ') || '-';
    const priority = backup.priority === 'alta' ? 'Alta' : backup.priority === 'media' ? 'Média' : 'Baixa';

    container.innerHTML = `
      <strong>Plano atual:</strong> ${esc(resource.name)} • Full: ${esc(dayLabel(backup.fullDay))} • Incrementais: ${esc(incrementals)} • Prioridade: ${esc(priority)}.<br>
      Espaço estimado pelo grupo: ${esc(backup.storageEstimateGb)} GB • Restore estimado: ${esc(backup.restoreEstimateMinutes)} min.
    `;
  }

  function generateIncident() {
    const cloud = ensureCloud();
    const backup = cloud.backup;
    const resource = cloud.resources.find(item => item.id === backup.resourceId) || null;

    if (!resource || !backup.fullDay || !backup.incrementalDays.length) {
      return alert('Salvem primeiro um plano de backup completo para gerar o incidente.');
    }

    if (incidentDraft) {
      const replace = confirm('Já existe um incidente em andamento. Deseja gerar outro cenário e substituir o rascunho atual?');
      if (!replace) return;
    }

    const possibleDays = backup.incrementalDays;
    const day = possibleDays[Math.floor(Math.random() * possibleDays.length)];
    const scenario = `Na ${dayLabel(day)}, antes do backup Incremental programado para esse dia, o recurso "${resource.name}" ficou indisponível após uma falha no servidor. Considerando o plano salvo pela empresa, quais arquivos de backup vocês utilizariam para restaurar os dados e em qual ordem?`;

    incidentDraft = {
      id: uid('incident'),
      resourceId: resource.id,
      resourceName: resource.name,
      day,
      scenario,
      createdAt: new Date().toISOString()
    };
    incidentDirty = true;
    renderIncidentDraft();
  }

  function renderIncidentDraft() {
    const container = document.querySelector('#cloudIncidentDraft');
    if (!container) return;

    if (!incidentDraft) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="cloud-incident-scenario"><strong>Cenário:</strong> ${esc(incidentDraft.scenario)}</div>
      <div class="cloud-incident-answer">
        <label>
          Como o grupo faria a restauração?
          <textarea id="cloudIncidentAnswer" rows="4" placeholder="Expliquem quais backups seriam utilizados e a ordem da restauração"></textarea>
        </label>
        <label>
          Por que essa solução ajuda a empresa a continuar funcionando?
          <textarea id="cloudIncidentJustification" rows="3" placeholder="Justifiquem a decisão do grupo"></textarea>
        </label>
      </div>
      <div class="cloud-actions">
        <button id="btnSalvarRespostaIncidente" class="btn btn-primary" type="button" data-auth-action="salvar a resposta do incidente de continuidade">💾 Salvar resposta do incidente</button>
        <button id="btnCancelarIncidente" class="btn btn-secondary" type="button">Cancelar</button>
      </div>
    `;

    container.querySelectorAll('textarea').forEach(field => {
      field.addEventListener('input', () => {
        incidentDirty = true;
      });
    });

    container.querySelector('#btnSalvarRespostaIncidente')?.addEventListener('click', saveIncident);
    container.querySelector('#btnCancelarIncidente')?.addEventListener('click', () => {
      incidentDraft = null;
      incidentDirty = false;
      renderIncidentDraft();
    });
  }

  function saveIncident() {
    if (!incidentDraft) return alert('Gere primeiro um incidente.');

    const answer = document.querySelector('#cloudIncidentAnswer')?.value.trim() || '';
    const justification = document.querySelector('#cloudIncidentJustification')?.value.trim() || '';
    if (!answer) return alert('Expliquem como o grupo faria a restauração.');
    if (!justification) return alert('Justifiquem como a decisão ajuda na continuidade da empresa.');

    const cloud = ensureCloud();
    cloud.incidents.unshift({
      ...incidentDraft,
      answer,
      justification
    });

    if (typeof addHistory === 'function') {
      addHistory('Continuidade', `Incidente de recuperação do recurso "${incidentDraft.resourceName}" foi analisado e respondido pelo grupo.`);
    }

    incidentDraft = null;
    incidentDirty = false;
    renderIncidentDraft();
    renderIncidentHistory();
    if (typeof renderAll === 'function') renderAll();
    window.atualizarMissoes?.();
  }

  function renderIncidentHistory() {
    const container = document.querySelector('#cloudIncidentHistory');
    if (!container) return;

    const incidents = ensureCloud().incidents;
    if (!incidents.length) {
      container.innerHTML = '<div class="cloud-resource-empty">Nenhum incidente foi resolvido ainda.</div>';
      return;
    }

    container.innerHTML = `
      <strong>Incidentes já respondidos</strong>
      ${incidents.slice(0, 3).map((incident, index) => `
        <article class="cloud-incident-saved">
          <strong>Incidente ${incidents.length - index} • ${esc(incident.resourceName || 'Recurso')}</strong>
          <p>${esc(incident.scenario)}</p>
          <p><strong>Resposta do grupo:</strong> ${esc(incident.answer)}</p>
        </article>
      `).join('')}
    `;
  }

  function renderCloudFromProject() {
    ensureCloud();
    resetResourceForm(false);
    renderResourceList();
    loadBackupForm();
    renderBackupSummary();
    incidentDraft = null;
    incidentDirty = false;
    renderIncidentDraft();
    renderIncidentHistory();
  }

  function openCloudScreen() {
    document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.querySelector('[data-target="nuvem"]')?.classList.add('active');
    document.querySelector('#nuvem')?.classList.add('active');

    if (!hasCloudDraft()) renderCloudFromProject();
    else {
      renderResourceList();
      renderBackupSummary();
      renderIncidentHistory();
    }
  }

  function bindDirtyTracking() {
    const resourceSelectors = [
      '#cloudResourceName', '#cloudResourceLgpd', '#cloudResourcePurpose', '#cloudTransport', '#cloudAccessList'
    ];

    resourceSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.addEventListener('input', () => { resourceDirty = true; });
      element.addEventListener('change', () => { resourceDirty = true; });
    });

    const storageSelectors = [
      '#cloudDataAmount', '#cloudDataUnit', '#cloudDedupRatio', '#cloudCompression', '#cloudStorageEstimate'
    ];
    storageSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      const reset = () => {
        backupDirty = true;
        storageCheckPassed = false;
        setCheckMessage('#cloudStorageResult', 'Cálculo alterado. Verifiquem novamente.', null);
      };
      element.addEventListener('input', reset);
      element.addEventListener('change', reset);
    });

    const restoreSelectors = ['#cloudRestoreSize', '#cloudBandwidth', '#cloudRestoreEstimate'];
    restoreSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      const reset = () => {
        backupDirty = true;
        restoreCheckPassed = false;
        setCheckMessage('#cloudRestoreResult', 'Estimativa alterada. Verifiquem novamente.', null);
      };
      element.addEventListener('input', reset);
      element.addEventListener('change', reset);
    });

    ['#cloudBackupResource', '#cloudFullDay', '#cloudRecoveryPriority', '#cloudIncrementalDays'].forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.addEventListener('input', () => { backupDirty = true; });
      element.addEventListener('change', () => { backupDirty = true; });
    });
  }

  function bindEvents() {
    document.querySelector('[data-target="nuvem"]')?.addEventListener('click', openCloudScreen);
    document.querySelector('#btnSalvarRecursoNuvem')?.addEventListener('click', saveResource);
    document.querySelector('#btnCancelarRecursoNuvem')?.addEventListener('click', () => resetResourceForm(true));
    document.querySelector('#btnVerificarArmazenamento')?.addEventListener('click', verifyStorage);
    document.querySelector('#btnVerificarRestore')?.addEventListener('click', verifyRestore);
    document.querySelector('#btnSalvarPlanoContinuidade')?.addEventListener('click', saveBackupPlan);
    document.querySelector('#btnGerarIncidente')?.addEventListener('click', generateIncident);
    bindDirtyTracking();
  }

  function watchProjectFileOpen() {
    const input = document.querySelector('#inputAbrirProjeto');
    if (!input || input.dataset.cloudWatch === '1') return;

    input.dataset.cloudWatch = '1';
    input.addEventListener('change', () => {
      const previousProject = project;
      let checks = 0;

      if (projectLoadWatch) clearInterval(projectLoadWatch);
      projectLoadWatch = setInterval(() => {
        checks += 1;
        if (project !== previousProject || checks >= 40) {
          clearInterval(projectLoadWatch);
          projectLoadWatch = null;

          if (project !== previousProject) {
            resourceDirty = false;
            backupDirty = false;
            incidentDirty = false;
            incidentDraft = null;
            storageCheckPassed = false;
            restoreCheckPassed = false;
            ensureCloud();
            renderCloudFromProject();
            window.atualizarMissoes?.();
          }
        }
      }, 100);
    });
  }

  // O botão principal de Salvar projeto não deve baixar um JSON se o aluno
  // ainda estiver com decisões desta área apenas no formulário.
  const previousSaveProject = typeof saveProject === 'function' ? saveProject : null;
  if (previousSaveProject) {
    saveProject = function() {
      if (hasCloudDraft()) {
        alert('Existem alterações não salvas em Nuvem e Continuidade.\n\nSalve ou cancele o que está em edição antes de baixar o projeto.');
        return;
      }
      return previousSaveProject();
    };
  }

  function protectCloudBeforeUnload(event) {
    if (!hasCloudDraft()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function start() {
    ensureCloud();
    bindEvents();
    watchProjectFileOpen();
    renderCloudFromProject();
    window.addEventListener('beforeunload', protectCloudBeforeUnload);
  }

  // Injeta ainda durante o carregamento do documento para que a navegação
  // original também reconheça a nova tela sem alterar app.js.
  injectStructure();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
