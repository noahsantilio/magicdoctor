/**
 * MAGIC DOCTOR v7.5 - ENGINE TÁTICA COMPLETA
 * Sistema de análise de Decks, Combos e Inventário
 */

let myChart = null;

// 1. Base de Dados de Combos (EDH Meta)
const COMBO_DATABASE = [
    { name: "Heliod + Ballista", cards: ["Heliod, Sun-Crowned", "Walking Ballista"], desc: "Dano e vida infinita." },
    { name: "Sanguine + Exquisite", cards: ["Sanguine Bond", "Exquisite Blood"], desc: "Dreno infinito de vida." },
    { name: "Thoracle + Consultation", cards: ["Thassa's Oracle", "Demonic Consultation"], desc: "Vitória por deck vazio." },
    { name: "Thoracle + Pact", cards: ["Thassa's Oracle", "Tainted Pact"], desc: "Vitória por deck vazio." },
    { name: "Dualcaster + Twinflame", cards: ["Dualcaster Mage", "Twinflame"], desc: "Tokens infinitos com ímpeto." },
    { name: "Mike + Trike", cards: ["Mikaeus, the Unhallowed", "Triskelion"], desc: "Dano infinito por sacrifício." },
    { name: "Kiki-Jiki + Conscripts", cards: ["Kiki-Jiki, Mirror Breaker", "Zealous Conscripts"], desc: "Tokens infinitos com ímpeto." }
];

// 2. Dicionário de Arquétipos
const ARQUETIPOS_INFO = {
    "Voltron": "Focado em tornar o comandante uma ameaça imparável com Auras e Equipamentos.",
    "Aristocrats": "Estratégia de sacrifício para gerar valor e drenar a vida dos oponentes.",
    "Spellslinger": "Focado em conjurar múltiplas mágicas instantâneas e feitiços por turno.",
    "Tokens / Go Wide": "Vence através da criação massiva de criaturas e bônus de exército.",
    "Stompy / Ramp": "Acelera a mana cedo para conjurar criaturas gigantescas rapidamente.",
    "Midrange": "Equilibra controle e agressividade, adaptando-se a qualquer fase do jogo.",
    "Combo": "Focado exclusivamente em reunir peças específicas para vencer na hora.",
    "Control / Stax": "Impede o jogo dos oponentes através de remoções e restrições de mana."
};

// 3. Função de Limpeza (Vacinada contra C17-149, PLST, etc)
function limparNome(linha) {
    if (!linha) return "";
    // Remove quantidade inicial (ex: 1x ou 1 )
    let n = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    // Remove parênteses e colchetes (códigos de coleção)
    n = n.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
    // Remove sufixos estilo C17-149 ou 123
    const regexSet = /\s[A-Z0-9]{3,4}-\d+/;
    n = n.split(regexSet)[0];
    // Trata cartas de dupla face
    if (n.includes("//")) n = n.split("//")[0];
    return n.replace(/\s\s+/g, ' ').replace(/\s+\d+$/, "").trim();
}

