/**
 * MAGIC DOCTOR - Cérebro da Aplicação
 * Versão: 2.5
 */

let myChart = null;

// 1. ATUALIZAÇÃO DO CONTADOR EM TEMPO REAL
document.getElementById('decklist').addEventListener('input', function() {
    const texto = this.value.trim();
    if (!texto) {
        document.getElementById('card-count').innerText = "0";
        return;
    }
    
    const linhas = texto.split('\n');
    let total = 0;
    
    linhas.forEach(linha => {
        // Tenta capturar o número no início da linha (ex: "1 Sol Ring")
        const match = linha.match(/^(\d+)/);
        if (match) {
            total += parseInt(match[1]);
        } else if (linha.trim() !== "") {
            // Se não tem número mas tem texto, assume que é 1 carta
            total += 1;
        }
    });
    
    document.getElementById('card-count').innerText = total;
});

// 2. FUNÇÃO PARA LIMPAR TUDO (REDEFINIÇÃO TOTAL)
function limparTudo() {
    // Limpa campo de texto e contador
    document.getElementById('decklist').value = "";
    document.getElementById('card-count').innerText = "0";
    
    // Esconde resultados e mensagens
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('status-area').innerHTML = "";
    document.getElementById('loading').classList.add('hidden');
    
    // Destrói o gráfico se ele existir para não sobrepor na próxima análise
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
}

// 3. FUNÇÃO PRINCIPAL DE ANÁLISE
async function analisarDeck() {
    const campoTexto = document.getElementById('decklist');
    const statusArea = document.getElementById('status-area');
    const loading = document.getElementById('loading');
    const resultados = document.getElementById('resultados');
    
    // Divide o texto em linhas e remove espaços vazios
    const linhas = campoTexto.value.split('\n').filter(l => l.trim() !== "");
    
    if (linhas.length === 0) {
        exibirErro("A lista está vazia! Por favor, cole seu deck para iniciar o diagnóstico.");
        return;
    }

    // Reset visual para nova análise
    statusArea.innerHTML = "";
    resultados.classList.add('hidden');
    loading.classList.remove('hidden');

    // Estrutura de dados para a análise
    let deckData = {
        cmcTotal: 0,
        countNonLands: 0,
        curve: [0, 0, 0, 0, 0, 0, 0], // Índices de 0 a 6+ de mana
        ramp: 0,
        draw: 0,
        removal: 0,
        commander: "Não Identificado",
        colors: ""
    };

    try {
        for (let i = 0; i < linhas.length; i++) {
            // LIMPEZA DO NOME: Remove quantidade (1x) e códigos de expansão (TLE)
            let nomeOriginal = linhas[i];
            let nomeLimpo = nomeOriginal.replace(/^\d+\s*[xX]?\s+/, '') // Remove "1 " ou "1x "
                                       .split('(')[0]                  // Remove "(TLE) 145"
                                       .trim();

            // Chamada à API Scryfall
            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nomeLimpo)}`);
            
            if (!response.ok) {
                // Se a carta não for encontrada, o processo para e avisa o usuário
                throw new Error(`O Doutor não conhece a carta: "${nomeLimpo}". Verifique a grafia.`);
            }

            const data = await response.json();

            // O Comandante é sempre a primeira linha da lista
            if (i === 0) {
                deckData.commander = data.name;
                deckData.colors = (data.color_identity && data.color_identity.length > 0) 
                                  ? data.color_identity.join('') 
                                  : 'C (Incolor)';
            }

            // Análise de Curva de Mana (Apenas para não-terrenos)
            if (!data.type_line.includes("Land")) {
                let cmc = data.cmc || 0;
                deckData.cmcTotal += cmc;
                deckData.countNonLands++;
                
                // Agrupa no gráfico: 0, 1, 2, 3, 4, 5, e 6 ou mais
                let bucket = Math.min(Math.floor(cmc), 6);
                deckData.curve[bucket]++;
            }

            // Identificação de Funções (Ramp, Draw, Remoção) via Oracle Text
            const oracle = data.oracle_text ? data.oracle_text.toLowerCase() : "";
            
            // Lógica para Ramp
            if (oracle.includes("add") || (oracle.includes("search") && oracle.includes("land"))) {
                deckData.ramp++;
            }
            // Lógica para Draw
            if (oracle.includes("draw")) {
                deckData.draw++;
            }
            // Lógica para Remoção/Interação
            if (oracle.includes("destroy") || oracle.includes("exile") || oracle.includes("counter target")) {
                deckData.removal++;
            }
        }

        // Tudo certo! Exibir resultados na tela
        exibirResultados(deckData);

    } catch (err) {
        // Caso ocorra erro de API ou nome de carta
        exibirErro(err.message);
    } finally {
        // Esconde o loading independente de sucesso ou erro
        loading.classList.add('hidden');
    }
}

// 4. FUNÇÕES AUXILIARES
function exibirErro(msg) {
    const area = document.getElementById('status-area');
    area.innerHTML = `<div class="error-msg">❌ <strong>Erro de Diagnóstico:</strong><br>${msg}</div>`;
}

function exibirResultados(data) {
    document.getElementById('resultados').classList.remove('hidden');
    
    // Preenche Informações Gerais
    document.getElementById('res-commander').innerText = data.commander;
    document.getElementById('res-color').innerText = data.colors;
    
    // Cálculo do CMC Médio
    const mediaCmc = data.countNonLands > 0 ? (data.cmcTotal / data.countNonLands).toFixed(2) : "0";
    document.getElementById('res-cmc').innerText = mediaCmc;

    // Define Arquétipo baseado na estratégia
    let arq = "Midrange / Adaptativo";
    if (data.ramp > 14) arq = "Ramp / Big Spells";
    if (data.removal > 12) arq = "Control / Interativo";
    document.getElementById('res-arquetipo').innerText = arq;

    // Preenche Performance
    document.getElementById('stat-ramp').innerText = data.ramp + " fontes";
    document.getElementById('stat-draw').innerText = data.draw + " cartas";
    document.getElementById('stat-remocao').innerText = data.removal + " cartas";

    // CÁLCULO DE POWER LEVEL (Algoritmo Magic Doctor)
    let power = 4.0;
    if (data.ramp > 10) power += 1.5;
    if (data.draw > 10) power += 1.5;
    if (data.removal > 8) power += 1.0;
    if (parseFloat(mediaCmc) < 3.2 && parseFloat(mediaCmc) > 0) power += 1.5;
    if (data.commander.includes("Toph")) power += 0.5; // Sinergia temática

    document.getElementById('stat-power').innerText = Math.min(power, 10).toFixed(1);

    // GERAÇÃO DO GRÁFICO
    const ctx = document.getElementById('manaChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6+'],
            datasets: [{
                label: 'Cartas',
                data: data.curve,
                backgroundColor: '#818cf8',
                hoverBackgroundColor: '#c084fc',
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { weight: 'bold' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
