/**
 * MAGIC DOCTOR v8.8 PLATINUM - PARTE 1
 * Inteligência de Identidade e Configurações de UI
 */

let myChart = null;

const COMBO_DATABASE = [
    { name: "Heliod + Ballista", cards: ["Heliod, Sun-Crowned", "Walking Ballista"], desc: "Dano Infinito" },
    { name: "Thassa + Oracle", cards: ["Thassa's Oracle", "Demonic Consultation", "Tainted Pact"], desc: "Vitória Instantânea" },
    { name: "Exquisite + Sanguine", cards: ["Exquisite Blood", "Sanguine Bond"], desc: "Dreno Infinito" },
    { name: "Kiki + Jiki Combo", cards: ["Kiki-Jiki, Mirror Breaker", "Pestermite", "Deceiver Exarch", "Village Bell-Ringer"], desc: "Criaturas Infinitas" },
    { name: "Dramatic Scepter", cards: ["Isochron Scepter", "Dramatic Reversal"], desc: "Mana Infinita" }
];

const ARQUETIPOS = {
    "VOLTRON": { desc: "Foca em fortalecer uma única criatura para vitória via dano de precisão.", risco: "Remoções pontuais e efeitos de sacrifício.", complexity: "Baixa" },
    "ARISTOCRATS": { desc: "Ganha valor sacrificando suas criaturas e drenando os oponentes.", risco: "Exílio de cemitério e efeitos de 'Hushbringer'.", complexity: "Média" },
    "STAX": { desc: "Controla o jogo impedindo que os oponentes usem recursos.", risco: "Decks Aggro rápidos e remoções de artefatos.", complexity: "Alta" },
    "COMBO": { desc: "Busca peças específicas para encerrar o jogo instantaneamente.", risco: "Counterspells e descarte de mão.", complexity: "Extrema" },
    "CONTROL": { desc: "Gerencia ameaças até dominar a mesa com recursos superiores.", risco: "Decks rápidos (Go-Wide) e proteção insuficiente.", complexity: "Alta" }
};

const NOMES_CORES = {
    "Branco, Azul": "Azorius", "Azul, Preto": "Dimir", "Preto, Vermelho": "Rakdos", "Vermelho, Verde": "Gruul", "Verde, Branco": "Selesnya",
    "Branco, Preto": "Orzhov", "Preto, Verde": "Golgari", "Verde, Azul": "Simic", "Azul, Vermelho": "Izzet", "Vermelho, Branco": "Boros",
    "Branco, Azul, Preto": "Esper", "Azul, Preto, Vermelho": "Grixis", "Preto, Vermelho, Verde": "Jund", "Vermelho, Verde, Branco": "Naya", "Verde, Branco, Azul": "Bant"
};

// Mapeamento de Cores para a Complexidade (Corrigindo o destaque visual)
const COMPLEXITY_STYLES = {
    "Baixa": "diff-baixa",
    "Média": "diff-media",
    "Alta": "diff-alta",
    "Extrema": "diff-extrema"
};

const VETORES_GATILHOS = [
    { id: "COMBATE", label: "Combate", terms: ["trample", "haste", "double strike", "annihilator"] },
    { id: "DRENO", label: "Dreno/Burn", terms: ["each opponent loses", "damage to each opponent", "drain"] },
    { id: "CONTROLE", label: "Controle/Stax", terms: ["cannot cast", "skip", "opponents can't", "tax"] },
    { id: "COMBO", label: "Combo/Alt", terms: ["win the game", "infinite", "tutor"] }
];

function limparNome(linha) {
    if (!linha) return "";
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    if (n.includes("//")) n = n.split("//")[0];
    return n.trim();
}

/**
 * MAGIC DOCTOR v8.8 PLATINUM - PARTE 2
 * Motor de Diagnóstico e Contador Moderno
 */

// Monitor do Contador de Cartas (Badge Roxo Moderno)
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => {
        const match = l.match(/^(\d+)/);
        total += match ? parseInt(match[1]) : 1;
    });
    // Atualiza o contador dentro do badge roxo
    document.getElementById('card-count').innerText = total;
});

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

    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0,
        curve: [0,0,0,0,0,0,0], 
        commander: "", colors: "", inventory: {},
        wincons_map: { COMBATE: [], DRENO: [], CONTROLE: [], COMBO: [] },
        high_impact: [], all_card_names: [], combos_found: []
    };

    // Coleta de Dados via Scryfall
    for (let i = 0; i < linhas.length; i++) {
        const nomeParaBusca = limparNome(linhas[i]);
        if (!nomeParaBusca) continue;
        
        document.getElementById('loading-text').innerText = `Analisando: ${nomeParaBusca}...`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            if (!res.ok) continue;
            const data = await res.json();
            
            const oracle = (data.oracle_text || "").toLowerCase();
            const tLine = data.type_line.toLowerCase();
            const name = data.name;
            stats.all_card_names.push(name);

            // Identificação de Comandante
            if (!stats.commander && tLine.includes("legendary") && !tLine.includes("land")) {
                stats.commander = name;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.map(c => cMap[c]).join(', ') || "Incolor";
            }

            // Vetores de Vitória (Início do Mapeamento)
            VETORES_GATILHOS.forEach(v => {
                if (v.terms.some(t => oracle.includes(t))) {
                    const isFinisher = oracle.includes("win the game") || oracle.includes("+x/+x") || oracle.includes("extra turn");
                    stats.wincons_map[v.id].push({ name: name, role: isFinisher ? 'finisher' : 'enabler' });
                }
            });

            // CMC e Inventário
            if (!tLine.includes("land")) {
                let v = data.cmc || 0;
                stats.cmc += v; stats.count++;
                stats.curve[Math.min(Math.floor(v), 6)]++;
            }

            // Categorização Básica
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile")) stats.removal++;

            let cat = tLine.includes("creature") ? "Criaturas" : 
                      tLine.includes("land") ? "Terrenos" : 
                      tLine.includes("artifact") ? "Artefatos" : 
                      tLine.includes("enchantment") ? "Encantamentos" : "Mágicas";
            
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(name);

            await new Promise(r => setTimeout(r, 65));

        } catch (e) { console.error("Erro:", nomeParaBusca); }
    }

