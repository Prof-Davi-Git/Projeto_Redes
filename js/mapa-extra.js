(() => {
  let usandoFallback = false;
  let arrastandoFundo = false;
  let inicioX = 0;
  let inicioY = 0;
  let scrollInicialX = 0;
  let scrollInicialY = 0;

  function atualizarBotaoTelaCheia() {
    const botao = document.querySelector('#btnMapaTelaCheia');
    const mapa = document.querySelector('#mapa');
    if (!botao || !mapa) return;

    const ativo = document.fullscreenElement === mapa || mapa.classList.contains('map-fullscreen-fallback');
    botao.textContent = ativo ? '↙ Sair da tela cheia' : '⛶ Tela cheia';
    botao.title = ativo ? 'Sair da tela cheia' : 'Abrir o mapa em tela cheia';
  }

  function atualizarMapaDepoisDaTelaCheia() {
    setTimeout(() => {
      if (typeof updateMapGeometry === 'function') updateMapGeometry();
      if (typeof drawConnections === 'function') drawConnections();
    }, 80);
  }

  function prepararModalNoMapa() {
    const mapa = document.querySelector('#mapa');
    const modal = document.querySelector('#modalEquipamento');
    if (!mapa || !modal || modal.parentElement === mapa) return;

    // O Fullscreen API exibe apenas os elementos que estão dentro do elemento
    // colocado em tela cheia. Mantendo o modal dentro do mapa, a edição por
    // dois cliques continua visível e funcional também no modo fullscreen.
    mapa.appendChild(modal);
  }

  async function alternarTelaCheia() {
    const mapa = document.querySelector('#mapa');
    if (!mapa) return;

    prepararModalNoMapa();

    const estaNativo = document.fullscreenElement === mapa;
    const estaFallback = mapa.classList.contains('map-fullscreen-fallback');

    if (estaNativo) {
      await document.exitFullscreen();
      return;
    }

    if (estaFallback) {
      mapa.classList.remove('map-fullscreen-fallback');
      document.body.classList.remove('map-fullscreen-body');
      usandoFallback = false;
      atualizarBotaoTelaCheia();
      atualizarMapaDepoisDaTelaCheia();
      return;
    }

    if (mapa.requestFullscreen) {
      try {
        await mapa.requestFullscreen();
        return;
      } catch (erro) {
        console.warn('Fullscreen nativo indisponivel. Usando modo alternativo.', erro);
      }
    }

    usandoFallback = true;
    mapa.classList.add('map-fullscreen-fallback');
    document.body.classList.add('map-fullscreen-body');
    atualizarBotaoTelaCheia();
    atualizarMapaDepoisDaTelaCheia();
  }

  function iniciarArrasteDoFundo(event) {
    const canvas = document.querySelector('#networkCanvas');
    if (!canvas) return;

    if (event.button !== 0) return;
    if (event.target.closest('.equipment')) return;
    if (event.target.closest('button, input, select, textarea, label')) return;
    if (typeof connectMode !== 'undefined' && connectMode) return;

    arrastandoFundo = true;
    inicioX = event.clientX;
    inicioY = event.clientY;
    scrollInicialX = canvas.scrollLeft;
    scrollInicialY = canvas.scrollTop;

    canvas.classList.add('is-panning');
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moverFundo(event) {
    if (!arrastandoFundo) return;

    const canvas = document.querySelector('#networkCanvas');
    if (!canvas) return;

    const deslocamentoX = event.clientX - inicioX;
    const deslocamentoY = event.clientY - inicioY;

    canvas.scrollLeft = scrollInicialX - deslocamentoX;
    canvas.scrollTop = scrollInicialY - deslocamentoY;
  }

  function finalizarArrasteDoFundo(event) {
    if (!arrastandoFundo) return;

    const canvas = document.querySelector('#networkCanvas');
    arrastandoFundo = false;

    if (canvas) {
      canvas.classList.remove('is-panning');
      try {
        if (event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch (_) {}
    }
  }

  function prepararTelaCheia() {
    const toolbar = document.querySelector('#mapa .toolbar');
    if (!toolbar || document.querySelector('#btnMapaTelaCheia')) return;

    const botao = document.createElement('button');
    botao.id = 'btnMapaTelaCheia';
    botao.type = 'button';
    botao.className = 'btn btn-secondary map-fullscreen-btn';
    botao.textContent = '⛶ Tela cheia';
    botao.title = 'Abrir o mapa em tela cheia';
    botao.addEventListener('click', alternarTelaCheia);

    const controlesZoom = toolbar.querySelector('.map-zoom-controls');
    if (controlesZoom) toolbar.insertBefore(botao, controlesZoom);
    else toolbar.appendChild(botao);
  }

  function prepararArrasteDoFundo() {
    const canvas = document.querySelector('#networkCanvas');
    if (!canvas) return;

    canvas.addEventListener('pointerdown', iniciarArrasteDoFundo);
    canvas.addEventListener('pointermove', moverFundo);
    canvas.addEventListener('pointerup', finalizarArrasteDoFundo);
    canvas.addEventListener('pointercancel', finalizarArrasteDoFundo);
    canvas.addEventListener('lostpointercapture', () => {
      if (arrastandoFundo) {
        arrastandoFundo = false;
        canvas.classList.remove('is-panning');
      }
    });
  }

  document.addEventListener('fullscreenchange', () => {
    atualizarBotaoTelaCheia();
    atualizarMapaDepoisDaTelaCheia();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !usandoFallback) return;
    const mapa = document.querySelector('#mapa');
    if (!mapa) return;

    mapa.classList.remove('map-fullscreen-fallback');
    document.body.classList.remove('map-fullscreen-body');
    usandoFallback = false;
    atualizarBotaoTelaCheia();
    atualizarMapaDepoisDaTelaCheia();
  });

  document.addEventListener('DOMContentLoaded', () => {
    prepararModalNoMapa();
    prepararTelaCheia();
    prepararArrasteDoFundo();

    const status = document.querySelector('#statusConexao');
    if (status && !status.textContent.includes('fundo quadriculado')) {
      status.textContent = 'Arraste os equipamentos para organizar a rede. Arraste o fundo quadriculado para navegar. Perto das bordas, o mapa aumenta automaticamente. Dê dois cliques para editar.';
    }
  });
})();

/* =========================================================
   CARREGAMENTO DA AUTENTICAÇÃO DE ALTERAÇÕES
   Mantido separado do núcleo do mapa para preservar o projeto existente.
   O parâmetro de versão evita que o GitHub Pages reutilize arquivos antigos
   armazenados no cache do navegador.
   ========================================================= */
(() => {
  const AUTH_VERSION = '20260830-salvamento-em-lote';

  function carregarEstilo() {
    if (document.querySelector('link[data-auth-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `css/auth.css?v=${AUTH_VERSION}`;
    link.dataset.authStyle = '1';
    document.head.appendChild(link);
  }

  function carregarAuth() {
    if (document.querySelector('script[data-auth-module]')) return;
    const script = document.createElement('script');
    script.src = `js/auth.js?v=${AUTH_VERSION}`;
    script.dataset.authModule = '1';
    document.head.appendChild(script);
  }

  function carregarAlunos() {
    if (window.ALUNOS_AUTENTICACAO) {
      carregarAuth();
      return;
    }

    if (document.querySelector('script[data-alunos-auth]')) return;
    const script = document.createElement('script');
    script.src = `js/alunos.js?v=${AUTH_VERSION}`;
    script.dataset.alunosAuth = '1';
    script.addEventListener('load', carregarAuth, { once: true });
    document.head.appendChild(script);
  }

  carregarEstilo();
  carregarAlunos();
})();
