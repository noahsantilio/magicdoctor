function toggleInputMode(){

const mode = document.getElementById("inputMode").value
const linkField = document.getElementById("deckLink")
const listField = document.getElementById("deckList")

if(mode === "moxfield"){

linkField.style.display = "block"
listField.style.display = "none"

}else{

linkField.style.display = "none"
listField.style.display = "block"

}

}

function clearAnalysis(){

document.getElementById("result").textContent =
"Resultado aparecerá aqui"

document.getElementById("deckLink").value=""
document.getElementById("deckList").value=""

}

async function analyzeDeck(){

const mode = document.getElementById("inputMode").value
const resultBox = document.getElementById("result")

let cards = []
let commander = "Desconhecido"
let colors = []

try{

if(mode === "moxfield"){

const link = document.getElementById("deckLink").value.trim()

const match = link.match(/moxfield\.com\/decks\/([A-Za-z0-9\-_]+)/)

if(!match){
alert("Use um link válido do Moxfield")
return
}

const deckID = match[1]

resultBox.textContent="Lendo deck..."

const response = await fetch(
`https://api.moxfield.com/v2/decks/${deckID}`
)

if(!response.ok){
throw new Error()
}

const data = await response.json()

commander = data.commanders
? Object.values(data.commanders)[0].card.name
: "Não identificado"

colors = data.colorIdentity || []

cards = Object.values(data.mainboard).map(card => ({
name: card.card.name,
quantity: card.quantity,
type: card.card.type_line,
cmc: card.card.cmc
}))

}else{

const rawList = document.getElementById("deckList").value

const lines = rawList.split("\n")

lines.forEach(line=>{

const match = line.match(/^(\d+)\s(.+)/)

if(match){

cards.push({
quantity:parseInt(match[1]),
name:match[2],
type:"",
cmc:0
})

}

})

}

let totalCards=0
let lands=0
let creatures=0
let artifacts=0
let enchantments=0
let instants=0
let sorceries=0

cards.forEach(card=>{

totalCards+=card.quantity

if(card.type?.includes("Land")) lands+=card.quantity
if(card.type?.includes("Creature")) creatures+=card.quantity
if(card.type?.includes("Artifact")) artifacts+=card.quantity
if(card.type?.includes("Enchantment")) enchantments+=card.quantity
if(card.type?.includes("Instant")) instants+=card.quantity
if(card.type?.includes("Sorcery")) sorceries+=card.quantity

})

let warnings=[]

if(totalCards!==100){
warnings.push("Deck não tem exatamente 100 cartas")
}

if(lands<34){
warnings.push("Poucos terrenos (ideal 34-38)")
}

resultBox.textContent=`

===== Informações do Deck =====

Commander: ${commander}

Cores: ${colors.join(", ") || "Desconhecido"}

Cartas totais: ${totalCards}

===== Tipos de Carta =====

Criaturas: ${creatures}
Artefatos: ${artifacts}
Encantamentos: ${enchantments}
Instantâneas: ${instants}
Feitiços: ${sorceries}
Terrenos: ${lands}

===== Problemas Detectados =====

${warnings.length ? warnings.join("\n") : "Nenhum problema crítico detectado"}

`

}catch(error){

resultBox.textContent =
"Erro ao analisar o deck. Verifique se o link está correto e se o deck é público."

}

}
