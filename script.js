/**
 * MAGIC DOCTOR v8.8.1 PLATINUM
 * BLOCO 1: CONFIGURAÇÕES, MONITOR DE UI E MOTOR DE BUSCA
 */

let myChart = null;

// Banco de dados para detecção de sinergias e combos
const COMBO_DATABASE = [
    { name: "Heliod + Ballista", cards: ["Heliod, Sun-Crowned", "Walking Ballista"], desc: "Dano Infinito" },
    { name: "Thassa + Oracle", cards: ["Thassa's Oracle", "Demonic Consultation", "Tainted Pact"], desc: "Vitória Instantânea" },
    { name: "Exquisite + Sanguine", cards: ["Exquisite Blood", "Sanguine Bond"], desc: "Dreno Infinito" },
    { name: "Kiki-Jiki Combo", cards: ["Kiki-Jiki", "Pestermite", "Deceiver Exarch", "Village Bell-Ringer"], desc: "Criaturas Infinitas" },
    { name: "Dramatic Scepter", cards: ["Isochron Scepter", "Dramatic Reversal"], desc: "Mana Infinita" }
];

const ARQUETIPOS = {
    "VOLTRON": { desc: "Foca em fortalecer uma única criatura para vitória via dano de precisão.", risco: "Remoções pontuais e efeitos de sacrifício.", complexity: "Baixa" },
    "ARISTOCRATS": { desc: "Ganha valor sacrificando suas criaturas e drenando os oponentes.", risco: "Exílio de cemitério e efeitos de silêncio.", complexity: "Média" },
    "STAX": { desc: "Controla o jogo impedindo que os oponentes usem recursos básicos.", risco: "Decks rápidos e remoções de artefatos.", complexity: "Alta" },
    "COMBO": { desc: "Busca peças específicas para encerrar o jogo instantaneamente.", risco: "Counterspells e descarte de mão.", complexity: "Extrema" },
    "MIDRANGE": { desc: "Equilíbrio entre recursos e ameaças de custo médio.", risco: "Decks extremamente focados ou muito rápidos.", complexity: "Média" }
};

const NOMES_CORES = {
    "Branco, Azul": "Azorius", "Azul, Preto": "Dimir", "Preto, Vermelho": "Rakdos", "Vermelho, Verde": "Gruul", "Verde, Branco": "Selesnya",
    "Branco, Preto": "Orzhov", "Preto, Verde": "Golgari", "Verde, Azul": "Simic", "Azul, Vermelho": "Izzet", "Vermelho, Branco": "Boros",
    "Branco, Azul, Preto": "Esper", "Azul, Preto, Vermelho": "Grixis", "Preto, Vermelho, Verde": "Jund", "Vermelho, Verde, Branco": "Naya", "Verde, Branco, Azul": "Bant"
};

const VETORES_GATILHOS = [
    { id: "COMBATE", label: "Combate", terms: ["trample", "haste", "double strike", "annihilator"] },
    { id: "DRENO", label: "Dreno/Burn", terms: ["each opponent loses", "damage to each opponent", "drain"] },
    { id: "CONTROLE", label: "Controle/Stax", terms: ["cannot cast", "skip", "opponents can't", "tax"] },
    { id: "COMBO", label: "Combo/Alt", terms: ["win the game", "infinite", "tutor"] }
];

// 1. MONITOR DO CONTADOR DE CARTAS (Badge Externo)
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => {
        const match = l.match(/^(\d+)/);
        total += match ? parseInt(match[1]) : 1;
    });
    document.getElementById('card-count').innerText = total;
});

// 2. LIMPEZA DE STRING (Tratamento de Input)
function limparNome(linha) {
    if (!linha) return "";
    // Remove quantidades (1x), números de set (#123) e split cards ( // )
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    n = n.replace(/\(.*\)/, ""); // Remove (Set Code)
    if (n.includes("//")) n = n.split("//")[0];
    return n.trim();
}

