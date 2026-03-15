/**
 * MAGIC DOCTOR v6.0
 * Script Consolidado com todas as funções de limpeza, tradução e inventário.
 */

let myChart = null;

// Dicionário de Cores e Guildas
const CORES_DIC = {
    'W': 'Branco', 'U': 'Azul', 'B': 'Preto', 'R': 'Vermelho', 'G': 'Verde', 'C': 'Incolor',
    'WU': 'Azorius (Branco/Azul)', 'UB': 'Dimir (Azul/Preto)', 'BR': 'Rakdos (Preto/Vermelho)', 
    'RG': 'Gruul (Vermelho/Verde)', 'GW': 'Selesnya (Verde/Branco)', 'WB': 'Orzhov (Branco/Preto)', 
    'UR': 'Izzet (Azul/Vermelho)', 'BG': 'Golgari (Preto/Verde)', 'RW': 'Boros (Branco/Vermelho)', 
    'GU': 'Simic (Verde/Azul)', 'WUB': 'Esper', 'UBR': 'Grixis', 'BRG': 'Jund', 'RGW': 'Naya', 
    'GWU': 'Bant', 'WBR': 'Mardu', 'URG': 'Temur', 'BGW': 'Abzan', 'RWU': 'Jeskai', 'GUB': 'Sultai'
};

const ARQUETIPOS_DIC = {
    "Voltron": "Estratégia focada em equipar ou encantar o seu Comandante com diversas Auras e Equipamentos para vencer através de dano letal de comandante.",
    "Aristocrats": "Baseia-se em sacrificar suas próprias criaturas para gerar valor, drenar a vida dos oponentes ou criar benefícios constantes na mesa.",
    "Spellslinger": "Focado no lançamento massivo de Mágicas Instantâneas e Feitiços, geralmente utilizando cartas que desencadeiam efeitos quando você conjura feitiços.",
    "Tokens / Go Wide": "Cria um exército de diversas pequenas criaturas (tokens) para sobrecarregar a defesa dos oponentes através da quantidade.",
    "Stompy / Ramp": "Acelera a produção de mana nos turnos iniciais para colocar ameaças gigantescas e criaturas de alto poder o mais rápido possível.",
    "Control / Stax": "Utiliza efeitos de 'prisão' ou controle absoluto para impedir que os oponentes joguem, garantindo a vitória através do cansaço ou bloqueio de recursos.",
    "Midrange": "Um deck versátil e equilibrado que possui boas criaturas, algumas respostas e uma curva de mana consistente para qualquer fase do jogo.",
    "Combo": "Procura reunir peças específicas de cartas que, quando juntas, geram uma interação infinita ou uma vitória imediata no jogo."
};

// Função de Limpeza (Vacinada contra C17-149 e PLST)
function limparNomeCarta(linha) {
    if (!linha) return "";
    let nome = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, ""); // Remove qtd
    nome = nome.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, ""); // Remove () e []
    const regexSet = /\s[A-Z0-9]{3,4}-\d+/; // Remove códigos estilo C17-149
    nome = nome.split(regexSet)[0];
    if (nome.includes("//")) nome = nome.split("//")[0]; // Trata cartas duplas
    return nome.replace(/\s\s+/g, ' ').replace(/\s+\d+$/, "").trim();
}

// Contador de Cartas da v2.5
document.getElementById('decklist').addEventListener('input', function() {
    const texto = this.value.trim();
    if (!texto) { document.getElementById('card-count').innerText = "0"; return; }
    const linhas = texto.split('\n');
    let total = 0;
    linhas.forEach(linha => {
        const match = linha.match(/^(\d+)/);
        if (match) total += parseInt(match[1]);
        else if (linha.trim() !== "") total += 1;
    });
    document.getElementById('card-count').innerText = total;
});