// 4. Função Principal de Análise
async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const status = document.getElementById('status-area');
    const deckText = document.getElementById('decklist').value;
    const linhas = deckText.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { alert("Sua lista está vazia!"); return; }

    loading.classList.remove('hidden');
    resultados.classList.add('hidden');
    status.innerHTML = "";

    let stats = {
        cmc: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        curve: [0,0,0,0,0,0,0], tags: {v:0, a:0, s:0, t:0},
        commander: "", colors: "", inventory: {},
        wincons: new Set(), cartasNomes: []
    };

    for (let i = 0; i < linhas.length; i++) {
        const nomeParaBusca = limparNome(linhas[i]);
        if (!nomeParaBusca) continue;
        document.getElementById('loading-text').innerText = `Examinando: ${nomeParaBusca}`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            if (!res.ok) continue;
            const data = await res.json();
            
            stats.cartasNomes.push(data.name);

            // Identificar Comandante e Cores (assume-se ser a 1ª carta)
            if (!stats.commander) {
                stats.commander = data.name;
                const cMap = {'W':'Branco','U':'Azul','B':'Preto','R':'Vermelho','G':'Verde'};
                stats.colors = data.color_identity.length > 0 ? 
                    data.color_identity.map(c => cMap[c]).join(', ') : "Incolor";
            }

            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            const tLine = data.type_line.toLowerCase();

            // Organizar Inventário
            let cat = "Outros";
            if (tLine.includes("creature")) cat = "Criaturas";
            else if (tLine.includes("instant")) cat = "Mágicas Instantâneas";
            else if (tLine.includes("sorcery")) cat = "Feitiços";
            else if (tLine.includes("artifact")) cat = "Artefatos";
            else if (tLine.includes("enchantment")) cat = "Encantamentos";
            else if (tLine.includes("land")) cat = "Terrenos";
            
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(data.name);

            // CMC e Curva
            if (!tLine.includes("land")) {
                let val = data.cmc || 0;
                stats.cmc += val; 
                stats.count++;
                stats.curve[Math.min(Math.floor(val), 6)]++;
            }

            // Lógica de Wincons
            if (oracle.includes("win the game")) stats.wincons.add("Vitória Alternativa");
            if (oracle.includes("poison counter") || oracle.includes("infect")) stats.wincons.add("Infect / Veneno");
            if (oracle.includes("extra combat")) stats.wincons.add("Combates Adicionais");
            if (oracle.includes("each opponent loses") && oracle.includes("life")) stats.wincons.add("Dreno de Vida");

            // Stats de Performance
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) stats.removal++;
            if (oracle.includes("hexproof") || oracle.includes("indestructible")) stats.protection++;
            
            // Tags de Arquétipo
            if (tLine.includes("equipment") || tLine.includes("aura")) stats.tags.v++;
            if (oracle.includes("sacrifice") || oracle.includes("dies")) stats.tags.a++;
            if (tLine.includes("instant") || tLine.includes("sorcery")) stats.tags.s++;
            if (oracle.includes("token")) stats.tags.t++;

            // Delay para respeitar a API Scryfall
            await new Promise(r => setTimeout(r, 65));
        } catch (e) { console.error("Erro na carta: " + nomeParaBusca); }
    }

    renderizar(stats);
    loading.classList.add('hidden');
}

// 5. Função de Renderização Visual
function renderizar(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    document.getElementById('res-commander').innerText = stats.commander;
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-cmc').innerText = stats.count > 0 ? (stats.cmc/stats.count).toFixed(2) : "0";
    
    // Decisão de Arquétipo
    let arq = "Midrange";
    if (stats.tags.v > 6) arq = "Voltron";
    else if (stats.tags.a > 8) arq = "Aristocrats";
    else if (stats.tags.s > 15) arq = "Spellslinger";
    else if (stats.tags.t > 8) arq = "Tokens / Go Wide";
    else if (stats.ramp > 12 && (stats.cmc/stats.count) > 3.4) arq = "Stompy / Ramp";
    
    document.getElementById('res-arquetipo').innerText = arq;
    document.getElementById('res-arquetipo-desc').innerText = ARQUETIPOS_INFO[arq];

    // Wincons
    const winUl = document.getElementById('res-wincons'); winUl.innerHTML = "";
    if (stats.wincons.size === 0) winUl.innerHTML = "<li>Dano de Combate</li>";
    stats.wincons.forEach(w => winUl.innerHTML += `<li>${w}</li>`);

    // Busca de Combos
    const comboUl = document.getElementById('res-combos'); comboUl.innerHTML = "";
    let combosAchados = 0;
    COMBO_DATABASE.forEach(c => {
        if (c.cards.every(nomeCombo => stats.cartasNomes.includes(nomeCombo))) {
            comboUl.innerHTML += `<li><strong>${c.name}</strong></li>`;
            combosAchados++;
        }
    });
    if (combosAchados === 0) comboUl.innerHTML = "<li>Nenhum detectado.</li>";

    // Performance Stats
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-protecao').innerText = stats.protection;
    
    // Power Level Simplificado
    let power = 4.0 + (stats.ramp * 0.15) + (stats.draw * 0.15) + (combosAchados * 1.5);
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // Renderizar Colunas de Inventário
    const container = document.getElementById('tipo-columns-container');
    container.innerHTML = "";
    Object.keys(stats.inventory).sort().forEach(tipo => {
        const div = document.createElement('div');
        div.className = 'type-column';
        const listaHtml = stats.inventory[tipo].sort().map(n => `<li>${n}</li>`).join('');
        div.innerHTML = `<h3>${tipo} (${stats.inventory[tipo].length})</h3><ul>${listaHtml}</ul>`;
        container.appendChild(div);
    });

    // Gráfico de Mana
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
}

