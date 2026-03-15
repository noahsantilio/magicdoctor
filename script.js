/**
 * MAGIC DOCTOR v4.5
 * Módulo de Estabilidade e Tratamento de Exceções
 */

let myChart = null;

// Sanitização robusta: Remove quantidades, edições e trata nomes de cartas de duas faces
function sanitizarNome(linha) {
    if (!linha) return "";
    let nome = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, ""); // Remove "1x "
    nome = nome.split('(')[0].split('[')[0].split('*')[0]; // Remove (Set) e [Edição]
    
    // Trata cartas como "Toph // Blind Bandit" pegando apenas o primeiro nome para a busca
    if (nome.includes("//")) nome = nome.split("//")[0];
    
    return nome.trim();
}

// Contador em tempo real
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

function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    document.getElementById('loading').classList.add('hidden');
    if (myChart) { myChart.destroy(); myChart = null; }
}

async function analisarDeck() {
    const statusArea = document.getElementById('status-area');
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const loadingText = document.getElementById('loading-text');
    
    const linhas = document.getElementById('decklist').value.split('\n').filter(l => l.trim() !== "");
    if (linhas.length === 0) { exibirErro("Cole sua lista!"); return; }

    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let stats = {
        cmcTotal: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        tags: { voltron: 0, aristocrats: 0, spellslinger: 0, tokens: 0, combo: 0, stax: 0 },
        curve: [0,0,0,0,0,0,0], colors: "", commander: ""
    };
    let erros = [];

    for (let i = 0; i < linhas.length; i++) {
        const nomeParaBusca = sanitizarNome(linhas[i]);
        if (!nomeParaBusca) continue;

        loadingText.innerText = `Processando ${i+1}/${linhas.length}: ${nomeParaBusca}`;

        try {
            // Requisição com busca fuzzy
            const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`);
            
            if (!response.ok) {
                erros.push(nomeParaBusca);
                continue; // Pula para a próxima carta sem quebrar o código
            }

            const data = await response.json();
            
            // Dados do Comandante (Primeira linha)
            if (i === 0) {
                stats.commander = data.name;
                stats.colors = data.color_identity.join('') || 'C';
            }

            // Estatísticas e CMC
            if (!data.type_line.toLowerCase().includes("land")) {
                let cmc = data.cmc || 0;
                stats.cmcTotal += cmc;
                stats.count++;
                stats.curve[Math.min(Math.floor(cmc), 6)]++;
            }

            // Análise Oracle
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            const types = data.type_line.toLowerCase();

            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) stats.removal++;
            if (oracle.includes("hexproof") || oracle.includes("indestructible") || oracle.includes("protection from")) stats.protection++;

            // Tags de Arquétipo
            if (types.includes("equipment") || types.includes("aura")) stats.tags.voltron++;
            if (oracle.includes("sacrifice") || oracle.includes("dies")) stats.tags.aristocrats++;
            if (types.includes("instant") || types.includes("sorcery")) stats.tags.spellslinger++;
            if (oracle.includes("create") && oracle.includes("token")) stats.tags.tokens++;
            if (oracle.includes("win the game")) stats.tags.combo++;

            // Delay de 80ms para evitar 429 (Too Many Requests)
            await new Promise(r => setTimeout(r, 80));

        } catch (e) {
            erros.push(nomeParaBusca);
        }
    }

    if (erros.length > 0) {
        exibirErro(`O Doutor pulou ${erros.length} cartas não identificadas (Ex: ${erros[0]}).`);
    }

    processarArquétipo(stats);
    exibirResultados(stats);
    loading.classList.add('hidden');
}

function processarArquétipo(stats) {
    const t = stats.tags;
    let p = "Midrange";
    if (t.voltron > 6) p = "Voltron";
    else if (t.aristocrats > 8) p = "Aristocrats";
    else if (t.spellslinger > 12) p = "Spellslinger";
    else if (t.tokens > 8) p = "Tokens / Go Wide";
    else if (stats.ramp > 12 && (stats.cmcTotal/stats.count) > 3.3) p = "Stompy / Ramp";
    
    document.getElementById('res-arquetipo').innerText = p;
}

function exibirErro(msg) {
    const area = document.getElementById('status-area');
    area.innerHTML = `<div class="error-msg">ℹ️ ${msg}</div>`;
}

function exibirResultados(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    document.getElementById('res-commander').innerText = stats.commander || "Não Identificado";
    document.getElementById('res-color').innerText = stats.colors;
    document.getElementById('res-cmc').innerText = stats.count > 0 ? (stats.cmcTotal / stats.count).toFixed(2) : "0";
    
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-protecao').innerText = stats.protection;

    // Power Level
    let power = 4.0;
    if (stats.ramp > 10) power += 1.5;
    if (stats.draw > 10) power += 1.5;
    if (stats.removal > 8) power += 1.0;
    if (stats.count > 0 && (stats.cmcTotal/stats.count) < 3.2) power += 1.5;
    
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0','1','2','3','4','5','6+'],
            datasets: [{ label: 'Cartas', data: stats.curve, backgroundColor: '#818cf8', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}
