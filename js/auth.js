/* =========================================================
   AUTENTICAÇÃO DE ALTERAÇÕES - Projeto de Redes

   Este módulo identifica qual aluno concluiu cada alteração do projeto.
   O projeto é estático: os RAs não ficam armazenados em texto puro.
   A validação usa PBKDF2-SHA256 com salt individual.
   ========================================================= */

(() => {
  const alunos = Array.isArray(window.ALUNOS_AUTENTICACAO)
    ? window.ALUNOS_AUTENTICACAO
    : [];

  let modal = null;
  let currentStudent = null;
  let replayingProtectedClick = false;
  let resolverAutenticacao = null;

  function esc(valor) {
    if (typeof escapeHtml === 'function') return escapeHtml(valor);
    return String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function base64ParaBytes(valor) {
    const binario = atob(valor);
    return Uint8Array.from(binario, caractere => caractere.charCodeAt(0));
  }

  function bytesParaBase64(bytes) {
    let binario = '';
    bytes.forEach(byte => {
      binario += String.fromCharCode(byte);
    });
    return btoa(binario);
  }

  async function calcularHashSenha(senha, aluno) {
    if (!window.crypto?.subtle) {
      throw new Error('Este navegador não oferece o recurso de segurança necessário para validar a senha.');
    }

    const chaveBase = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(senha),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: base64ParaBytes(aluno.salt),
        iterations: Number(aluno.iteracoes) || 120000
      },
      chaveBase,
      256
    );

    return bytesParaBase64(new Uint8Array(bits));
  }

  function criarModal() {
    if (document.querySelector('#authAlteracaoModal')) {
      modal = document.querySelector('#authAlteracaoModal');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'authAlteracaoModal';
    modal.className = 'auth-overlay hidden';
    modal.innerHTML = `
      <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitulo">
        <div class="auth-head">
          <div class="auth-icon">🔐</div>
          <div>
            <small>IDENTIFICAÇÃO DA ALTERAÇÃO</small>
            <h2 id="authTitulo">Confirme quem está realizando esta ação</h2>
          </div>
        </div>

        <p id="authAcao" class="auth-action"></p>

        <label class="auth-field">
          <span>Aluno</span>
          <select id="authAluno">
            <option value="">Selecione seu nome...</option>
            ${alunos.map((aluno, indice) =>
              `<option value="${indice}">${esc(aluno.nome)}</option>`
            ).join('')}
          </select>
        </label>

        <label class="auth-field">
          <span>Senha</span>
          <div class="auth-password-wrap">
            <input
              id="authSenha"
              type="password"
              autocomplete="off"
              inputmode="text"
              placeholder="Digite seu RA + dígito"
            />
            <button id="authToggleSenha" class="auth-eye" type="button" title="Mostrar ou ocultar senha" aria-label="Mostrar ou ocultar senha">👁️</button>
          </div>
        </label>

        <div class="auth-hint">
          Sua senha é formada pelo <strong>RA completo + dígito</strong>, sem espaço.
        </div>

        <div id="authErro" class="auth-error hidden" role="alert"></div>

        <div class="auth-actions">
          <button id="authCancelar" class="btn btn-secondary" type="button">Cancelar</button>
          <button id="authConfirmar" class="btn btn-primary" type="button">Confirmar identidade</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#authToggleSenha').addEventListener('click', () => {
      const senha = modal.querySelector('#authSenha');
      const mostrar = senha.type === 'password';
      senha.type = mostrar ? 'text' : 'password';
      modal.querySelector('#authToggleSenha').textContent = mostrar ? '🙈' : '👁️';
      senha.focus();
    });

    modal.querySelector('#authCancelar').addEventListener('click', () => finalizarAutenticacao(null));
    modal.querySelector('#authConfirmar').addEventListener('click', confirmarAutenticacao);

    modal.querySelector('#authSenha').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmarAutenticacao();
      }
    });

    modal.addEventListener('click', event => {
      if (event.target === modal) finalizarAutenticacao(null);
    });
  }

  function hostDoModal() {
    const fullscreen = document.fullscreenElement;
    if (fullscreen) return fullscreen;

    const mapaFallback = document.querySelector('#mapa.map-fullscreen-fallback');
    if (mapaFallback) return mapaFallback;

    return document.body;
  }

  function abrirAutenticacao(acao) {
    criarModal();

    const host = hostDoModal();
    if (modal.parentElement !== host) host.appendChild(modal);

    modal.querySelector('#authAcao').textContent = acao
      ? `Para concluir: ${acao}.`
      : 'Confirme sua identidade para concluir esta alteração.';

    const select = modal.querySelector('#authAluno');
    const senha = modal.querySelector('#authSenha');
    const erro = modal.querySelector('#authErro');

    select.value = '';
    senha.value = '';
    senha.type = 'password';
    modal.querySelector('#authToggleSenha').textContent = '👁️';
    erro.textContent = '';
    erro.classList.add('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => select.focus(), 30);

    return new Promise(resolve => {
      resolverAutenticacao = resolve;
    });
  }

  function finalizarAutenticacao(aluno) {
    if (!modal) return;

    modal.classList.add('hidden');
    const resolver = resolverAutenticacao;
    resolverAutenticacao = null;

    setTimeout(() => {
      if (
        modal &&
        !document.fullscreenElement &&
        !document.querySelector('#mapa.map-fullscreen-fallback') &&
        modal.parentElement !== document.body
      ) {
        document.body.appendChild(modal);
      }
    }, 0);

    if (resolver) resolver(aluno);
  }

  async function confirmarAutenticacao() {
    if (!modal || !resolverAutenticacao) return;

    const select = modal.querySelector('#authAluno');
    const senha = modal.querySelector('#authSenha');
    const erro = modal.querySelector('#authErro');
    const indice = Number(select.value);

    erro.classList.add('hidden');
    erro.textContent = '';

    if (select.value === '' || !Number.isInteger(indice) || !alunos[indice]) {
      erro.textContent = 'Selecione seu nome antes de continuar.';
      erro.classList.remove('hidden');
      select.focus();
      return;
    }

    const senhaDigitada = senha.value.trim().toUpperCase();
    if (!senhaDigitada) {
      erro.textContent = 'Digite sua senha. Lembre-se: RA completo + dígito.';
      erro.classList.remove('hidden');
      senha.focus();
      return;
    }

    try {
      const aluno = alunos[indice];
      const hash = await calcularHashSenha(senhaDigitada, aluno);

      if (hash !== aluno.hash) {
        erro.textContent = 'Senha incorreta. Confira o RA completo + dígito e tente novamente.';
        erro.classList.remove('hidden');
        senha.value = '';
        senha.focus();
        return;
      }

      finalizarAutenticacao({ nome: aluno.nome });
    } catch (error) {
      erro.textContent = error?.message || 'Não foi possível validar a senha neste navegador.';
      erro.classList.remove('hidden');
    }
  }

  function identificarAcaoProtegida(event) {
    const alvo = event.target;
    if (!(alvo instanceof Element)) return null;

    const salvarEmpresa = alvo.closest('#btnSalvarEmpresa');
    if (salvarEmpresa) return { element: salvarEmpresa, action: 'salvar os dados da empresa' };

    const adicionarDepartamento = alvo.closest('#btnAdicionarDepartamento');
    if (adicionarDepartamento) return { element: adicionarDepartamento, action: 'criar um departamento' };

    const excluirDepartamento = alvo.closest('#listaDepartamentos .btn-danger');
    if (excluirDepartamento) return { element: excluirDepartamento, action: 'excluir um departamento' };

    const adicionarEquipamento = alvo.closest('#btnAdicionarEquipamento');
    if (adicionarEquipamento) return { element: adicionarEquipamento, action: 'adicionar um equipamento' };

    const salvarEquipamento = alvo.closest('#btnSalvarEquipamento');
    if (salvarEquipamento) return { element: salvarEquipamento, action: 'salvar as alterações do equipamento' };

    const excluirEquipamento = alvo.closest('#btnExcluirEquipamento');
    if (excluirEquipamento) return { element: excluirEquipamento, action: 'excluir um equipamento' };

    const salvarLGPD = alvo.closest('#btnSalvarCadastroLGPD');
    if (salvarLGPD) {
      return {
        element: salvarLGPD,
        action: salvarLGPD.textContent.includes('Atualizar')
          ? 'atualizar um cadastro da área LGPD'
          : 'salvar um novo cadastro da área LGPD'
      };
    }

    const excluirLGPD = alvo.closest('.lgpd-excluir');
    if (excluirLGPD) return { element: excluirLGPD, action: 'excluir um cadastro da área LGPD' };

    const equipamento = alvo.closest('.equipment');
    if (
      equipamento &&
      typeof connectMode !== 'undefined' &&
      typeof firstConnect !== 'undefined' &&
      connectMode &&
      firstConnect &&
      equipamento.dataset.id !== firstConnect
    ) {
      return { element: equipamento, action: 'criar uma conexão entre equipamentos' };
    }

    return null;
  }

  async function protegerClique(event) {
    if (replayingProtectedClick) return;

    const protegido = identificarAcaoProtegida(event);
    if (!protegido) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const aluno = await abrirAutenticacao(protegido.action);
    if (!aluno) return;

    currentStudent = aluno;
    replayingProtectedClick = true;

    try {
      protegido.element.click();
    } finally {
      replayingProtectedClick = false;
      currentStudent = null;
    }
  }

  function instalarHistoricoComAutor() {
    if (typeof addHistory === 'function') {
      const addHistoryOriginal = addHistory;

      addHistory = function(type, description) {
        if (!currentStudent) {
          return addHistoryOriginal(type, description);
        }

        project.history.unshift({
          id: id('hist'),
          date: today(),
          type,
          description,
          author: currentStudent.nome
        });
      };
    }

    if (typeof renderHistory === 'function') {
      renderHistory = function() {
        const list = document.querySelector('#listaHistorico');
        if (!list) return;

        list.innerHTML = '';

        if (!project.history.length) {
          list.innerHTML = '<div class="panel"><p>Nenhuma alteração automática registrada ainda.</p></div>';
          return;
        }

        project.history.forEach(item => {
          const [year, month, day] = (item.date || today()).split('-');
          const element = document.createElement('article');
          element.className = 'timeline-item';

          const autor = String(item.author || '').trim();
          const autorHtml = autor
            ? ` <span class="history-author">• 👤 ${esc(autor)}</span>`
            : '';

          element.innerHTML = `
            <div class="timeline-meta">
              ${day}/${month}/${year} • ${esc(item.type)}${autorHtml}
            </div>
            <p>${esc(item.description)}</p>
          `;

          list.appendChild(element);
        });
      };

      try {
        renderHistory();
      } catch (_) {}
    }
  }

  function iniciar() {
    criarModal();
    instalarHistoricoComAutor();
    document.addEventListener('click', protegerClique, true);
  }

  iniciar();
})();
