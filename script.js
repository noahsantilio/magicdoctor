/**
 * MAGIC DOCTOR v8.6 PLATINUM 
 * Sistema de Inteligência Tática e Heurística de Vetores
 */

let myChart = null;

// --- DICIONÁRIOS E BASES DE DADOS ---

const NOMES_CORES = {
    "Branco, Azul": "Azorius", "Azul, Preto": "Dimir", "Preto, Vermelho": "Rakdos", "Vermelho, Verde": "Gruul", "Verde, Branco": "Selesnya",
    "Branco, Preto": "Orzhov", "Preto, Verde": "Golgari", "Verde, Azul": "Simic", "Azul, Vermelho": "Izzet", "Vermelho, Branco": "Boros",
    "Branco, Azul, Preto": "Esper", "Azul, Preto, Vermelho": "Grixis", "Preto, Vermelho, Verde": "Jund", "Vermelho, Verde, Branco": "Naya", "Verde, Branco, Azul": "Bant",
    "Branco, Preto, Verde": "Abzan", "Azul, Vermelho, Branco": "Jeskai", "Preto, Verde, Azul": "Sultai", "Vermelho, Branco, Preto": "Mardu", "Verde, Azul, Vermelho": "Temur",
    "Branco, Azul, Preto, Vermelho, Verde": "WUBRG / 5 Cores"
};

const VETORES_GATILHOS = [
    { id: "COMBATE", label: "Combate", terms: ["trample", "haste", "double strike", "annihilator", "creatures you control get +"], color: "warning" },
    { id: "DRENO", label: "Dreno/Burn", terms: ["each opponent loses", "damage to each opponent", "drain", "whenever a creature dies, each opponent"], color: "danger" },
    { id: "CONTROLE", label: "Controle/Stax", terms: ["cannot cast", "skip", "opponents can't", "tax", "costs more to cast"], color: "primary" },
    { id: "COMBO", label: "Combo/Alt", terms: ["win the game", "infinite", "tutor", "search your library for a card and put it into your hand"], color: "accent" }
];

const ALTO_IMPACTO_TERMS = ["whenever an opponent casts", "whenever you draw", "double", "each time", "all spells", "no more than one", "extra turn"];

// --- FUNÇÕES DE UTILIDADE ---

function limparNome(linha) {
    if (!linha) return "";
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    n = n.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    if (n.includes("//")) n = n.split("//")[0];
    return n.trim();
}

// --- MOTOR DE ANÁLISE ---

async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const deckText = document.getElementById('decklist').value;
    const linhas = deckText.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { alert("O Doutor precisa de uma lista para trabalhar!"); return; }

    loading.classList.remove('hidden');
    resultados.classList.add('hidden');

    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        curve: [0,0,0,0,0,0,0], commander: "", colors: "", inventory: {},
        wincons_map: { COMBATE: [], DRENO: [], CONTROLE: [], COMBO: [] },
        high_impact: [], all_card_names: []
    };

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

            // Detecção de Comandante e Cores
            if (!stats.commander && tLine.includes("legendary")) {
                stats.commander = name;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.map(c => cMap[c]).join(', ') || "Incolor";
            }

            // Mapeamento de Vetores de Vitória (⚔️ vs ⚙️)
            VETORES_GATILHOS.forEach(v => {
                if (v.terms.some(t => oracle.includes(t))) {
                    const isFinisher = oracle.includes("win the game") || oracle.includes("+x/+x") || oracle.includes("extra turn") || oracle.includes("annihilator");
                    stats.wincons_map[v.id].push({ name: name, role: isFinisher ? 'finisher' : 'enabler' });
                }
            });

            // Detecção de Alto Impacto (Must Answer)
            if (ALTO_IMPACTO_TERMS.some(t => oracle.includes(t)) && !tLine.includes("land")) {
                stats.high_impact.push(name);
            }

            // Curva e Estatísticas
            if (!tLine.includes("land")) {
                let v = data.cmc || 0;
                stats.cmc += v; stats.count++;
                stats.curve[Math.min(Math.floor(v), 6)]++;
            }

            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile")) stats.removal++;

            // Organização de Inventário
            let cat = tLine.includes("creature") ? "Criaturas" : tLine.includes("land") ? "Terrenos" : tLine.includes("artifact") ? "Artefatos" : tLine.includes("enchantment") ? "Encantamentos" : "Mágicas";
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(name);

            // Pequena pausa para evitar bloqueio da API Scryfall
            await new Promise(r => setTimeout(r, 60));
        } catch (e) { console.error("Erro na carta:", nomeParaBusca); }
    }
    
    renderizarPlatinum(stats);
    loading.classList.add('hidden');
}

