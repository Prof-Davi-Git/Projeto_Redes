/* =========================================================
   APRESENTAÇÃO DO PROJETO — MODELO BASE NO CANVA
   - Dicas gerais no topo
   - Pré-visualização e orientações lado a lado
   - Navegação sincronizada por página
   ========================================================= */

(() => {
  const MODEL_LINK = 'https://canva.link/88o7ryiqgs6r1i3';
  const EMBED_LINK = 'https://www.canva.com/design/DAHaRRbAVnI/view?embed';

  const generalTips = [
    'Insira sempre ícones e imagens para que as páginas fiquem visualmente mais bonitas e fáceis de entender.',
    'Não é obrigatório usar os slides do modelo. Cada grupo está livre para criar sua própria apresentação, mas o slide base deve ser usado como guia junto das dicas.',
    'Cada integrante pode fazer a apresentação com a ajuda do celular para leitura das falas.',
    'Foquem em olhar para o público e usem o celular apenas como guia.'
  ];

  const pages = [
    {
      number: '01',
      icon: '🎤',
      title: 'Abertura e apresentação',
      tips: [
        'Apresente a matéria de Redes de Computadores e façam a abertura do tema dizendo o que o grupo está fazendo ali e o que será apresentado.',
        'Apresente a cara da empresa e se apresentem informando o nome de cada integrante.'
      ]
    },
    {
      number: '02',
      icon: '🏢',
      title: 'Apresentação da empresa',
      tips: [
        'Apresente a empresa de forma geral.',
        'Coloque todos os departamentos que a compõem.',
        'Informe quantos funcionários existem.',
        'Apresente o produto que a empresa vende ou o serviço que oferece.'
      ]
    },
    {
      number: '03',
      icon: '🖥️',
      title: 'Equipamentos e estrutura',
      tips: [
        'Apresente todos os equipamentos de forma geral com suas devidas quantidades e explique o que é cada equipamento e sua função na empresa.',
        'Informe quantos andares a empresa possui e como os equipamentos estão distribuídos em cada andar.'
      ]
    },
    {
      number: '04',
      icon: '🌐',
      title: 'IPs e endereços MAC',
      tips: [
        'Liste alguns equipamentos com seus IPs e MACs.',
        'Escolha alguns equipamentos, mostre seus IPs e MACs e explique o que é cada identificação.'
      ]
    },
    {
      number: '05',
      icon: '🗺️',
      title: 'Mapa da Rede — andar 1',
      tips: [
        'Coloque um print do Mapa da Rede que está no Projeto de Redes.',
        'Explique a organização das conexões utilizada naquele andar e como ela ajuda na distribuição dos equipamentos.'
      ]
    },
    {
      number: '06',
      icon: '🗺️',
      title: 'Mapa da Rede — andar 2',
      tips: [
        'Coloque um print do Mapa da Rede que está no Projeto de Redes.',
        'Explique a organização das conexões utilizada naquele andar e como ela ajuda na distribuição dos equipamentos.'
      ]
    },
    {
      number: '07',
      icon: '🔗',
      title: 'Topologia da rede',
      tips: [
        'Explique o que é uma topologia e qual topologia serviu de inspiração para a criação do Mapa da Rede.',
        'Dê o exemplo utilizando uma imagem da topologia escolhida.'
      ]
    },
    {
      number: 'FINAL',
      icon: '✅',
      title: 'Encerramento',
      tips: [
        'Diga o que o grupo aprendeu durante todo o curso técnico de Redes.',
        'Faça os agradecimentos que acharem necessários aos professores.'
      ]
    }
  ];

  let currentPageIndex = 0;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function embedPageUrl(index) {
    const page = Math.max(1, Math.min(pages.length, index + 1));
    return `${EMBED_LINK}&page=${page}#${page}`;
  }

  function renderCurrentTips() {
    const box = document.querySelector('#presentationCurrentTips');
    const page = pages[currentPageIndex];
    if (!box || !page) return;

    box.innerHTML = `
      <div class="presentation-current-badge">
        <span>${page.icon}</span>
        <div>
          <small>${page.number === 'FINAL' ? 'PÁGINA FINAL' : 'PÁGINA ' + page.number}</small>
          <strong>${esc(page.title)}</strong>
        </div>
      </div>

      <div class="presentation-current-copy">
        <h3>O que colocar nesta página</h3>
        <ul>
          ${page.tips.map(tip => `<li>${esc(tip)}</li>`).join('')}
        </ul>
      </div>
    `;

    const counter = document.querySelector('#presentationPageCounter');
    if (counter) counter.textContent = `${currentPageIndex + 1} / ${pages.length}`;

    const prev = document.querySelector('#presentationPrevPage');
    const next = document.querySelector('#presentationNextPage');
    if (prev) prev.disabled = currentPageIndex === 0;
    if (next) next.disabled = currentPageIndex === pages.length - 1;
  }

  function goToPage(index, updatePreview = true) {
    const nextIndex = Math.max(0, Math.min(pages.length - 1, Number(index) || 0));
    if (nextIndex === currentPageIndex && !updatePreview) return;

    currentPageIndex = nextIndex;

    if (updatePreview) {
      const iframe = document.querySelector('#presentationCanvaPreview');
      if (iframe) iframe.src = embedPageUrl(currentPageIndex);
    }

    renderCurrentTips();
  }

  function render() {
    const screen = document.querySelector('#apresentacao');
    if (!screen) return;

    screen.innerHTML = `
      <div class="section-title presentation-page-title">
        <div>
          <p class="eyebrow">APRESENTAÇÃO DO PROJETO</p>
          <h2>Modelo Base e Orientações</h2>
        </div>
      </div>

      <section class="presentation-general-tips">
        <div class="presentation-section-head">
          <div>
            <small>DICAS GERAIS</small>
            <h3>Antes de montar e apresentar os slides</h3>
          </div>
        </div>

        <div class="presentation-tip-grid">
          ${generalTips.map((tip, index) => `
            <article class="presentation-tip-card">
              <span>${index + 1}</span>
              <p>${esc(tip)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="presentation-model-section">
        <div class="presentation-section-head">
          <div>
            <small>MODELO BASE + ORIENTAÇÃO</small>
            <h3>Acompanhe o modelo e veja o que colocar em cada página</h3>
            <p>Use o controlador abaixo da pré-visualização para avançar. O slide e as dicas ao lado mudam juntos.</p>
          </div>
        </div>

        <div class="presentation-workspace">
          <div class="presentation-preview-shell">
            <div class="presentation-preview-frame">
              <iframe
                id="presentationCanvaPreview"
                class="presentation-preview"
                src="${embedPageUrl(currentPageIndex)}"
                title="Pré-visualização do modelo de apresentação no Canva"
                loading="lazy"
              tabindex="-1"
              aria-hidden="true"
            ></iframe>
            </div>

            <div class="presentation-preview-nav-bar" aria-label="Navegação do modelo">
              <button id="presentationPrevPage" class="presentation-preview-arrow" type="button" aria-label="Página anterior">←</button>
              <span id="presentationPageCounter">1 / ${pages.length}</span>
              <button id="presentationNextPage" class="presentation-preview-arrow" type="button" aria-label="Próxima página">→</button>
            </div>

            <div class="presentation-preview-footer">
              <span>Use o modelo como base ou crie sua própria versão.</span>
              <a
                class="btn btn-secondary"
                href="${MODEL_LINK}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no Canva ↗
              </a>
            </div>
          </div>

          <aside id="presentationCurrentTips" class="presentation-current-tips"></aside>
        </div>
      </section>

      <section class="presentation-final-note">
        <span>💡</span>
        <div>
          <strong>O slide é um apoio, não um roteiro para ser lido.</strong>
          <p>Durante a apresentação, procurem olhar para o público e usem o celular somente para consultar as falas quando necessário.</p>
        </div>
      </section>
    `;

    document.querySelector('#presentationPrevPage')?.addEventListener('click', () => {
      goToPage(currentPageIndex - 1);
    });

    document.querySelector('#presentationNextPage')?.addEventListener('click', () => {
      goToPage(currentPageIndex + 1);
    });

    renderCurrentTips();
  }

  function bindNav() {
    const button = document.querySelector('[data-target="apresentacao"]');
    if (!button || button.dataset.presentationGuideBound === '1') return;

    button.dataset.presentationGuideBound = '1';
    button.addEventListener('click', () => setTimeout(render, 0));
  }

  function start() {
    render();
    bindNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
