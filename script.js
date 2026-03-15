let myChart = null;

// Contador de linhas
document.getElementById('decklist').addEventListener('input', function() {
    const linhas = this.value.split('\n').filter(l => l.trim() !== "");
    document.getElementById('card-count').innerText = linhas.length;
});

async function analisarDeck() {
    const texto = document.getElementById('decklist').value;
    const linhas = texto.split('\n').filter(l => l.trim() !== "");
    if (linhas.length === 0) return alert("Cole sua lista!");

    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    const alertsContainer = document.getElementById('alerts-container');
    
    loading.classList.remove('hidden');
    resultados.classList.add('hidden');
    alertsContainer.innerHTML = "";

    let totalCmc = 0;
    let cmcCount = 0;
    let curve = [0,0,0,0,0,0,0]; // 0 a 6+
    let categories = { ramp: 0, draw: 0, interaction: 0 };
    let types = {};
    let commanderColorIdentity = [];

    // Verificação de 100 cartas
    if (linhas.length !== 100) {
        alertsContainer.innerHTML += `<div class="alert">⚠️ O deck possui ${linhas.length} cartas. O padrão de Commander são 100.</div>`;
    }

    // Processamento via Scryfall (Exemplo de lógica para as primeiras 15 cartas para performance)
    // Em um cenário real, você faria um loop controlado
    for (let i = 0; i < linhas.length; i++) {
        const nomeCarta = linhas[i].replace(/^\d+\s+/, '').trim();
        
        try {
            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nomeCarta)}`);
            const data = await response.json();

            if (data.status === 404) continue;

            // 1. Curva de Mana
            let cmc = data.cmc || 0;
            totalCmc += cmc;
            cmcCount++;
            let bucket = Math.min(Math.floor(cmc), 6);
            curve[bucket]++;

            // 2. Tags/Categorias (Ponto 2 do seu pedido)
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            if (oracle.includes("add") && data.type_line.includes("Artifact") || oracle.includes("search") && oracle.includes("land")) categories.ramp++;
            if (oracle.includes("draw")) categories.draw++;
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) categories.interaction++;

            // 3. Tipos
            let mainType = data.type_line.split('—')[0].trim();
            types[mainType] = (types[mainType] || 0) + 1;

            if (i === 0) {
                document.getElementById('res-commander').innerText = data.name;
                commanderColorIdentity = data.color_identity;
                document.getElementById('res-color').innerText = commanderColorIdentity.join('') || 'C';
            }

        } catch (e) { console.error("Erro na carta: " + nomeCarta); }
    }

    // Preencher Interface
    loading.classList.add('hidden');
    resultados.classList.remove('hidden');
    
    document.getElementById('res-cmc').innerText = (totalCmc / cmcCount).toFixed(2);
    document.getElementById('stat-ramp').innerText = categories.ramp + " fontes";
    document.getElementById('stat-draw').innerText = categories.draw + " motores";
    document.getElementById('stat-remocao').innerText = categories.interaction + " cartas";
    
    // Cálculo de Power Level (Ponto 4)
    let power = 4.0;
    if (categories.ramp > 10) power += 1.5;
    if (categories.draw > 10) power += 1.5;
    if (totalCmc / cmcCount < 3.0) power += 1.0;
    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1) + "/10";

    gerarGrafico(curve);
}

function gerarGrafico(dados) {
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6+'],
            datasets: [{
                label: 'Cartas por CMC',
                data: dados,
                backgroundColor: '#3498db'
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function limpar() {
    location.reload();
}