// 3. MOTOR DE ANALISE (Chamada de API)
async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const deckText = document.getElementById('decklist').value;
    const linhas = deckText.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) return alert("O Doutor precisa que você insira uma lista primeiro!");

    loading.classList.remove('hidden');
    resultados.classList.add('hidden');

    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0,
        curve: [0,0,0,0,0,0,0], 
        commander: "", colors: "", inventory: {},
        wincons_map: { COMBATE: [], DRENO: [], CONTROLE: [], COMBO: [] },
        all_card_names: [], combos_found: [], high_impact: []
    };

    for (let linha of linhas) {
        const nomeParaBusca = limparNome(linha);
        if (!nomeParaBusca) continue;
        
        document.getElementById('loading-text').innerText = `Examinando: ${nomeParaBusca}...`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            if (!res.ok) continue;
            const data = await res.json();
            
            const oracle = (data.oracle_text || "").toLowerCase();
            const tLine = data.type_line.toLowerCase();
            const cardName = data.name;
            stats.all_card_names.push(cardName);

            // Identificação de Comandante e Identidade de Cores
            if (!stats.commander && tLine.includes("legendary") && !tLine.includes("land")) {
                stats.commander = cardName;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.map(c => cMap[c]).join(', ') || "Incolor";
            }

            // Curva de Mana e CMC
            if (!tLine.includes("land")) {
                let v = data.cmc || 0;
                stats.cmc += v; stats.count++;
                stats.curve[Math.min(Math.floor(v), 6)]++;
            }

            // Categorização Heurística
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile")) stats.removal++;
            if (data.cmc >= 6) stats.high_impact.push(cardName);

            // Mapeamento de Vetores de Vitória
            VETORES_GATILHOS.forEach(v => {
                if (v.terms.some(t => oracle.includes(t))) {
                    stats.wincons_map[v.id].push(cardName);
                }
            });

            // Organização do Inventário
            let cat = tLine.includes("creature") ? "Criaturas" : 
                      tLine.includes("land") ? "Terrenos" : 
                      tLine.includes("artifact") ? "Artefatos" : 
                      tLine.includes("enchantment") ? "Encantamentos" : "Mágicas";
            
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(cardName);

            // Delay para evitar Rate Limit da API
            await new Promise(r => setTimeout(r, 60));

        } catch (e) { console.warn("Falha ao analisar:", nomeParaBusca); }
    }
    
    finalizarAnalise(stats);
}
/**
 * MAGIC DOCTOR v8.8.1 PLATINUM
 * BLOCO 2: PROCESSAMENTO DE ESTRATÉGIA, RISCO E POWER LEVEL
 */

function finalizarAnalise(stats) {
    // 1. PROCESSAMENTO DE COMBOS
    // Verifica se as cartas detectadas no deck batem com as duplas/trios do banco de dados
    COMBO_DATABASE.forEach(combo => {
        const pecasEncontradas = combo.cards.filter(peca => 
            stats.all_card_names.some(nomeDetectado => nomeDetectado.includes(peca))
        );
        
        // Se encontrar 2 ou mais peças, registra como um combo presente
        if (pecasEncontradas.length >= 2) {
            stats.combos_found.push({
                name: combo.name,
                pieces: pecasEncontradas.join(" + "),
                desc: combo.desc
            });
        }
    });

    // 2. LÓGICA DE DEFINIÇÃO DE ARQUÉTIPO
    let arquetipoFinal = "MIDRANGE"; // Padrão caso não se encaixe em outros
    
    if (stats.combos_found.length > 0) {
        arquetipoFinal = "COMBO";
    } else if (stats.wincons_map.CONTROLE.length > 7) {
        arquetipoFinal = "STAX";
    } else if (stats.inventory["Criaturas"] && stats.inventory["Criaturas"].length > 30) {
        arquetipoFinal = "VOLTRON";
    } else if (stats.inventory["Encantamentos"] && stats.inventory["Encantamentos"].length > 15) {
        arquetipoFinal = "ARISTOCRATS"; // Simplificação para lógica de valor
    }

    const dadosEstrategia = ARQUETIPOS[arquetipoFinal] || ARQUETIPOS["MIDRANGE"];

    // 3. CÁLCULO DE POWER LEVEL (ESCALA DOUTOR 1-10)
    // Base de cálculo matemática para evitar subjetividade
    let powerBase = 3.0;
    
    // Bónus por Eficiência (Ramp e Draw)
    powerBase += (stats.ramp * 0.12);
    powerBase += (stats.draw * 0.12);
    
    // Bónus por Letalidade (Combos e Interação)
    powerBase += (stats.combos_found.length * 0.75);
    powerBase += (stats.removal * 0.05);

    // Ajuste por Curva de Mana (CMC)
    const avgCMC = stats.count > 0 ? (stats.cmc / stats.count) : 0;
    if (avgCMC > 0) {
        if (avgCMC < 2.8) powerBase += 0.6; // Deck muito rápido
        else if (avgCMC > 4.0) powerBase -= 0.4; // Deck muito lento
    }

    // Teto Máximo e Mínimo
    const powerFinal = Math.min(Math.max(powerBase, 1.0), 10.0).toFixed(1);

    // 4. ENVIO PARA RENDERIZAÇÃO
    // Passa os dados processados para a função que desenha na tela
    renderizarInterfacePlatinum(stats, arquetipoFinal, dadosEstrategia, powerFinal, avgCMC);
}

