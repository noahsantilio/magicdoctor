/**
 * MAGIC DOCTOR v8.5 GOLD - MOTOR ESTRATÉGICO
 * Sistema de Heurística, Detecção de Cores e Riscos
 */

let myChart = null;

// 1. Dicionário de Cores (Nomes da Comunidade)
const NOMES_CORES = {
    "Branco, Azul": "Azorius", "Azul, Preto": "Dimir", "Preto, Vermelho": "Rakdos", "Vermelho, Verde": "Gruul", "Verde, Branco": "Selesnya",
    "Branco, Preto": "Orzhov", "Preto, Verde": "Golgari", "Verde, Azul": "Simic", "Azul, Vermelho": "Izzet", "Vermelho, Branco": "Boros",
    "Branco, Azul, Preto": "Esper", "Azul, Preto, Vermelho": "Grixis", "Preto, Vermelho, Verde": "Jund", "Vermelho, Verde, Branco": "Naya", "Verde, Branco, Azul": "Bant",
    "Branco, Preto, Verde": "Abzan", "Azul, Vermelho, Branco": "Jeskai", "Preto, Verde, Azul": "Sultai", "Vermelho, Branco, Preto": "Mardu", "Verde, Azul, Vermelho": "Temur",
    "Branco, Azul, Preto, Vermelho": "Yore-Tiller", "Azul, Preto, Vermelho, Verde": "Glint-Eye", "Preto, Vermelho, Verde, Branco": "Dune-Brood", "Vermelho, Verde, Branco, Azul": "Ink-Treader", "Verde, Branco, Azul, Preto": "Witch-Maw",
    "Branco, Azul, Preto, Vermelho, Verde": "WUBRG / 5 Cores"
};

// 2. Matriz de Dados Estratégicos (Risco e Complexidade)
const DADOS_ARQUETIPO = {
    "Voltron": {
        desc: "Focado em tornar o comandante uma ameaça imparável com Auras e Equipamentos.",
        risco: "Control / Stax (Remoções pontuais, Éditos e efeitos de 'Tax' acabam com sua única ameaça).",
        diff: "Baixa", class: "diff-baixa"
    },
    "Aristocrats": {
        desc: "Estratégia de sacrifício para gerar valor e drenar a vida dos oponentes.",
        risco: "Graveyard Hate (Cartas que exilam o cemitério anulam completamente seu motor de valor).",
        diff: "Média", class: "diff-media"
    },
    "Spellslinger": {
        desc: "Focado em conjurar múltiplas mágicas instantâneas e feitiços por turno.",
        risco: "Stax / Aggro (Efeitos que limitam mágicas por turno ou pressão rápida no early game).",
        diff: "Alta", class: "diff-alta"
    },
    "Tokens / Go Wide": {
        desc: "Vence através da criação massiva de criaturas e bônus de exército.",
        risco: "Board Wipes (Remoções globais punem seu excesso de presença em campo rapidamente).",
        diff: "Baixa", class: "diff-baixa"
    },
    "Stompy / Ramp": {
        desc: "Acelera a mana cedo para conjurar criaturas gigantescas rapidamente.",
        risco: "Combo / Control (Estratégias mais rápidas que ignoram suas criaturas ou as anulam).",
        diff: "Baixa", class: "diff-baixa"
    },
    "Midrange": {
        desc: "Equilibra controle e agressividade, adaptando-se a qualquer fase do jogo.",
        risco: "Combo (Você é versátil, mas pode ser atropelado por vitórias súbitas antes de estabilizar).",
        diff: "Média", class: "diff-media"
    },
    "Combo": {
        desc: "Focado exclusivamente em reunir peças específicas para vencer na hora.",
        risco: "Control / Aggro (Anulações precisas nas peças-chave ou morte rápida pré-setup).",
        diff: "Extrema", class: "diff-extrema"
    },
    "Control / Stax": {
        desc: "Impede o jogo dos oponentes através de remoções e restrições de mana.",
        risco: "Midrange / Value Decks (Decks que geram valor passivo imparável podem te esgotar).",
        diff: "Alta", class: "diff-alta"
    }
};

