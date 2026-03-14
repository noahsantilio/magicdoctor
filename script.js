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

async function analyzeDeck(){

const mode = document.getElementById("inputMode").value
const resultBox = document.getElementById("result")

let cards = []

try{

if(mode === "moxfield"){

const link = document.getElementById("deckLink").value

if(!link.includes("moxfield")){
alert("Use um link do Moxfield")
return
}

const deckID = link.split("/decks/")[1].split("?")[0]

resultBox.textContent = "Lendo deck..."

const response = await fetch(
`https://api.moxfield.com/v2/decks/all/${deckID}`
)

const data = await response.json()

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
quantity: parseInt(match[1]),
name: match[2],
type:"",
cmc:0
})

}

})

}

let totalCards = 0
let lands = 0
let ramp = 0
let draw = 0
let removal = 0

let cmcBuckets = {
"0-1":0,
"2":0,
"3":0,
"4":0,
"5+":0
}

const rampCards = [
"Sol Ring","Arcane Signet","Fellwar Stone",
"Cultivate","Kodama's Reach","Rampant Growth",
"Nature's Lore","Three Visits","Farseek"
]

const drawCards = [
"Harmonize","Rishkar's Expertise",
"Return of the Wildspeaker","Guardian Project",
"Beast Whisperer","Rhystic Study",
"Mystic Remora","Fact or Fiction"
]

const removalCards = [
"Swords to Plowshares","Path to Exile",
"Beast Within","Chaos Warp",
"Generous Gift","Cyclonic Rift"
]

cards.forEach(card => {

totalCards += card.quantity

if(card.type && card.type.includes("Land")){
lands += card.quantity
}

if(rampCards.includes(card.name)){
ramp += card.quantity
}

if(drawCards.includes(card.name)){
draw += card.quantity
}

if(removalCards.includes(card.name)){
removal += card.quantity
}

if(card.cmc !== undefined){

if(card.cmc <= 1) cmcBuckets["0-1"] += card.quantity
else if(card.cmc == 2) cmcBuckets["2"] += card.quantity
else if(card.cmc == 3) cmcBuckets["3"] += card.quantity
else if(card.cmc == 4) cmcBuckets["4"] += card.quantity
else cmcBuckets["5+"] += card.quantity

}

})

let warnings = []

if(totalCards !== 100){
warnings.push("Deck não tem exatamente 100 cartas")
}

if(lands < 34){
warnings.push("Poucos terrenos (ideal 34-38)")
}

if(ramp < 8){
warnings.push("Pouco ramp (ideal 8+)")
}

if(draw < 6){
warnings.push("Pouco card draw (ideal 6+)")
}

if(removal < 5){
warnings.push("Poucas remoções (ideal 5+)")
}

let powerScore = ramp + draw + removal

let powerLevel = "Casual"

if(powerScore > 25) powerLevel = "High Power"
else if(powerScore > 18) powerLevel = "Focused"
else if(powerScore > 12) powerLevel = "Mid Power"

resultBox.textContent = `

===== Estatísticas =====

Cartas totais: ${totalCards}

Terrenos: ${lands}
Ramp: ${ramp}
Card Draw: ${draw}
Remoções: ${removal}

===== Curva de Mana =====

CMC 0-1: ${cmcBuckets["0-1"]}
CMC 2: ${cmcBuckets["2"]}
CMC 3: ${cmcBuckets["3"]}
CMC 4: ${cmcBuckets["4"]}
CMC 5+: ${cmcBuckets["5+"]}

===== Power Level Estimado =====

${powerLevel}

===== Problemas Detectados =====

${warnings.length ? warnings.join("\n") : "Nenhum problema crítico detectado"}

`

}catch(error){

resultBox.textContent =
"Erro ao analisar o deck."

}

}
