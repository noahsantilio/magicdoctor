/**
 * MAGIC DOCTOR v5.0 - Edição Resiliência Total
 * Foco: Limpeza de formatos complexos (C17-149) e Continuidade de Análise
 */

let myChart = null;

// LIMPEZA CIRÚRGICA: Trata "1 Cultivate C18-138" ou "1 Farseek (PLST) C17-149"
function limparNomeCarta(linha) {
    if (!linha) return "";
    
    // 1. Remove a quantidade inicial (ex: "1x ", "1 ")
    let nome = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    
    // 2. Remove parênteses e colchetes e tudo dentro deles
    nome = nome.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");

    // 3. REMOÇÃO DE CÓDIGO DE SET (A chave para o seu erro atual)
    // Procura por padrões como " C17-149" ou " M21-12" (Espaço + Letras + Hífen + Números)
    // E corta tudo a partir daí.
    const regexSet = /\s[A-Z0-9]{3,4}-\d+/;
    nome = nome.split(regexSet)[0];

    // 4. Trata cartas de dupla face (pega apenas a primeira)
    if (nome.includes("//")) nome = nome.split("//")[0];

    // 5. Limpeza final de espaços duplos e números soltos no fim
    return nome.replace(/\s\s+/g, ' ').replace(/\s+\d+$/, "").trim();
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
    if (linhas.length === 0) { alert("Cole sua lista!"); return; }

    // Reset de interface
    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let stats = {
        cmcTotal: 0, count: 0, ramp: 0, draw: 0, removal: 0, protection: 0,
        tags: { voltron: 0, aristocrats: 0, spellslinger: 0, tokens: 0, combo: 0 },
        curve: [0,0,0,0,0,0,0], colors: "", commander: ""
    };
    let cartasFalhas = [];

    // Loop de Processamento
    for (let i = 0; i < linhas.length; i++) {
        const nomeLimpo = limparNomeCarta(linhas[i]);
        if (!nomeLimpo) continue;

        loadingText.innerText = `Consultando (${i+1}/${linhas.length}): ${nomeLimpo}`;

        try {
            // Busca Fuzzy para maior tolerância
            const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeLimpo)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                cartasFalhas.push(nomeLimpo);
                continue; // Pula para a próxima sem travar
            }

            const data = await response.json();
            
            // Define o Comandante (primeira carta com sucesso)
            if (!stats.commander) {
                stats.commander = data.name;
                stats.colors = data.color_identity ? data.color_identity.join('') : 'C';
            }

            // Ignora terrenos para curva de mana
            if (!data.type_line.toLowerCase().includes("land")) {
                let cmc = data.cmc || 0;
                stats.cmcTotal += cmc;
                stats.count++;
                stats.curve[Math.min(Math.floor(cmc), 6)]++;
            }

            // Análise de Habilidades
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            const types = data.type_line.toLowerCase();

            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) stats.ramp++;
            if (oracle.includes("draw")) stats.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) stats.removal++;
            if (oracle.includes("hexproof") || oracle.includes("indestructible")) stats.protection++;

            // Detecta Arquétipo
            if (types.includes("equipment") || types.includes("aura")) stats.tags.voltron++;
            if (oracle.includes("sacrifice") || oracle.includes("dies")) stats.tags.aristocrats++;
            if (types.includes("instant") || types.includes("sorcery")) stats.tags.spellslinger++;
            if (oracle.includes("create") && oracle.includes("token")) stats.tags.tokens++;

            // Delay de segurança
            await new Promise(r => setTimeout(r, 75));

        } catch (e) {
            console.error("Erro na carta:", nomeLimpo);
            cartasFalhas.push(nomeLimpo);
        }
    }

    // FINALIZAÇÃO: Mesmo com erros, mostra o que conseguiu
    loading.classList.add('hidden');
    
    if (cartasFalhas.length > 0) {
        statusArea.innerHTML = `<div class="error-msg">⚠️ <strong>Análise Concluída com ressalvas:</strong><br>O Doutor não reconheceu ${cartasFalhas.length} cartas (Ex: ${cartasFalhas[0]}). As estatísticas refletem as cartas identificadas.</div>`;
    }

    exibirResultados(stats);
}

function exibirResultados(stats) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // Preenche os campos
    document.getElementById('res-commander').innerText = stats.commander || "Desconhecido";
    document.getElementById('res-color').innerText = stats.colors || "C";
    document.getElementById('res-cmc').innerText = stats.count > 0 ? (stats.cmcTotal / stats.count).toFixed(2) : "0";
    
    document.getElementById('stat-ramp').innerText = stats.ramp;
    document.getElementById('stat-draw').innerText = stats.draw;
    document.getElementById('stat-remocao').innerText = stats.removal;
    document.getElementById('stat-protecao').innerText = stats.protection;

    // Lógica de Arquétipo Principal
    let arq = "Midrange";
    const t = stats.tags;
    if (t.voltron > 6) arq = "Voltron";
    else if (t.aristocrats > 8) arq = "Aristocrats";
    else if (t.spellslinger > 12) arq = "Spellslinger";
    else if (t.tokens > 8) arq = "Tokens / Go Wide";
    else if (stats.ramp > 10 && (stats.cmcTotal/stats.count) > 3.4) arq = "Stompy / Ramp";
    
    document.getElementById('res-arquetipo').innerText = arq;

    // Power Level Simplificado
    let power = 4.0;
    if (stats.ramp > 9) power += 1.5;
    if (stats.draw > 9) power += 1.5;
    if (stats.removal > 7) power += 1.0;
    if (stats.count > 0 && (stats.cmcTotal/stats.count) < 3.2) power += 1.0;
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // Gráfico
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6+'],
            datasets: [{
                data: stats.curve,
                backgroundColor: '#818cf8',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}
