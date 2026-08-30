/* =========================================================
   SALVAMENTO EM LOTE - Projeto de Redes
   - Departamentos e Mapa da Rede podem ser montados livremente.
   - A autenticação acontece apenas ao salvar a área.
   - O histórico recebe um resumo completo do lote salvo.
   - O JSON só pode ser baixado quando não há alterações pendentes.
   - O navegador avisa antes de fechar/recarregar com mudanças não salvas.
   - Alterações de andares fazem parte do lote do Mapa da Rede.
   ========================================================= */

(() => {
  if (typeof addHistory !== 'function' || typeof saveProject !== 'function') return;

  const pending = {
    departments: [],
    map: []
  };

  const originalAddHistory = addHistory;
  const originalSaveProject = saveProject;
  const originalRenderAll = typeof renderAll === 'function' ? renderAll : null;
  const originalDragStart = typeof dragStart === 'function' ? dragStart : null;
  let lastProjectReference = typeof project !== 'undefined' ? project : null;

  function addPending(area, description) {
    if (!pending[area] || !description) return;
    if (!pending[area].includes(description)) pending[area].push(description);
    updatePendingUI();
  }

  function clearPending(area) {
    if (!pending[area]) return;
    pending[area] = [];
    updatePendingUI();
  }

  function clearAllPending() {
    pending.departments = [];
    pending.map = [];
    updatePendingUI();
  }

  function identifyArea(description) {
    const text = String(description || '');

    if (
      text.startsWith('Departamento "') &&
      (text.includes('foi criado') || text.includes('foi removido'))
    ) {
      return 'departments';
    }

    if (
      text.includes('adicionado ao mapa da rede') ||
      text.includes('adicionado ao mapa do andar') ||
      text.startsWith('Andar "') ||
      text.startsWith('Conexão criada entre') ||
      (text.startsWith('Equipamento "') && text.includes('alterado:')) ||
      (text.startsWith('Equipamento "') && text.includes('foi removido da rede')) ||
      (text.startsWith('Equipamento "') && text.includes('foi movido do andar'))
    ) {
      return 'map';
    }

    return null;
  }

  addHistory = function(type, description) {
    const area = identifyArea(description);
    if (area) {
      addPending(area, description);
      return;
    }
    return originalAddHistory(type, description);
  };

  if (originalDragStart) {
    dragStart = function(event) {
      const element = event.currentTarget;
      const equipment = typeof project !== 'undefined'
        ? project.equipment.find(item => item.id === element?.dataset?.id)
        : null;

      const startX = equipment?.x;
      const startY = equipment?.y;

      if (element && equipment) {
        element.addEventListener('pointerup', () => {
          if (equipment.x !== startX || equipment.y !== startY) {
            addPending('map', `Posição de "${equipment.name}" ajustada no mapa.`);
          }
        }, { once: true });
      }

      return originalDragStart(event);
    };
  }

  if (originalRenderAll) {
    renderAll = function() {
      if (typeof project !== 'undefined' && project !== lastProjectReference) {
        lastProjectReference = project;
        clearAllPending();
      }

      const result = originalRenderAll();
      updatePendingUI();
      return result;
    };
  }

  function injectControls() {
    const departmentSection = document.querySelector('#departamentos');
    const departmentList = document.querySelector('#listaDepartamentos');

    if (departmentSection && !document.querySelector('#btnSalvarDepartamentos')) {
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.innerHTML = `
        <button id="btnSalvarDepartamentos" class="btn btn-primary" type="button" disabled>
          💾 Salvar alterações dos departamentos
        </button>
        <p id="statusSalvarDepartamentos" style="margin:10px 0 0;color:#64748b;font-size:12px">
          Todas as alterações de departamentos estão salvas.
        </p>
      `;

      if (departmentList) departmentSection.insertBefore(panel, departmentList);
      else departmentSection.appendChild(panel);

      panel.querySelector('#btnSalvarDepartamentos').addEventListener('click', saveDepartmentsBatch);
    }

    const toolbar = document.querySelector('#mapa .toolbar');
    if (toolbar && !document.querySelector('#btnSalvarMapa')) {
      const button = document.createElement('button');
      button.id = 'btnSalvarMapa';
      button.type = 'button';
      button.className = 'btn btn-primary';
      button.disabled = true;
      button.textContent = '💾 Salvar alterações do mapa';
      button.addEventListener('click', saveMapBatch);

      const zoomControls = toolbar.querySelector('.map-zoom-controls');
      if (zoomControls) toolbar.insertBefore(button, zoomControls);
      else toolbar.appendChild(button);
    }

    const connectionStatus = document.querySelector('#statusConexao');
    if (connectionStatus && !document.querySelector('#statusSalvarMapa')) {
      const status = document.createElement('p');
      status.id = 'statusSalvarMapa';
      status.style.margin = '8px 0 12px';
      status.style.color = '#64748b';
      status.style.fontSize = '12px';
      status.textContent = 'Todas as alterações do mapa estão salvas.';
      connectionStatus.insertAdjacentElement('afterend', status);
    }

    updatePendingUI();
  }

  function updatePendingUI() {
    const departmentCount = pending.departments.length;
    const mapCount = pending.map.length;

    const departmentButton = document.querySelector('#btnSalvarDepartamentos');
    const departmentStatus = document.querySelector('#statusSalvarDepartamentos');
    if (departmentButton) departmentButton.disabled = departmentCount === 0;
    if (departmentStatus) {
      departmentStatus.textContent = departmentCount
        ? `${departmentCount} alteração(ões) aguardando salvamento.`
        : 'Todas as alterações de departamentos estão salvas.';
    }

    const mapButton = document.querySelector('#btnSalvarMapa');
    const mapStatus = document.querySelector('#statusSalvarMapa');
    if (mapButton) mapButton.disabled = mapCount === 0;
    if (mapStatus) {
      mapStatus.textContent = mapCount
        ? `${mapCount} alteração(ões) aguardando salvamento.`
        : 'Todas as alterações do mapa estão salvas.';
    }
  }

  function saveDepartmentsBatch() {
    if (!pending.departments.length) {
      alert('Não há alterações de departamentos para salvar.');
      return;
    }

    const summary = pending.departments.join(' ');
    addHistory('Configuração', `Alterações de departamentos salvas: ${summary}`);
    clearPending('departments');
    if (typeof renderAll === 'function') renderAll();
    alert('Departamentos salvos e registrados no histórico.');
  }

  function saveMapBatch() {
    if (!pending.map.length) {
      alert('Não há alterações do mapa para salvar.');
      return;
    }

    const summary = pending.map.join(' ');
    addHistory('Configuração', `Alterações do Mapa da Rede salvas: ${summary}`);
    clearPending('map');
    if (typeof renderAll === 'function') renderAll();
    alert('Mapa da Rede salvo e registrado no histórico.');
  }

  function hasCompanyDraft() {
    if (typeof project === 'undefined') return false;

    const name = document.querySelector('#empresaNome');
    const group = document.querySelector('#empresaGrupo');
    const members = document.querySelector('#empresaIntegrantes');
    const description = document.querySelector('#empresaDescricao');
    if (!name || !group || !members || !description) return false;

    return (
      (name.value.trim() || 'Minha Empresa') !== (project.company.name || 'Minha Empresa') ||
      group.value.trim() !== (project.company.group || '') ||
      members.value.trim() !== (project.company.members || '') ||
      description.value.trim() !== (project.company.description || '')
    );
  }

  function hasLgpdDraft() {
    if (!document.querySelector('#lgpd')) return false;

    const hasText = [
      '#lgpdCadastroNome', '#lgpdTitular', '#lgpdFinalidade',
      '#lgpdJustificativa', '#lgpdNovoDado'
    ].some(selector => (document.querySelector(selector)?.value || '').trim());

    const hasAddedData = document.querySelectorAll('#lgpdDadosAdicionados .lgpd-added-item').length > 0;
    const hasNeedAnswer = !!document.querySelector('input[name="lgpdNecessidade"]:checked');
    const editingBadge = document.querySelector('#lgpdModoEdicao');
    const isEditing = editingBadge ? !editingBadge.classList.contains('hidden') : false;

    return hasText || hasAddedData || hasNeedAnswer || isEditing;
  }

  function getUnsavedAreas() {
    const areas = [];
    if (hasCompanyDraft()) areas.push('Dados da empresa');
    if (pending.departments.length) areas.push('Departamentos');
    if (pending.map.length) areas.push('Mapa da Rede');

    const equipmentModal = document.querySelector('#modalEquipamento');
    if (equipmentModal && !equipmentModal.classList.contains('hidden')) {
      areas.push('Edição de equipamento aberta');
    }

    if (hasLgpdDraft()) areas.push('LGPD e Dados');
    return [...new Set(areas)];
  }

  saveProject = function() {
    const unsavedAreas = getUnsavedAreas();
    if (unsavedAreas.length) {
      alert(
        'Existem alterações que ainda não foram registradas.\n\n' +
        `Salve primeiro: ${unsavedAreas.join(', ')}.\n\n` +
        'Depois clique novamente em Salvar projeto.'
      );
      return;
    }

    return originalSaveProject();
  };

  function protectBeforeUnload(event) {
    if (!getUnsavedAreas().length) return;

    // Navegadores modernos exibem uma mensagem padrão de confirmação.
    // O texto personalizado é ignorado por segurança, mas a saída é bloqueada
    // até o usuário confirmar se realmente deseja fechar/recarregar a página.
    event.preventDefault();
    event.returnValue = '';
  }

  function start() {
    injectControls();
    updatePendingUI();
    window.addEventListener('beforeunload', protectBeforeUnload);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
