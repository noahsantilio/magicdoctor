/**
 * MAGIC DOCTOR v8.7 PLATINUM - PARTE 1
 * Motor de Diagnóstico, Combos e Identidade
 */

let myChart = null;

// 1. Banco de Dados de Combos (Corrigindo a 3ª Coluna)
const COMBO_DATABASE = [
    { name: "Heliod + Ballista", cards: ["Heliod, Sun-Crowned", "Walking Ballista"], desc: "Dano Infinito" },
    { name: "Thassa + Oracle", cards: ["Thassa's Oracle", "Demonic Consultation", "Tainted Pact"], desc: "Vitória Instantânea" },
    { name: "Exquisite + Sanguine", cards: ["Exquisite Blood", "Sanguine Bond"], desc: "Dreno Infinito" },
    { name: "Kiki + Jiki Combo", cards: ["Kiki-Jiki, Mirror Breaker", "Pestermite", "Deceiver Exarch", "Village Bell-Ringer"], desc: "Criaturas Infinitas" },
    { name: "Dramatic Scepter", cards: ["Isochron Scepter", "Dramatic Reversal"], desc: "Mana Infinita" },
    { name: "Mikaeus + Triskelion", cards: ["Mikaeus, the Unhallowed", "Triskelion"], desc: "Dano Infinito" }
];

// 2. Banco de Arquétipos e Riscos (Corrigindo Bloco de Identidade)
const ARQUETIPOS = {
    "VOLTRON": { desc: "Foca em fortalecer uma única criatura para vitória via dano de precisão.", risco: "Remoções pontuais, Efeitos de Sacrifício e 'Freeze'.", complexity: "Baixa" },
    "ARISTOCRATS": { desc: "Ganha valor sacrificando suas criaturas e drenando a vida alheia.", risco: "Exílio de Cemitério e efeitos de 'Hushbringer'.", complexity: "Média" },
    "STAX": { desc: "Impede os oponentes de jogarem cartas ou usarem recursos.", risco: "Decks Aggro rápidos e remoções de artefatos/encantos.", complexity: "Alta" },
    "COMBO": { desc: "Busca peças específicas para encerrar o jogo em um único turno explosivo.", risco: "Counterspells e Descarte de mão.", complexity: "Extrema" },
    "CONTROL": { desc: "Gerencia as ameaças do jogo até dominar a mesa com recursos superiores.", risco: "Decks 'Go-Wide' e fontes de dano inabaláveis.", complexity: "Alta" }
};

const NOMES_CORES = {
    "Branco, Azul": "Azorius", "Azul, Preto": "Dimir", "Preto, Vermelho": "Rakdos", "Vermelho, Verde": "Gruul", "Verde, Branco": "Selesnya",
    "Branco, Preto": "Orzhov", "Preto, Verde": "Golgari", "Verde, Azul": "Simic", "Azul, Vermelho": "Izzet", "Vermelho, Branco": "Boros",
    "Branco, Azul, Preto": "Esper", "Azul, Preto, Vermelho": "Grixis", "Preto, Vermelho, Verde": "Jund", "Vermelho, Verde, Branco": "Naya", "Verde, Branco, Azul": "Bant",
    "Branco, Preto, Verde": "Abzan", "Azul, Vermelho, Branco": "Jeskai", "Preto, Verde, Azul": "Sultai", "Vermelho, Branco, Preto": "Mardu", "Verde, Azul, Vermelho": "Temur",
    "Branco, Azul, Preto, Vermelho, Verde": "WUBRG"
};

const VETORES_GATILHOS = [
    { id: "COMBATE", label: "Combate", terms: ["trample", "haste", "double strike", "annihilator", "creatures you control get +"] },
    { id: "DRENO", label: "Dreno/Burn", terms: ["each opponent loses", "damage to each opponent", "drain", "whenever a creature dies"] },
    { id: "CONTROLE", label: "Controle/Stax", terms: ["cannot cast", "skip", "opponents can't", "tax", "costs more to cast"] },
    { id: "COMBO", label: "Combo/Alt", terms: ["win the game", "infinite", "tutor", "search your library"] }
];

const ALTO_IMPACTO_TERMS = ["whenever an opponent casts", "whenever you draw", "double", "each time", "all spells", "no more than one", "extra turn"];

function limparNome(linha) {
    if (!linha) return "";
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    if (n.includes("//")) n = n.split("//")[0];
    return n.trim();
}
/**
 * MAGIC DOCTOR v8.7 PLATINUM - PARTE 2
 * Motor de Busca e Coleta de Dados
 */