// FUNÇÃO DE UTILITÁRIO: LIMPAR DIAGNÓSTICO
function limparTudo() {
    if (confirm("Deseja limpar todos os dados do diagnóstico atual?")) {
        // Limpa o texto e recarrega a página para resetar os estados
        document.getElementById('decklist').value = "";
        location.reload();
    }
}
/**
 * MAGIC DOCTOR v8.8.1 PLATINUM
 * BLOCO 3: RENDERIZAÇÃO DE UI, CORES DINÂMICAS E INVENTÁRIO
 */

function renderizarInterfacePlatinum(stats, arquetipo, strat, power, avgCMC) {
    const resArea = document.getElementById('resultados');
    const loading = document.getElementById('loading');

    // Exibe a área de resultados e esconde o loading
    resArea.classList.remove('hidden');
    loading.classList.add('hidden');

    // 1. COLUNA 1: ARQUÉTIPO E COMPLEXIDADE (CORES DINÂMICAS)
    document.getElementById('res-arquetipo').innerText = arquetipo;
    document.getElementById('res-arquetipo-desc').innerText = strat.desc;
    
    const compBadge = document.getElementById('res-complexity');
    compBadge.innerText = strat.complexity;
    
    // Normaliza o texto para aplicar a classe de cor correta (ex: diff-baixa, diff-extrema)
    const classeComplexidade = `diff-${strat.complexity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    compBadge.className = `complexity-badge ${classeComplexidade}`;

    // 2. COLUNA 2: MATRIZ DE RISCO
    document.getElementById('res-risco').innerText = strat.risco;

    // 3. COLUNA 3: IDENTIDADE E COMANDANTE
    document.getElementById('res-color-name').innerText = NOMES_CORES[stats.colors] || "Custom";
    document.getElementById('res-color').innerText = stats.colors || "Sem Identidade";
    document.getElementById('res-commander').innerText = stats.commander || "Não Detectado";

    // 4. RELATÓRIO TÁTICO (VETORES DE VITÓRIA COM ESPAÇAMENTO)
    const vectorCont = document.getElementById('res-win-vectors');
    const listWin = document.getElementById('res-wincons-list');
    vectorCont.innerHTML = ""; 
    listWin.innerHTML = "";

    Object.keys(stats.wincons_map).forEach(key => {
        const cards = stats.wincons_map[key];
        if (cards.length > 0) {
            const label = VETORES_GATILHOS.find(v => v.id === key).label;
            // Injeta o badge no container com gap (ajustado no CSS)
            vectorCont.innerHTML += `<span class="vector-badge">${label}</span>`;
            
            // Lista os 4 principais cards do vetor
            cards.slice(0, 4).forEach(cardName => {
                listWin.innerHTML += `<li><strong>⚡</strong> ${cardName}</li>`;
            });
        }
    });

    // 5. VELOCIDADE E COMBOS
    const tempoTag = document.getElementById('res-tempo-tag');
    if (avgCMC > 0) {
        if (avgCMC < 2.8) { tempoTag.innerText = "Early Game"; tempoTag.className = "tempo-tag tempo-early"; }
        else if (avgCMC > 3.7) { tempoTag.innerText = "Late Game"; tempoTag.className = "tempo-tag tempo-late"; }
        else { tempoTag.innerText = "Mid Game"; tempoTag.className = "tempo-tag tempo-mid"; }
    }

    const comboList = document.getElementById('res-combos-list');
    comboList.innerHTML = stats.combos_found.length > 0 
        ? stats.combos_found.map(c => `<li>🧩 <strong>${c.name}</strong><br><small>${c.desc}</small></li>`).join('')
        : "<li>Nenhum combo estrutural detectado.</li>";

    // 6. PERFORMANCE E GRÁFICO DE MANA
    document.getElementById('res-cmc').innerText = avgCMC.toFixed(2);
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-power').innerText = power;

    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy(); // Reseta o gráfico anterior
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: ['0','1','2','3','4','5','6+'], 
            datasets: [{ 
                data: stats.curve, 
                backgroundColor: '#c084fc', 
                borderRadius: 5,
                borderSkipped: false
            }] 
        },
        options: { 
            plugins: { legend: { display: false } }, 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false } } }
        }
    });

    // 7. INVENTÁRIO POR TIPO (COLUNAS COM HOVER E SCROLLBAR)
    const invCont = document.getElementById('tipo-columns-container');
    invCont.innerHTML = "";
    
    // Ordena as categorias e renderiza as colunas
    Object.keys(stats.inventory).sort().forEach(cat => {
        const listaCartas = stats.inventory[cat].sort().map(nome => `<li>${nome}</li>`).join('');
        invCont.innerHTML += `
            <div class="type-column">
                <h3>${cat} (${stats.inventory[cat].length})</h3>
                <ul>${listaCartas}</ul>
            </div>`;
    });
}