// --- RENDERIZAÇÃO DE INTERFACE ---

function renderizarPlatinum(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // Identidade Visual
    document.getElementById('res-color-name').innerText = NOMES_CORES[stats.colors] || "Customizada";
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-commander').innerText = stats.commander || "Não identificado";

    // Cálculo de Velocidade (Tempo)
    const avgCMC = stats.count > 0 ? (stats.cmc / stats.count) : 0;
    const tempoTag = document.getElementById('res-tempo-tag');
    if (avgCMC < 2.6 || stats.ramp > 14) { 
        tempoTag.innerText = "Early Game (Agressivo)"; 
        tempoTag.className = "tempo-tag tempo-early"; 
    } else if (avgCMC > 3.7) { 
        tempoTag.innerText = "Late Game (Controle)"; 
        tempoTag.className = "tempo-tag tempo-late"; 
    } else { 
        tempoTag.innerText = "Mid Game (Equilibrado)"; 
        tempoTag.className = "tempo-tag tempo-mid"; 
    }

    // Vetores e Wincons (Mapeamento Dinâmico)
    const vectorCont = document.getElementById('res-win-vectors');
    const listWin = document.getElementById('res-wincons-list');
    vectorCont.innerHTML = ""; listWin.innerHTML = "";

    Object.keys(stats.wincons_map).forEach(key => {
        const cards = stats.wincons_map[key];
        if (cards.length > 0) {
            const vData = VETORES_GATILHOS.find(g => g.id === key);
            vectorCont.innerHTML += `<span class="vector-badge">${vData.label}</span>`;
            
            // Exibe apenas os top 4 por categoria para não poluir
            cards.slice(0, 4).forEach(c => {
                const icon = c.role === 'finisher' ? '<span class="icon-finisher">⚔️</span>' : '<span class="icon-enabler">⚙️</span>';
                listWin.innerHTML += `<li>${icon} ${c.name}</li>`;
            });
        }
    });

    // Cartas de Alto Impacto
    const highCont = document.getElementById('res-high-impact');
    highCont.innerHTML = stats.high_impact.length > 0 
        ? stats.high_impact.slice(0, 6).map(n => `<li>⭐ ${n}</li>`).join('')
        : "<li>Nenhuma peça crítica detectada.</li>";

    // Estatísticas Numéricas
    document.getElementById('res-cmc').innerText = avgCMC.toFixed(2);
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    
    // Lógica de Power Level (Aproximada)
    let power = 3 + (stats.ramp * 0.15) + (stats.draw * 0.1) + (stats.high_impact.length * 0.2);
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // Gráfico de Mana (Chart.js)
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
                borderRadius: 5
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });

    // Inventário por Tipos
    const invCont = document.getElementById('tipo-columns-container');
    invCont.innerHTML = "";
    Object.keys(stats.inventory).sort().forEach(cat => {
        invCont.innerHTML += `
            <div class="type-column">
                <h3>${cat} (${stats.inventory[cat].length})</h3>
                <ul>${stats.inventory[cat].map(n => `<li>${n}</li>`).join('')}</ul>
            </div>`;
    });
}

function limparTudo() { location.reload(); }

// Contador de cartas em tempo real
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => {
        const m = l.match(/^(\d+)/);
        total += m ? parseInt(m[1]) : 1;
    });
    document.getElementById('card-count').innerText = total;
});
