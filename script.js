/**
 * MAGIC DOCTOR v3.0
 * Atualização: Fuzzy Search & String Sanitizer
 */

let myChart = null;

// 1. LIMPEZA AVANÇADA DE NOMES
function sanitizarNome(linha) {
    if (!linha) return "";
    
    // Remove a quantidade inicial (ex: "1x ", "1 ")
    let nome = linha.trim().replace(/^(\d+\s*[xX]?\s+)/, "");
    
    // Remove qualquer coisa entre parênteses, colchetes ou depois de asteriscos
    // Ex: "Toph (TLE) 145" -> "Toph"
    nome = nome.replace(/\(.*?\)/g, "");
    nome = nome.replace(/\[.*?\]/g, "");
    nome = nome.replace(/\*+/g, "");

    // Remove números de colecionador soltos no final da linha (ex: " 145")
    nome = nome.replace(/\s+\d+$/, "");

    return nome.trim();
}

// 2. CONTADOR DE CARTAS (Versão 2.5/3.0)
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

// 3. FUNÇÃO LIMPAR
function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    document.getElementById('loading').classList.add('hidden');
    if (myChart) { myChart.destroy(); myChart = null; }
}

// 4. ANÁLISE COM BUSCA FUZZY (ALTERNATIVA PARA CORREÇÃO DE ERRO)
async function analisarDeck() {
    const statusArea = document.getElementById('status-area');
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const loadingText = document.getElementById('loading-text');
    
    const linhas = document.getElementById('decklist').value.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) { exibirErro("A lista está vazia!"); return; }

    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let deckData = { cmcTotal: 0, countNonLands: 0, curve: [0,0,0,0,0,0,0], ramp: 0, draw: 0, removal: 0, commander: "", colors: "" };

    try {
        for (let i = 0; i < linhas.length; i++) {
            const nomeParaBusca = sanitizarNome(linhas[i]);
            if (!nomeParaBusca) continue;

            loadingText.innerText = `Analisando (${i+1}/${linhas.length}): ${nomeParaBusca}`;

            // USANDO 'FUZZY' EM VEZ DE 'EXACT' PARA EVITAR ERROS DE CARACTERES ESPECIAIS
            const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nomeParaBusca)}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`O Doutor não encontrou: "${nomeParaBusca}". Tente remover códigos de coleção desta linha.`);
            }

            const data = await response.json();

            // Comandante é a primeira carta válida
            if (!deckData.commander) {
                deckData.commander = data.name;
                deckData.colors = (data.color_identity && data.color_identity.length > 0) ? data.color_identity.join('') : 'C';
            }

            // Estatísticas
            if (!data.type_line.includes("Land")) {
                let cmc = data.cmc || 0;
                deckData.cmcTotal += cmc;
                deckData.countNonLands++;
                deckData.curve[Math.min(Math.floor(cmc), 6)]++;
            }

            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) deckData.ramp++;
            if (oracle.includes("draw")) deckData.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) deckData.removal++;

            // Respeitar limite da API
            await new Promise(r => setTimeout(r, 70));
        }

        exibirResultados(deckData);

    } catch (err) {
        exibirErro(err.message);
    } finally {
        loading.classList.add('hidden');
    }
}

function exibirErro(msg) {
    document.getElementById('status-area').innerHTML = `<div class="error-msg">❌ <strong>Erro:</strong><br>${msg}</div>`;
}

function exibirResultados(data) {
    document.getElementById('resultados').classList.remove('hidden');
    document.getElementById('res-commander').innerText = data.commander;
    document.getElementById('res-color').innerText = data.colors;
    
    const mediaCmc = data.countNonLands > 0 ? (data.cmcTotal / data.countNonLands).toFixed(2) : "0";
    document.getElementById('res-cmc').innerText = mediaCmc;
    
    document.getElementById('stat-ramp').innerText = data.ramp + " fontes";
    document.getElementById('stat-draw').innerText = data.draw + " cartas";
    document.getElementById('stat-remocao').innerText = data.removal + " cartas";
    document.getElementById('res-arquetipo').innerText = data.ramp > 12 ? "Stompy / Ramp" : "Midrange";

    // Algoritmo de Poder v3.0
    let p = 4.0;
    if (data.ramp > 11) p += 1.5;
    if (data.draw > 10) p += 1.5;
    if (parseFloat(mediaCmc) < 3.2) p += 1.5;
    if (data.removal > 8) p += 1.0;
    
    document.getElementById('stat-power').innerText = Math.min(p, 10).toFixed(1);

    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0','1','2','3','4','5','6+'],
            datasets: [{ label: 'Cartas', data: data.curve, backgroundColor: '#818cf8', borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } }, plugins: { legend: { display: false } } }
    });
}
