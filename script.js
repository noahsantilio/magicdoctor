let myChart = null;

// Contador de cartas
document.getElementById('decklist').addEventListener('input', function() {
    const texto = this.value.trim();
    if (!texto) { document.getElementById('card-count').innerText = "0"; return; }
    const linhas = texto.split('\n');
    let total = 0;
    linhas.forEach(l => {
        const match = l.match(/^(\d+)/);
        total += match ? parseInt(match[1]) : 1;
    });
    document.getElementById('card-count').innerText = total;
});

// FUNÇÃO LIMPAR (Ponto 4)
function limparTudo() {
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    document.getElementById('loading').classList.add('hidden');
    if (myChart) myChart.destroy();
}

async function analisarDeck() {
    const campoTexto = document.getElementById('decklist');
    const statusArea = document.getElementById('status-area');
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    
    const linhas = campoTexto.value.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) {
        exibirErro("A lista está vazia! Cole seu deck antes de analisar.");
        return;
    }

    // Reset de tela
    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    let deckData = {
        cmcTotal: 0,
        count: 0,
        curve: [0,0,0,0,0,0,0],
        ramp: 0, draw: 0, removal: 0,
        commander: "Desconhecido",
        colors: ""
    };

    try {
        for (let i = 0; i < linhas.length; i++) {
            const nome = linhas[i].replace(/^\d+\s+/, '').trim();
            
            // Busca no Scryfall
            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nome)}`);
            
            if (!response.ok) {
                throw new Error(`Carta não encontrada: "${nome}". Verifique a grafia.`);
            }

            const data = await response.json();

            // Processa Comandante (1ª linha)
            if (i === 0) {
                deckData.commander = data.name;
                deckData.colors = data.color_identity.join('') || 'C';
            }

            // Curva e CMC
            if (!data.type_line.includes("Land")) {
                let cmc = data.cmc || 0;
                deckData.cmcTotal += cmc;
                deckData.count++;
                let bucket = Math.min(Math.floor(cmc), 6);
                deckData.curve[bucket]++;
            }

            // Tags de Poder
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            if (oracle.includes("add") || oracle.includes("search") && oracle.includes("land")) deckData.ramp++;
            if (oracle.includes("draw")) deckData.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) deckData.removal++;
        }

        // Sucesso: Preencher UI
        exibirResultados(deckData);

    } catch (err) {
        exibirErro(`Ocorreu um problema na análise: ${err.message}`);
    } finally {
        loading.classList.add('hidden');
    }
}

function exibirErro(msg) {
    const area = document.getElementById('status-area');
    area.innerHTML = `<div class="error-msg">❌ <strong>Erro:</strong> ${msg}</div>`;
}

function exibirResultados(data) {
    document.getElementById('resultados').classList.remove('hidden');
    document.getElementById('res-commander').innerText = data.commander;
    document.getElementById('res-color').innerText = data.colors;
    document.getElementById('res-cmc').innerText = (data.cmcTotal / data.count).toFixed(2);
    document.getElementById('stat-ramp').innerText = data.ramp;
    document.getElementById('stat-draw').innerText = data.draw;
    document.getElementById('stat-remocao').innerText = data.removal;

    // Cálculo Power Level
    let power = 4.0;
    if (data.ramp > 10) power += 1.5;
    if (data.draw > 10) power += 1.5;
    if ((data.cmcTotal / data.count) < 3.0) power += 1.0;
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // Gráfico
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0','1','2','3','4','5','6+'],
            datasets: [{
                label: 'Cartas',
                data: data.curve,
                backgroundColor: '#818cf8',
                borderRadius: 10
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { 
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
