/* =========================================================
   APRESENTAÇÃO DO PROJETO — MODELO BASE NO CANVA
   - Exibe uma prévia do modelo oficial
   - Direciona os alunos ao Canva para editar
   - Organiza as orientações página por página
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
      tips: [
        'Apresente a matéria de Redes de Computadores e façam a abertura do tema dizendo o que o grupo está fazendo ali e o que será apresentado.',
        'Apresente a cara da empresa e se apresentem informando o nome de cada integrante.'
      ]
    },
    {
      number: '02',
      icon: '🏢',
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
      tips: [
        'Apresente todos os equipamentos de forma geral com suas devidas quantidades e explique o que é cada equipamento e sua função na empresa.',
        'Informe quantos andares a empresa possui e como os equipamentos estão distribuídos em cada andar.'
      ]
    },
    {
      number: '04',
      icon: '🌐',
      tips: [
        'Liste alguns equipamentos com seus IPs e MACs.',
        'Escolha alguns equipamentos, mostre seus IPs e MACs e explique o que é cada identificação.'
      ]
    },
    {
      number: '05',
      icon: '🗺️',
      tips: [
        'Coloque um print do Mapa da Rede que está no Projeto de Redes.',
        'Explique a organização das conexões utilizada naquele andar e como ela ajuda na distribuição dos equipamentos.'
      ]
    },
    {
      number: '06',
      icon: '🗺️',
      tips: [
        'Coloque um print do Mapa da Rede que está no Projeto de Redes.',
        'Explique a organização das conexões utilizada naquele andar e como ela ajuda na distribuição dos equipamentos.'
      ]
    },
    {
      number: '07',
      icon: '🔗',
      tips: [
        'Explique o que é uma topologia e qual topologia serviu de inspiração para a criação do Mapa da Rede.',
        'Dê o exemplo utilizando uma imagem da topologia escolhida.'
      ]
    },
    {
      number: 'FINAL',
      icon: '✅',
      tips: [
        'Diga o que o grupo aprendeu durante todo o curso técnico de Redes.',
        'Faça os agradecimentos que acharem necessários aos professores.'
      ]
    }
  ];

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function renderPageCards() {
    return pages.map((page, index) => `
      <article class="presentation-guide-card">
        <div class="presentation-guide-number">
          <span>${page.icon}</span>
          <strong>${page.number === 'FINAL' ? 'FINAL' : 'PÁGINA ' + page.number}</strong>
        </div>

        <div class="presentation-guide-content">
          <div class="presentation-guide-title">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <h3>${page.number === 'FINAL' ? 'Encerramento' : 'Orientações para esta página'}</h3>
          </div>

          <ul>
            ${page.tips.map(tip => `<li>${esc(tip)}</li>`).join('')}
          </ul>
        </div>
      </article>
    `).join('');
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
        <a
          class="btn btn-primary presentation-open-canva"
          href="${MODEL_LINK}"
          target="_blank"
          rel="noopener noreferrer"
        >
          🎨 Abrir modelo no Canva
        </a>
      </div>

      <section class="presentation-model-section">
        <div class="presentation-section-head">
          <div>
            <small>MODELO BASE</small>
            <h3>Pré-visualização da apresentação</h3>
            <p>Veja o modelo dentro do projeto e abra no Canva quando quiser editar.</p>
          </div>
        </div>

        <div class="presentation-preview-shell">
          <iframe
            class="presentation-preview"
            src="${EMBED_LINK}"
            title="Pré-visualização do modelo de apresentação no Canva"
            loading="lazy"
            allowfullscreen
            allow="fullscreen"
          ></iframe>

          <div class="presentation-preview-footer">
            <span>Se a prévia não carregar neste computador, use o botão ao lado.</span>
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
      </section>

      <section class="presentation-general-tips">
        <div class="presentation-section-head">
          <div>
            <small>DICA GERAL</small>
            <h3>Antes de montar a apresentação</h3>
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

      <section class="presentation-pages-guide">
        <div class="presentation-section-head">
          <div>
            <small>GUIA PÁGINA POR PÁGINA</small>
            <h3>O que deve aparecer em cada parte</h3>
            <p>Use as dicas como orientação. O grupo pode adaptar textos, imagens e organização visual.</p>
          </div>
        </div>

        <div class="presentation-guide-list">
          ${renderPageCards()}
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