// 3. Heurísticas de Palavras-Chave (Tags)
const HEURISTICAS = [
    { tag: "Card Draw Engine", terms: ["whenever you draw", "draw a card for each"], type: "success" },
    { tag: "Sacrifice Outlet", terms: ["sacrifice a", "sacrifice another"], type: "danger" },
    { tag: "Graveyard Recursion", terms: ["return", "graveyard", "reanimate"], type: "warning" },
    { tag: "Mana Doubler", terms: ["twice as much", "double the amount of mana"], type: "success" },
    { tag: "Tutor", terms: ["search your library", "put it into your hand"], type: "warning" },
    { tag: "Board Wipe", terms: ["destroy all", "exile all creatures", "each creature gets -x/-x"], type: "danger" },
    { tag: "Counterspell", terms: ["counter target spell"], type: "warning" },
    { tag: "Protection", terms: ["hexproof", "indestructible", "protection from"], type: "success" }
];

// 4. Base de Combos
const COMBO_DATABASE = [
    { name: "Heliod + Ballista", cards: ["Heliod, Sun-Crowned", "Walking Ballista"] },
    { name: "Thoracle + Consultation", cards: ["Thassa's Oracle", "Demonic Consultation"] },
    { name: "Sanguine + Exquisite", cards: ["Sanguine Bond", "Exquisite Blood"] }
];

// 5. Função de Limpeza de Nome
function limparNome(linha) {
    if (!linha) return "";
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    n = n.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    const regexSet = /\s[A-Z0-9]{3,4}-\d+/;
    n = n.split(regexSet)[0];
    if (n.includes("//")) n = n.split("//")[0];
    return n.trim();
}

// 6. Motor de Análise
async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const deckText = document.getElementById('decklist').value;
    const linhas = deckText.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { alert("Insira uma lista!"); return; }

    loading.classList.remove('hidden');
    resultados.classList.add('hidden');

    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        curve: [0,0,0,0,0,0,0], tags: {v:0, a:0, s:0, t:0},
        commander: "", colors: "", inventory: {},
        wincons: new Set(), cartasNomes: [], detectedTags: new Set()
    };

    for (let i = 0; i < linhas.length; i++) {
        const nomeParaBusca = limparNome(linhas[i]);
        if (!nomeParaBusca) continue;
        document.getElementById('loading-text').innerText = `Lendo: ${nomeParaBusca}...`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            if (!res.ok) continue;
            const data = await res.json();
            
            stats.cartasNomes.push(data.name);

            if (!stats.commander) {
                stats.commander = data.name;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.map(c => cMap[c]).join(', ') || "Incolor";
            }

            const oracle = (data.oracle_text || "").toLowerCase();
            const tLine = data.type_line.toLowerCase();

            // Inventário
            let cat = "Outros";
            if (tLine.includes("creature")) cat = "Criaturas";
            else if (tLine.includes("land")) cat = "Terrenos";
            else if (tLine.includes("instant") || tLine.includes("sorcery")) cat = "Mágicas";
            else if (tLine.includes("artifact")) cat = "Artefatos";
            else if (tLine.includes("enchantment")) cat = "Encantamentos";
            
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(data.name);

            // Heurística de Tags
            HEURISTICAS.forEach(h => {
                if (h.terms.some(term => oracle.includes(term))) stats.detectedTags.add(h.tag);
            });

            // CMC
            if (!tLine.includes("land")) {
                let val = data.cmc || 0;
                stats.cmc += val; stats.count++;
                stats.curve[Math.min(Math.floor(val), 6)]++;
            }

            // Stats Rápidos
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile")) stats.removal++;
            if (oracle.includes("hexproof") || oracle.includes("indestructible")) stats.protection++;

            // Tags Arquétipo
            if (tLine.includes("equipment") || tLine.includes("aura")) stats.tags.v++;
            if (oracle.includes("sacrifice") || oracle.includes("dies")) stats.tags.a++;
            if (tLine.includes("instant") || tLine.includes("sorcery")) stats.tags.s++;
            if (oracle.includes("token")) stats.tags.t++;

            await new Promise(r => setTimeout(r, 60));
        } catch (e) { console.warn("Erro ao buscar carta."); }
    }
    renderizar(stats);
    loading.classList.add('hidden');
}