async function analisarDeck() {
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const status = document.getElementById('status-area');
    const linhas = document.getElementById('decklist').value.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { alert("Sua lista está vazia!"); return; }

    status.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let stats = {
        cmcTotal: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        curve: [0,0,0,0,0,0,0], tags: { v:0, a:0, s:0, t:0 },
        commander: "", colors: "", inventory: {}, falhas: 0
    };

    for (let i = 0; i < linhas.length; i++) {
        const nomeLimpo = limparNomeCarta(linhas[i]);
        if (!nomeLimpo) continue;
        document.getElementById('loading-text').innerText = `Consultando: ${nomeLimpo}`;

        try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeLimpo)}`);
            if (!res.ok) { stats.falhas++; continue; }
            
            const data = await res.json();
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            const types = data.type_line.toLowerCase();

            // 1. Identidade (Comandante na primeira linha)
            if (!stats.commander) {
                stats.commander = data.name;
                const combo = data.color_identity.sort().join('');
                stats.colors = CORES_DIC[combo] || combo || "Incolor";
            }

            // 2. Inventário por Tipo
            const tipoCard = data.type_line.split('—')[0].split('//')[0].trim();
            const listaTipos = ["Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land"];
            let cat = "Outros";
            listaTipos.forEach(t => { if(tipoCard.includes(t)) cat = t; });
            if (!stats.inventory[cat]) stats.inventory[cat] = [];
            stats.inventory[cat].push(data.name);

            // 3. CMC e Curva
            if (!types.includes("land")) {
                let val = data.cmc || 0;
                stats.cmcTotal += val;
                stats.count++;
                stats.curve[Math.min(Math.floor(val), 6)]++;
            }

            // 4. Heurística de Função
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) stats.removal++;
            if (oracle.includes("hexproof") || oracle.includes("indestructible")) stats.protection++;

            // 5. Tags de Arquétipo
            if (types.includes("equipment") || types.includes("aura")) stats.tags.v++;
            if (oracle.includes("sacrifice") || oracle.includes("dies")) stats.tags.a++;
            if (types.includes("instant") || types.includes("sorcery")) stats.tags.s++;
            if (oracle.includes("token")) stats.tags.t++;

            await new Promise(r => setTimeout(r, 70)); // Anti-bloqueio Scryfall
        } catch (e) { stats.falhas++; }
    }

    if (stats.falhas > 0) {
        status.innerHTML = `<div class="error-msg">ℹ️ O Doutor pulou ${stats.falhas} cartas não identificadas.</div>`;
    }

    exibirResultados(stats);
    loading.classList.add('hidden');
}

function exibirResultados(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    document.getElementById('res-commander').innerText = stats.commander;
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-cmc').innerText = stats.count > 0 ? (stats.cmcTotal/stats.count).toFixed(2) : "0";
    
    // Decisão de Arquétipo
    let arq = "Midrange";
    const t = stats.tags;
    if (t.v > 6) arq = "Voltron";
    else if (t.a > 8) arq = "Aristocrats";
    else if (t.s > 15) arq = "Spellslinger";
    else if (t.t > 8) arq = "Tokens / Go Wide";
    else if (stats.ramp > 11 && (stats.cmcTotal/stats.count) > 3.3) arq = "Stompy / Ramp";

    document.getElementById('res-arquetipo').innerText = arq;
    document.getElementById('res-arquetipo-desc').innerText = ARQUETIPOS_DIC[arq];

    // Stats
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-protecao').innerText = stats.protection;

    // Power Level v6
    let p = 4.0;
    p += (stats.ramp > 9 ? 1.5 : 0.5);
    p += (stats.draw > 9 ? 1.5 : 0.5);
    p += (stats.removal > 8 ? 1.0 : 0.5);
    if (stats.count > 0 && (stats.cmcTotal/stats.count) < 3.2) p += 1.0;
    document.getElementById('stat-power').innerText = Math.min(p, 10).toFixed(1);

    // Renderizar Inventário
    const container = document.getElementById('tipo-columns-container');
    container.innerHTML = "";
    Object.keys(stats.inventory).sort().forEach(tipo => {
        const div = document.createElement('div');
        div.className = 'type-column';
        const lista = stats.inventory[tipo].sort().map(nome => `<li>${nome}</li>`).join('');
        div.innerHTML = `<h3>${tipo} (${stats.inventory[tipo].length})</h3><ul>${lista}</ul>`;
        container.appendChild(div);
    });

    // Gráfico
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0','1','2','3','4','5','6+'],
            datasets: [{ data: stats.curve, backgroundColor: '#818cf8', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    if (myChart) myChart.destroy();
}