/**
 * MAGIC DOCTOR v8.7 PLATINUM - PARTE 4
 * Lógica Final: Combos, Cores de Complexidade e Espaçamento
 */

    // --- PROCESSAMENTO FINAL DE COMBOS ---
    COMBO_DATABASE.forEach(combo => {
        const matches = combo.cards.filter(cardName => 
            stats.all_card_names.some(detected => detected.includes(cardName))
        );
        if (matches.length >= 2) {
            stats.combos_found.push({ name: combo.name, pieces: matches.join(" + "), desc: combo.desc });
        }
    });

    // --- DEFINIÇÃO DE ARQUÉTIPO E POWER LEVEL ---
    let arquetipoFinal = "MIDRANGE";
    if (stats.combos_found.length > 0) arquetipoFinal = "COMBO";
    else if (stats.wincons_map.CONTROLE.length > 8) arquetipoFinal = "STAX";
    else if (stats.inventory["Criaturas"]?.length > 30) arquetipoFinal = "STOMPY";

    const stratData = ARQUETIPOS[arquetipoFinal] || { desc: "Equilibrado.", risco: "Variável.", complexity: "Média" };
    const finalPower = Math.min(3 + (stats.ramp*0.1) + (stats.draw*0.1) + (stats.combos_found.length*0.5), 10).toFixed(1);

    renderizarPlatinumV88(stats, arquetipoFinal, stratData, finalPower);
    loading.classList.add('hidden');
}

/**
 * RENDERIZAÇÃO V8.8 - FOCO EM UI/UX
 */
function renderizarPlatinumV88(stats, arquetipo, strat, power) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // 1. Identidade e Destaque de Complexidade (CORREÇÃO DE CORES)
    document.getElementById('res-arquetipo').innerText = arquetipo;
    document.getElementById('res-arquetipo-desc').innerText = strat.desc;
    document.getElementById('res-risco').innerText = strat.risco;
    
    const compBadge = document.getElementById('res-complexity');
    compBadge.innerText = strat.complexity;
    // Remove classes antigas e aplica a nova cor baseada no dicionário da Parte 1
    compBadge.className = "complexity-badge " + (COMPLEXITY_STYLES[strat.complexity] || "");

    document.getElementById('res-color-name').innerText = NOMES_CORES[stats.colors] || "Custom";
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-commander').innerText = stats.commander || "Não Detectado";

    // 2. Vetores de Vitória (CORREÇÃO DE ESPAÇAMENTO)
    const vectorCont = document.getElementById('res-win-vectors');
    const listWin = document.getElementById('res-wincons-list');
    vectorCont.innerHTML = ""; 
    listWin.innerHTML = "";

    Object.keys(stats.wincons_map).forEach(key => {
        const cards = stats.wincons_map[key];
        if (cards.length > 0) {
            const label = VETORES_GATILHOS.find(g => g.id === key).label;
            // Injeta o badge no container com gap
            vectorCont.innerHTML += `<span class="vector-badge">${label}</span>`;
            
            cards.slice(0, 4).forEach(c => {
                const icon = c.role === 'finisher' ? '⚔️' : '⚙️';
                listWin.innerHTML += `<li><strong>${icon}</strong> ${c.name}</li>`;
            });
        }
    });

    // 3. Velocidade e Combos
    const avgCMC = stats.count > 0 ? (stats.cmc / stats.count) : 0;
    const tempoTag = document.getElementById('res-tempo-tag');
    if (avgCMC < 2.7) { tempoTag.innerText = "Early Game"; tempoTag.className = "tempo-tag tempo-early"; }
    else if (avgCMC > 3.6) { tempoTag.innerText = "Late Game"; tempoTag.className = "tempo-tag tempo-late"; }
    else { tempoTag.innerText = "Mid Game"; tempoTag.className = "tempo-tag tempo-mid"; }

    const comboList = document.getElementById('res-combos-list');
    comboList.innerHTML = stats.combos_found.length > 0 
        ? stats.combos_found.map(c => `<li>🧩 <strong>${c.name}</strong><br><small>${c.desc}</small></li>`).join('')
        : "<li>Nenhum combo detectado.</li>";

    // 4. Performance e Gráfico
    document.getElementById('res-cmc').innerText = avgCMC.toFixed(2);
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-power').innerText = power;

    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: ['0','1','2','3','4','5','6+'], 
            datasets: [{ data: stats.curve, backgroundColor: '#c084fc', borderRadius: 5 }] 
        },
        options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
    });

    // 5. Inventário com Hover
    const invCont = document.getElementById('tipo-columns-container');
    invCont.innerHTML = "";
    Object.keys(stats.inventory).sort().forEach(cat => {
        invCont.innerHTML += `
            <div class="type-column">
                <h3>${cat} (${stats.inventory[cat].length})</h3>
                <ul>${stats.inventory[cat].sort().map(n => `<li>${n}</li>`).join('')}</ul>
            </div>`;
    });
}

function limparTudo() {
    if(confirm("Deseja limpar o diagnóstico?")) location.reload();
}