// 7. Renderização
function renderizar(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // Cores e Comandante
    const nomeComb = NOMES_CORES[stats.colors] || "Customizada";
    document.getElementById('res-color-name').innerText = nomeComb;
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-commander').innerText = stats.commander;

    // Lógica de Arquétipo
    let arq = "Midrange";
    if (stats.tags.v > 5) arq = "Voltron";
    else if (stats.tags.a > 7) arq = "Aristocrats";
    else if (stats.tags.s > 15) arq = "Spellslinger";
    else if (stats.tags.t > 8) arq = "Tokens / Go Wide";
    else if (stats.ramp > 12 && (stats.cmc/stats.count) > 3.4) arq = "Stompy / Ramp";

    const infoArq = DADOS_ARQUETIPO[arq];
    document.getElementById('res-arquetipo').innerText = arq;
    document.getElementById('res-arquetipo-desc').innerText = infoArq.desc;
    document.getElementById('res-risco').innerText = infoArq.risco;
    
    const compBadge = document.getElementById('res-complexity');
    compBadge.innerText = infoArq.diff;
    compBadge.className = `complexity-badge ${infoArq.class}`;

    // Tags Heurísticas
    const tagCont = document.getElementById('res-tags'); tagCont.innerHTML = "";
    stats.detectedTags.forEach(t => {
        const config = HEURISTICAS.find(h => h.tag === t);
        tagCont.innerHTML += `<span class="tag tag-${config.type}">${t}</span>`;
    });

    // Combos
    const comboUl = document.getElementById('res-combos'); comboUl.innerHTML = "";
    let combos = 0;
    COMBO_DATABASE.forEach(c => {
        if (c.cards.every(nome => stats.cartasNomes.includes(nome))) {
            comboUl.innerHTML += `<li><strong>${c.name}</strong></li>`; combos++;
        }
    });
    if (combos === 0) comboUl.innerHTML = "<li>Nenhum detectado.</li>";

    // Wincons Simples
    document.getElementById('res-wincons').innerHTML = combos > 0 ? "<li>Linha de Combo</li>" : "<li>Dano de Combate</li>";

    // Stats e Gráfico
    document.getElementById('res-cmc').innerText = stats.count > 0 ? (stats.cmc/stats.count).toFixed(2) : "0";
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-protecao').innerText = stats.protection;
    document.getElementById('stat-power').innerText = Math.min(4.5 + (stats.ramp*0.1) + (combos*1.5), 10).toFixed(1);

    // Colunas de Inventário
    const invCont = document.getElementById('tipo-columns-container'); invCont.innerHTML = "";
    Object.keys(stats.inventory).sort().forEach(cat => {
        const div = document.createElement('div'); div.className = 'type-column';
        div.innerHTML = `<h3>${cat} (${stats.inventory[cat].length})</h3><ul>${stats.inventory[cat].map(n => `<li>${n}</li>`).join('')}</ul>`;
        invCont.appendChild(div);
    });

    // Chart.js
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0','1','2','3','4','5','6+'],
            datasets: [{ label: 'Cartas', data: stats.curve, backgroundColor: '#818cf8', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function limparTudo() { location.reload(); }

// Contador em Tempo Real
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => { const m = l.match(/^(\d+)/); total += m ? parseInt(m[1]) : 1; });
    document.getElementById('card-count').innerText = total;
});