async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const deckText = document.getElementById('decklist').value;
    const linhas = deckText.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { 
        alert("O Doutor precisa de uma lista para trabalhar!"); 
        return; 
    }

    loading.classList.remove('hidden');
    resultados.classList.add('hidden');

    // Inicialização do Estado da Análise
    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        curve: [0,0,0,0,0,0,0], 
        commander: "", 
        colors: "", 
        inventory: {},
        wincons_map: { COMBATE: [], DRENO: [], CONTROLE: [], COMBO: [] },
        high_impact: [], 
        all_card_names: [], 
        combos_found: []
    };

    // Loop de Processamento de Cartas
    for (let i = 0; i < linhas.length; i++) {
        const nomeParaBusca = limparNome(linhas[i]);
        if (!nomeParaBusca) continue;
        
        document.getElementById('loading-text').innerText = `Diagnosticando: ${nomeParaBusca}...`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            if (!res.ok) continue;
            const data = await res.json();
            
            const oracle = (data.oracle_text || "").toLowerCase();
            const tLine = data.type_line.toLowerCase();
            const name = data.name;
            stats.all_card_names.push(name);

            // Identificação de Comandante (Ignora terrenos com nome de lenda)
            if (!stats.commander && tLine.includes("legendary") && !tLine.includes("land")) {
                stats.commander = name;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.map(c => cMap[c]).join(', ') || "Incolor";
            }

            // Mapeamento de Vetores (⚔️ vs ⚙️)
            VETORES_GATILHOS.forEach(v => {
                if (v.terms.some(t => oracle.includes(t))) {
                    const isFinisher = oracle.includes("win the game") || oracle.includes("+x/+x") || oracle.includes("extra turn") || oracle.includes("annihilator");
                    stats.wincons_map[v.id].push({ name: name, role: isFinisher ? 'finisher' : 'enabler' });
                }
            });

            // Detecção de Peças de Alto Impacto
            if (ALTO_IMPACTO_TERMS.some(t => oracle.includes(t)) && !tLine.includes("land")) {
                stats.high_impact.push(name);
            }

            // Estatísticas de Curva e CMC
            if (!tLine.includes("land")) {
                let v = data.cmc || 0;
                stats.cmc += v; 
                stats.count++;
                stats.curve[Math.min(Math.floor(v), 6)]++;
            }

            // Categorização de Funções
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile")) stats.removal++;

            // Organização do Inventário
            let cat = tLine.includes("creature") ? "Criaturas" : 
                      tLine.includes("land") ? "Terrenos" : 
                      tLine.includes("artifact") ? "Artefatos" : 
                      tLine.includes("enchantment") ? "Encantamentos" : "Mágicas";
            
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(name);

            // Throttling para respeitar a API
            await new Promise(r => setTimeout(r, 65));

        } catch (e) { 
            console.error("Erro na leitura de:", nomeParaBusca); 
        }
    }

/**
 * MAGIC DOCTOR v8.7 PLATINUM - PARTE 3
 * Lógica de Combos, Arquétipos e Matriz de Risco
 */

    // --- DETECÇÃO DE COMBOS ---
    // Cruza a lista de nomes coletados com o banco de dados de combos
    COMBO_DATABASE.forEach(combo => {
        const matches = combo.cards.filter(cardName => 
            stats.all_card_names.some(detected => detected.includes(cardName))
        );
        // Se o deck tem pelo menos 2 peças de um combo, ele é registrado
        if (matches.length >= 2) {
            stats.combos_found.push({
                name: combo.name,
                pieces: matches.join(" + "),
                desc: combo.desc
            });
        }
    });

    // --- DEFINIÇÃO DE ARQUÉTIPO E ESTRATÉGIA ---
    let arquetipoFinal = "MIDRANGE"; // Padrão
    
    // Heurística de decisão
    if (stats.combos_found.length > 0) {
        arquetipoFinal = "COMBO";
    } else if (stats.wincons_map.CONTROLE.length > 8) {
        arquetipoFinal = "STAX";
    } else if (stats.inventory["Encantamentos"]?.length > 15 || stats.inventory["Artefatos"]?.length > 20) {
        arquetipoFinal = "VOLTRON";
    } else if (stats.wincons_map.DRENO.length > 5 && stats.inventory["Criaturas"]?.length > 25) {
        arquetipoFinal = "ARISTOCRATS";
    } else if (stats.cmc / stats.count > 3.5) {
        arquetipoFinal = "STOMPY";
    }

    // Coleta os dados do arquétipo selecionado
    const stratData = ARQUETIPOS[arquetipoFinal] || { 
        desc: "Equilíbrio entre recursos e ameaças de custo médio.", 
        risco: "Decks extremamente focados (muito rápidos ou muito lentos).",
        complexity: "Média"
    };

    // --- CÁLCULO DE POWER LEVEL ---
    // Base 3.0 + bônus por eficiência
    let powerBase = 3.0;
    powerBase += (stats.ramp * 0.12);
    powerBase += (stats.draw * 0.1);
    powerBase += (stats.combos_found.length * 0.5); // Combos pesam muito no Power Level
    powerBase += (stats.high_impact.length * 0.15);
    
    const finalPower = Math.min(powerBase, 10).toFixed(1);

    // --- PREPARAÇÃO PARA RENDERIZAÇÃO ---
    // Encaminha os dados processados para a função visual
    renderizarPlatinum(stats, arquetipoFinal, stratData, finalPower);
    loading.classList.add('hidden');
}

