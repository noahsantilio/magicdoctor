/**
 * MAGIC DOCTOR - Cérebro da Aplicação
 * Versão: 2.7
 * Status: Final Revisado com Suporte a Nomes Complexos
 */

let myChart = null;

// 1. FUNÇÃO DE LIMPEZA DE NOMES (Correção para o erro TLE 145)
function limparNomeDaCarta(linha) {
    // Remove a quantidade no início (ex: "1 ", "1x ")
    let nome = linha.replace(/^(\d+\s*[xX]?\s+)/, "");
    
    // Remove tags de coleção e números (ex: " (TLE) 145" ou " [M15]")
    // Corta no primeiro parêntese, colchete ou asterisco
    nome = nome.split('(')[0].split('[')[0].split('*')[0];
    
    // Remove números de colecionador que possam estar soltos no fim (ex: "145")
    nome = nome.replace(/\s+\d+$/, "");
    
    return nome.trim();
}

// 2. CONTADOR DE CARTAS EM TEMPO REAL (Mantido da v2.5)
document.getElementById('decklist').addEventListener('input', function() {
    const texto = this.value.trim();
    if (!texto) {
        document.getElementById('card-count').innerText = "0";
        return;
    }
    
    const linhas = texto.split('\n');
    let total = 0;
    
    linhas.forEach(linha => {
        const match = linha.match(/^(\d+)/);
        if (match) {
            total += parseInt(match[1]);
        } else if (linha.trim() !== "") {
            total += 1;
        }
    });
    
    document.getElementById('card-count').innerText = total;
});

// 3. FUNÇÃO LIMPAR TUDO
function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    document.getElementById('loading').classList.add('hidden');
    
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
}

// 4. FUNÇÃO PRINCIPAL DE ANÁLISE
async function analisarDeck() {
    const statusArea = document.getElementById('status-area');
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const listaTexto = document.getElementById('decklist').value;
    
    const linhas = listaTexto.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) {
        exibirErro("A lista está vazia! Cole seu deck para o Doutor analisar.");
        return;
    }

    // Preparação da tela
    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let deckData = {
        cmcTotal: 0,
        countNonLands: 0,
        curve: [0, 0, 0, 0, 0, 0, 0],
        ramp: 0,
        draw: 0,
        removal: 0,
        commander: "Identificando...",
        colors: ""
    };

    try {
        for (let i = 0; i < linhas.length; i++) {
            const nomeLimpo = limparNomeDaCarta(linhas[i]);
            
            // Pausa técnica para evitar bloqueio da API (Rate Limiting)
            if (i > 0 && i % 15 === 0) await new Promise(r => setTimeout(r, 100));

            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nomeLimpo)}`);
            
            if (!response.ok) {
                throw new Error(`Carta não encontrada: "${nomeLimpo}". Verifique se o nome está correto.`);
            }

            const data = await response.json();

            // O primeiro item da lista é considerado o Comandante
            if (i === 0) {
                deckData.commander = data.name;
                deckData.colors = (data.color_identity && data.color_identity.length > 0) 
                                  ? data.color_identity.join('') 
                                  : 'C';
            }

            // Análise de Curva (Ignora Terrenos)
            if (!data.type_line.includes("Land")) {
                let cmc = data.cmc || 0;
                deckData.cmcTotal += cmc;
                deckData.countNonLands++;
                let bucket = Math.min(Math.floor(cmc), 6);
                deckData.curve[bucket]++;
            }

            // Análise de Funções (Ramp, Draw, Removal)
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) deckData.ramp++;
            if (oracle.includes("draw")) deckData.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) deckData.removal++;
        }

        exibirResultados(deckData);

    } catch (err) {
        exibirErro(err.message);
    } finally {
        loading.classList.add('hidden');
    }
}

// 5. FUNÇÕES DE INTERFACE
function exibirErro(msg) {
    document.getElementById('status-area').innerHTML = `<div class="error-msg">❌ <strong>Erro no Diagnóstico:</strong><br>${msg}</div>`;
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
    
    // Lógica de Arquétipo
    let arq = "Midrange";
    if (data.ramp > 12) arq = "Stompy / Ramp";
    if (data.removal > 12) arq = "Control / Interativo";
    document.getElementById('res-arquetipo').innerText = arq;

    // ALGORITMO DE POWER LEVEL (v2.7)
    let power = 4.0;
    if (data.ramp > 10) power += 1.5;
    if (data.draw > 10) power += 1.5;
    if (parseFloat(mediaCmc) < 3.2) power += 1.5;
    if (data.removal > 8) power += 1.0;
    
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // Renderização do Gráfico
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6+'],
            datasets: [{
                data: data.curve,
                backgroundColor: '#818cf8',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
