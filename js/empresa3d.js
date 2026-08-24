/* =========================================================
   EMPRESA 3D - Projeto de Redes
   - Cria a nova tela automaticamente
   - Salva a personalizacao dentro de project.company.visual
   - Mantem compatibilidade com JSONs antigos
   ========================================================= */

(() => {
  const VISUAL_PADRAO = {
    primary: '#2563eb',
    secondary: '#0f172a',
    facade: '#e2e8f0',
    buildingStyle: 'moderno',
    environment: 'empresarial',
    signMode: 'nome-logo',
    rotation: -18,
    logo: {
      mode: 'generated',
      icon: '🌐',
      shape: 'arredondada',
      text: '',
      image: ''
    }
  };

  function cloneVisualPadrao() {
    return JSON.parse(JSON.stringify(VISUAL_PADRAO));
  }

  function garantirVisual() {
    if (!project.company) project.company = {};

    if (!project.company.visual) {
      project.company.visual = cloneVisualPadrao();
      return project.company.visual;
    }

    const atual = project.company.visual;
    project.company.visual = {
      ...cloneVisualPadrao(),
      ...atual,
      logo: {
        ...cloneVisualPadrao().logo,
        ...(atual.logo || {})
      }
    };

    return project.company.visual;
  }

  function injetarEstrutura() {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');

    if (!sidebar || !content || document.querySelector('[data-target="empresa3d"]')) return;

    const btnEmpresa = sidebar.querySelector('[data-target="empresa"]');
    const btn3d = document.createElement('button');
    btn3d.className = 'nav-btn';
    btn3d.dataset.target = 'empresa3d';
    btn3d.innerHTML = '🏙️ Minha Empresa 3D';

    if (btnEmpresa) btnEmpresa.insertAdjacentElement('afterend', btn3d);
    else sidebar.appendChild(btn3d);

    const screen = document.createElement('section');
    screen.id = 'empresa3d';
    screen.className = 'screen';
    screen.innerHTML = `
      <div class="section-title">
        <p class="eyebrow">IDENTIDADE VISUAL</p>
        <h2>Minha Empresa 3D</h2>
      </div>

      <div class="empresa3d-summary">
        <article class="empresa3d-summary-card"><small>🏢 Departamentos</small><strong id="e3dStatDepartamentos">0</strong></article>
        <article class="empresa3d-summary-card"><small>💻 Equipamentos</small><strong id="e3dStatEquipamentos">0</strong></article>
        <article class="empresa3d-summary-card"><small>🌐 Roteadores</small><strong id="e3dStatRoteadores">0</strong></article>
        <article class="empresa3d-summary-card"><small>📶 Access Points</small><strong id="e3dStatAps">0</strong></article>
      </div>

      <div class="empresa3d-grid">
        <section class="empresa3d-preview-panel">
          <div class="empresa3d-preview-top">
            <div>
              <p class="eyebrow">MAQUETE DA EMPRESA</p>
              <h3 id="e3dTituloPreview">Minha Empresa</h3>
            </div>
            <span class="empresa3d-badge">Visualização 3D leve</span>
          </div>

          <div id="empresa3dCena" class="empresa3d-cena ambiente-empresarial">
            <div class="empresa3d-sol"></div>
            <div class="empresa3d-chao"></div>
            <span class="empresa3d-arvore a1">🌳</span>
            <span class="empresa3d-arvore a2">🌲</span>
            <span class="empresa3d-arvore a3">🌳</span>

            <div id="empresa3dPredio" class="empresa3d-predio-wrap estilo-moderno">
              <div class="empresa3d-face empresa3d-frente">
                <div id="empresa3dPlaca" class="empresa3d-placa"></div>
                <div class="empresa3d-janelas">
                  <span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span>
                  <span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span><span class="empresa3d-janela"></span>
                </div>
                <div class="empresa3d-porta"></div>
                <div id="empresa3dServidorBadge" class="empresa3d-servidor-badge hidden">🗄️ Sala técnica</div>
              </div>

              <div class="empresa3d-face empresa3d-tras"></div>

              <div class="empresa3d-face empresa3d-lado">
                <div class="empresa3d-lado-janelas">
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>

              <div class="empresa3d-face empresa3d-teto">
                <div id="empresa3dAntena" class="empresa3d-antena hidden">📡</div>
              </div>
            </div>

            <div id="empresa3dOverlay" class="empresa3d-info-overlay"></div>
          </div>
        </section>

        <aside class="empresa3d-config-panel">
          <h3>🎨 Personalizar empresa</h3>

          <div class="empresa3d-config-section">
            <h4>Prédio e ambiente</h4>
            <div class="empresa3d-fields">
              <label>
                Estilo do prédio
                <select id="e3dEstilo">
                  <option value="moderno">Moderno</option>
                  <option value="empresarial">Empresarial</option>
                  <option value="tecnologico">Tecnológico</option>
                </select>
              </label>

              <label>
                Ambiente
                <select id="e3dAmbiente">
                  <option value="empresarial">Empresarial</option>
                  <option value="urbano">Urbano</option>
                  <option value="verde">Área verde</option>
                </select>
              </label>

              <label class="full">
                Placa da fachada
                <select id="e3dPlaca">
                  <option value="nome-logo">Nome + logo</option>
                  <option value="nome">Somente nome</option>
                  <option value="logo">Somente logo</option>
                </select>
              </label>
            </div>

            <div class="empresa3d-color-row" style="margin-top:12px">
              <label>Cor principal<input id="e3dCorPrincipal" type="color" value="#2563eb"></label>
              <label>Cor secundária<input id="e3dCorSecundaria" type="color" value="#0f172a"></label>
              <label>Fachada<input id="e3dCorFachada" type="color" value="#e2e8f0"></label>
            </div>

            <div style="margin-top:14px">
              <label style="font-size:12px;font-weight:800">Girar prédio</label>
              <div class="empresa3d-range-row">
                <input id="e3dRotacao" type="range" min="-28" max="28" value="-18" step="1">
                <span id="e3dRotacaoValor" class="empresa3d-range-value">-18°</span>
              </div>
            </div>
          </div>

          <div class="empresa3d-config-section">
            <h4>Logo da empresa</h4>

            <div class="empresa3d-logo-area">
              <div id="e3dLogoPreview" class="empresa3d-logo-preview"></div>

              <div class="empresa3d-fields">
                <label>
                  Símbolo
                  <select id="e3dLogoIcone">
                    <option value="🌐">🌐 Rede</option>
                    <option value="💻">💻 Tecnologia</option>
                    <option value="📡">📡 Conexão</option>
                    <option value="🔗">🔗 Integração</option>
                    <option value="⚡">⚡ Energia</option>
                    <option value="🛡️">🛡️ Segurança</option>
                    <option value="🖧">🖧 Infraestrutura</option>
                  </select>
                </label>

                <label>
                  Formato
                  <select id="e3dLogoForma">
                    <option value="arredondada">Arredondado</option>
                    <option value="circular">Circular</option>
                    <option value="quadrada">Quadrado</option>
                    <option value="hexagonal">Hexagonal</option>
                  </select>
                </label>

                <label class="full">
                  Nome usado na logo
                  <input id="e3dLogoTexto" type="text" placeholder="Deixe vazio para usar o nome da empresa">
                </label>
              </div>
            </div>

            <div class="empresa3d-upload-actions">
              <label class="btn btn-secondary file-btn">
                📁 Enviar logo própria
                <input id="e3dLogoUpload" type="file" accept="image/png,image/jpeg,image/webp">
              </label>
              <button id="e3dUsarLogoCriada" class="btn btn-secondary" type="button">🎨 Usar logo criada</button>
            </div>
          </div>

          <div class="empresa3d-config-section">
            <button id="e3dSalvarVisual" class="btn btn-primary" style="width:100%" type="button">Salvar personalização</button>
            <p class="empresa3d-save-note">A aparência fica guardada dentro do mesmo arquivo JSON do grupo. Depois, use também o botão <strong>Salvar projeto</strong> no topo para baixar a versão atualizada.</p>
          </div>
        </aside>
      </div>

      <div class="section-title" style="margin-top:24px">
        <p class="eyebrow">SETORES DA EMPRESA</p>
        <h2 style="font-size:20px">Departamentos na maquete</h2>
      </div>
      <div id="empresa3dDepartamentos" class="empresa3d-departamentos"></div>
    `;

    content.appendChild(screen);
  }

  function siglaDoNome(nome) {
    const partes = String(nome || 'Empresa').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'EM';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function htmlLogo(tamanho = 'grande') {
    const visual = garantirVisual();
    const logo = visual.logo;

    if (logo.mode === 'upload' && logo.image) {
      return `<div class="logo3d ${tamanho} forma-${escapeHtml(logo.shape)}" style="--cor-logo:${escapeHtml(visual.primary)}"><img class="logo3d-imagem" src="${logo.image}" alt="Logo da empresa"></div>`;
    }

    const nomeBase = logo.text.trim() || project.company.name || 'Empresa';
    return `
      <div class="logo3d ${tamanho} forma-${escapeHtml(logo.shape)}" style="--cor-logo:${escapeHtml(visual.primary)}">
        <span class="logo-icone">${escapeHtml(logo.icon)}</span>
        <span class="logo-sigla">${escapeHtml(siglaDoNome(nomeBase))}</span>
      </div>
    `;
  }

  function preencherFormulario() {
    const v = garantirVisual();
    const campos = {
      '#e3dEstilo': v.buildingStyle,
      '#e3dAmbiente': v.environment,
      '#e3dPlaca': v.signMode,
      '#e3dCorPrincipal': v.primary,
      '#e3dCorSecundaria': v.secondary,
      '#e3dCorFachada': v.facade,
      '#e3dRotacao': v.rotation,
      '#e3dLogoIcone': v.logo.icon,
      '#e3dLogoForma': v.logo.shape,
      '#e3dLogoTexto': v.logo.text
    };

    Object.entries(campos).forEach(([selector, valor]) => {
      const el = document.querySelector(selector);
      if (el) el.value = valor;
    });
  }

  function lerFormularioParaProjeto() {
    const v = garantirVisual();

    v.buildingStyle = document.querySelector('#e3dEstilo')?.value || v.buildingStyle;
    v.environment = document.querySelector('#e3dAmbiente')?.value || v.environment;
    v.signMode = document.querySelector('#e3dPlaca')?.value || v.signMode;
    v.primary = document.querySelector('#e3dCorPrincipal')?.value || v.primary;
    v.secondary = document.querySelector('#e3dCorSecundaria')?.value || v.secondary;
    v.facade = document.querySelector('#e3dCorFachada')?.value || v.facade;
    v.rotation = Number(document.querySelector('#e3dRotacao')?.value ?? v.rotation);
    v.logo.icon = document.querySelector('#e3dLogoIcone')?.value || v.logo.icon;
    v.logo.shape = document.querySelector('#e3dLogoForma')?.value || v.logo.shape;
    v.logo.text = document.querySelector('#e3dLogoTexto')?.value.trim() || '';
  }

  function atualizarMaquete() {
    const v = garantirVisual();
    const cena = document.querySelector('#empresa3dCena');
    const predio = document.querySelector('#empresa3dPredio');
    const placa = document.querySelector('#empresa3dPlaca');
    const overlay = document.querySelector('#empresa3dOverlay');
    const previewLogo = document.querySelector('#e3dLogoPreview');

    if (!cena || !predio || !placa || !overlay) return;

    cena.className = `empresa3d-cena ambiente-${v.environment}`;
    cena.style.setProperty('--cor-principal-3d', v.primary);
    cena.style.setProperty('--cor-secundaria-3d', v.secondary);
    cena.style.setProperty('--cor-fachada-3d', v.facade);
    cena.style.setProperty('--rotacao-predio', `${v.rotation}deg`);

    predio.className = `empresa3d-predio-wrap estilo-${v.buildingStyle}`;

    const nome = project.company.name || 'Minha Empresa';
    placa.innerHTML = '';

    if (v.signMode === 'nome-logo' || v.signMode === 'logo') {
      placa.insertAdjacentHTML('beforeend', htmlLogo('pequena'));
    }
    if (v.signMode === 'nome-logo' || v.signMode === 'nome') {
      placa.insertAdjacentHTML('beforeend', `<span class="empresa3d-placa-nome">${escapeHtml(nome)}</span>`);
    }

    if (previewLogo) previewLogo.innerHTML = htmlLogo('grande');

    const total = project.equipment.length;
    const roteadores = project.equipment.filter(e => e.type === 'roteador').length;
    const aps = project.equipment.filter(e => e.type === 'access-point').length;
    const servidores = project.equipment.filter(e => e.type === 'servidor').length;
    const comIp = project.equipment.filter(e => String(e.ip || '').trim()).length;

    document.querySelector('#empresa3dAntena')?.classList.toggle('hidden', aps === 0);
    document.querySelector('#empresa3dServidorBadge')?.classList.toggle('hidden', servidores === 0);

    overlay.innerHTML = `
      <strong>${escapeHtml(nome)}</strong>
      <span>🏢 ${project.departments.length} departamento(s)</span>
      <span>💻 ${total} equipamento(s)</span>
      <span>🌐 ${roteadores} roteador(es)</span>
      <span>🔢 ${comIp}/${total || 0} com IP</span>
    `;

    const titulo = document.querySelector('#e3dTituloPreview');
    if (titulo) titulo.textContent = nome;

    const rotacaoValor = document.querySelector('#e3dRotacaoValor');
    if (rotacaoValor) rotacaoValor.textContent = `${v.rotation}°`;
  }

  function atualizarResumo() {
    const roteadores = project.equipment.filter(e => e.type === 'roteador').length;
    const aps = project.equipment.filter(e => e.type === 'access-point').length;

    const valores = {
      '#e3dStatDepartamentos': project.departments.length,
      '#e3dStatEquipamentos': project.equipment.length,
      '#e3dStatRoteadores': roteadores,
      '#e3dStatAps': aps
    };

    Object.entries(valores).forEach(([selector, valor]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = valor;
    });
  }

  function atualizarDepartamentos() {
    const container = document.querySelector('#empresa3dDepartamentos');
    if (!container) return;

    if (!project.departments.length) {
      container.innerHTML = '<div class="panel"><p>Nenhum departamento criado ainda. Crie os setores da empresa para eles aparecerem aqui.</p></div>';
      return;
    }

    container.innerHTML = project.departments.map(dep => {
      const equipamentos = project.equipment.filter(e => e.departmentId === dep.id);
      const configurados = equipamentos.filter(e => String(e.ip || '').trim()).length;
      const tipos = [...new Set(equipamentos.map(e => typeNames[e.type] || e.type))];

      return `
        <article class="empresa3d-departamento">
          <h4>🏢 ${escapeHtml(dep.name)}</h4>
          <p><strong>${equipamentos.length}</strong> equipamento(s)</p>
          <p>🔢 ${configurados}/${equipamentos.length} com IP cadastrado</p>
          <p>${tipos.length ? escapeHtml(tipos.join(', ')) : 'Nenhum equipamento no setor'}</p>
        </article>
      `;
    }).join('');
  }

  function renderEmpresa3D(sincronizarFormulario = false) {
    garantirVisual();
    if (sincronizarFormulario) preencherFormulario();
    atualizarResumo();
    atualizarMaquete();
    atualizarDepartamentos();
  }

  function redimensionarImagem(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const max = 320;
          const escala = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));

          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL('image/png', 0.9));
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function configurarEventos() {
    const idsPreview = [
      '#e3dEstilo', '#e3dAmbiente', '#e3dPlaca',
      '#e3dCorPrincipal', '#e3dCorSecundaria', '#e3dCorFachada',
      '#e3dRotacao', '#e3dLogoIcone', '#e3dLogoForma', '#e3dLogoTexto'
    ];

    idsPreview.forEach(selector => {
      const el = document.querySelector(selector);
      if (!el) return;

      const evento = el.matches('input[type="text"], input[type="range"], input[type="color"]') ? 'input' : 'change';
      el.addEventListener(evento, () => {
        lerFormularioParaProjeto();
        const v = garantirVisual();
        if (selector.startsWith('#e3dLogo') && selector !== '#e3dLogoUpload') v.logo.mode = 'generated';
        atualizarMaquete();
      });
    });

    document.querySelector('#e3dUsarLogoCriada')?.addEventListener('click', () => {
      lerFormularioParaProjeto();
      const v = garantirVisual();
      v.logo.mode = 'generated';
      v.logo.image = '';
      atualizarMaquete();
    });

    document.querySelector('#e3dLogoUpload')?.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Selecione uma imagem PNG, JPG ou WEBP.');
        event.target.value = '';
        return;
      }

      try {
        const dataUrl = await redimensionarImagem(file);
        const v = garantirVisual();
        v.logo.mode = 'upload';
        v.logo.image = dataUrl;
        atualizarMaquete();
      } catch {
        alert('Não foi possível carregar essa imagem. Tente outra logo.');
      } finally {
        event.target.value = '';
      }
    });

    document.querySelector('#e3dSalvarVisual')?.addEventListener('click', () => {
      lerFormularioParaProjeto();
      addHistory('Configuração', 'A identidade visual e a maquete 3D da empresa foram atualizadas.');
      renderAll();
      alert('Personalização salva no projeto. Agora use “Salvar projeto” no topo para baixar o JSON atualizado.');
    });
  }

  // A nova tela precisa existir antes de o setupNav do app.js procurar os botões.
  injetarEstrutura();

  // Toda vez que o sistema atualizar, a maquete também atualiza.
  const renderAllOriginal = renderAll;
  renderAll = function () {
    renderAllOriginal();
    renderEmpresa3D(true);
  };

  document.addEventListener('DOMContentLoaded', () => {
    garantirVisual();
    configurarEventos();
    renderEmpresa3D(true);
  });
})();