/**
 * Função de Renderização Visual
 * Preenche o HTML v8.7 com os dados calculados
 */
function renderizarPlatinum(stats, arquetipo, strat, power) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // Injeção no Bloco 1: Identidade
    document.getElementById('res-arquetipo').innerText = arquetipo;
    document.getElementById('res-arquetipo-desc').innerText = strat.desc;
    document.getElementById('res-risco').innerText = strat.risco;
    
    const compBadge = document.getElementById('res-complexity');
    compBadge.innerText = strat.complexity;
    // Cores dinâmicas para complexidade
    compBadge.className = "complexity-badge " + 
        (strat.complexity === "Baixa" ? "diff-baixa" : 
         strat.complexity === "Média" ? "diff-media" : 
         strat.complexity === "Alta" ? "diff-alta" : "diff-extrema");

    document.getElementById('res-color-name').innerText = NOMES_CORES[stats.colors] || "Custom";
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-commander').innerText = stats.commander || "Não detectado";

/**
 * MAGIC DOCTOR v8.7 PLATINUM - PARTE 4
 * Renderização de Relatório, Combos e Inventário Final
 */

    // --- BLOCO 2: RELATÓRIO TÁTICO E VETORES ---
    const vectorCont = document.getElementById('res-win-vectors');
    const listWin = document.getElementById('res-wincons-list');
    vectorCont.innerHTML = ""; listWin.innerHTML = "";

    // Preenche Vetores e Wincons (⚔️ Finisher / ⚙️ Enabler)
    Object.keys(stats.wincons_map).forEach(key => {
        const cards = stats.wincons_map[key];
        if (cards.length > 0) {
            const label = VETORES_GATILHOS.find(g => g.id === key).label;
            vectorCont.innerHTML += `<span class="vector-badge">${label}</span>`;
            
            cards.slice(0, 5).forEach(c => {
                const icon = c.role === 'finisher' ? '<span class="icon-finisher">⚔️</span>' : '<span class="icon-enabler">⚙️</span>';
                listWin.innerHTML += `<li>${icon} ${c.name}</li>`;
            });
        }
    });

    // Peças de Alto Impacto (Must Answer)
    const highCont = document.getElementById('res-high-impact');
    highCont.innerHTML = stats.high_impact.length > 0 
        ? stats.high_impact.slice(0, 7).map(n => `<li>⭐ ${n}</li>`).join('')
        : "<li>Nenhuma peça crítica identificada.</li>";

    // --- COLUNA 3: VELOCIDADE E COMBOS (CORREÇÃO CRÍTICA) ---
    const avgCMC = stats.count > 0 ? (stats.cmc / stats.count) : 0;
    const tempoTag = document.getElementById('res-tempo-tag');
    
    if (avgCMC < 2.6 || stats.ramp > 14) { 
        tempoTag.innerText = "Early Game"; tempoTag.className = "tempo-tag tempo-early"; 
    } else if (avgCMC > 3.7) { 
        tempoTag.innerText = "Late Game"; tempoTag.className = "tempo-tag tempo-late"; 
    } else { 
        tempoTag.innerText = "Mid Game"; tempoTag.className = "tempo-tag tempo-mid"; 
    }

    const comboList = document.getElementById('res-combos-list');
    if (stats.combos_found.length > 0) {
        comboList.innerHTML = stats.combos_found.map(c => 
            `<li title="${c.pieces}">🧩 <strong>${c.name}</strong><br><small style="font-size:0.6rem; color:var(--accent)">${c.desc}</small></li>`
        ).join('');
    } else {
        comboList.innerHTML = "<li>Nenhum combo conhecido detectado.</li>";
    }

    // --- BLOCO 4: PERFORMANCE ---
    document.getElementById('res-cmc').innerText = avgCMC.toFixed(2);
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-power').innerText = power;

    // Gráfico de Curva de Mana
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: ['0','1','2','3','4','5','6+'], 
            datasets: [{ 
                label: 'Cartas', 
                data: stats.curve, 
                backgroundColor: '#818cf8',
                borderRadius: 4
            }] 
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // --- BLOCO 5: INVENTÁRIO POR TIPO ---
    const invCont = document.getElementById('tipo-columns-container');
    invCont.innerHTML = "";
    
    // Ordena as categorias e renderiza as colunas
    Object.keys(stats.inventory).sort().forEach(cat => {
        const totalCat = stats.inventory[cat].length;
        invCont.innerHTML += `
            <div class="type-column">
                <h3>${cat} (${totalCat})</h3>
                <ul>${stats.inventory[cat].sort().map(n => `<li>${n}</li>`).join('')}</ul>
            </div>`;
    });
}

/**
 * Funções de Controle de Interface
 */
function limparTudo() {
    if(confirm("Deseja limpar o diagnóstico atual?")) {
        location.reload();
    }
}

// Contador de cartas em tempo real no campo de texto
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => {
        const match = l.match(/^(\d+)/);
        total += match ? parseInt(match[1]) : 1;
    });
    document.getElementById('card-count').innerText = total;
});