// 6. Funções de Utilidade
function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('card-count').innerText = "0";
    document.getElementById('status-area').innerHTML = "";
    if (myChart) myChart.destroy();
}

// Evento para atualizar contador de cartas em tempo real
document.getElementById('decklist').addEventListener('input', function() {
    const texto = this.value.trim();
    if (!texto) { document.getElementById('card-count').innerText = "0"; return; }
    const linhas = texto.split('\n').filter(l => l.trim() !== "");
    let total = 0;
    linhas.forEach(l => {
        const m = l.match(/^(\d+)/);
        total += m ? parseInt(m[1]) : 1;
    });
    document.getElementById('card-count').innerText = total;
});

// 7. Definição do Dicionário de Heurísticas
const HEURISTICAS = [
    { tag: "Card Draw Engine", terms: ["whenever you draw", "draw a card for each"], type: "success" },
    { tag: "Sacrifice Outlet", terms: ["sacrifice a", "sacrifice another"], type: "danger" },
    { tag: "Graveyard Recursion", terms: ["return", "graveyard", "reanimate"], type: "warning" },
    { tag: "Mana Doubler", terms: ["twice as much", "double the amount of mana"], type: "success" },
    { tag: "Tutor", terms: ["search your library", "put it into your hand"], type: "warning" },
    { tag: "Board Wipe", terms: ["destroy all", "exile all creatures", "each creature gets -x/-x"], type: "danger" },
    { tag: "Counterspell", terms: ["counter target spell"], type: "warning" },
    { tag: "Life Gain", terms: ["lifelink", "gain", "life"], type: "success" },
    { tag: "Protection", terms: ["hexproof", "indestructible", "protection from"], type: "success" },
    { tag: "ETB Sinergy", terms: ["enters the battlefield", "when"], type: "" }
];

// 2. No objeto 'stats' dentro de analisarDeck(), adicione:
// stats.detectedTags = new Set();

// 3. Dentro do loop de cartas (após pegar o data da API):
/*
    const oracle = (data.oracle_text || "").toLowerCase();
    
    HEURISTICAS.forEach(h => {
        if (h.terms.some(term => oracle.includes(term))) {
            stats.detectedTags.add(h.tag);
        }
    });
*/

// 4. Função para renderizar as tags (adicione ao final do renderizar):
function renderizarTags(detectedTags) {
    const container = document.getElementById('res-tags');
    container.innerHTML = "";
    
    if (detectedTags.size === 0) {
        container.innerHTML = "<span class='tag'>Nenhuma mecânica complexa detectada</span>";
        return;
    }

    detectedTags.forEach(tagName => {
        // Busca a configuração da tag para saber a cor
        const config = HEURISTICAS.find(h => h.tag === tagName);
        const span = document.createElement('span');
        span.className = `tag ${config && config.type ? 'tag-' + config.type : ''}`;
        span.innerText = tagName;
        container.appendChild(span);
    });
}
