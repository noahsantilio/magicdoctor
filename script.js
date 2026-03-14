async function analyzeDeck(){

const link = document.getElementById("deckLink").value
const resultBox = document.getElementById("result")

if(!link.includes("moxfield")){
alert("Use um link do Moxfield")
return
}

try{

const deckID = link.split("/decks/")[1].split("?")[0]

resultBox.textContent = "Lendo deck..."

const response = await fetch(
`https://api.moxfield.com/v2/decks/all/${deckID}`
)

const data = await response.json()

const cards = Object.values(data.mainboard)

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
"Sol Ring","Arcane Signet","Fellwar Stone","Talisman of Progress",
"Cultivate","Kodama's Reach","Rampant Growth","Nature's Lore",
"Three Visits","Farseek","Skyshroud Claim","Explosive Vegetation"
]

const drawCards = [
"Harmonize","Rishkar's Expertise","Return of the Wildspeaker",
"Guardian Project","Beast Whisperer","Toski, Bearer of Secrets",
"Phyrexian Arena","Rhystic Study","Mystic Remora",
"Fact or Fiction","Wheel of Fortune"
]

const removalCards = [
"Swords to Plowshares","Path to Exile","Beast Within",
"Chaos Warp","Generous Gift","Anguished Unmaking",
"Vindicate","Cyclonic Rift","Rapid Hybridization",
"Pongify","Assassin's Trophy"
]

cards.forEach(card => {

totalCards += card.quantity

if(card.card.type_line.includes("Land")){
lands += card.quantity
}

if(rampCards.includes(card.card.name)){
ramp += card.quantity
}

if(drawCards.includes(card.card.name)){
draw += card.quantity
}

if(removalCards.includes(card.card.name)){
removal += card.quantity
}

const cmc = card.card.cmc

if(cmc <= 1) cmcBuckets["0-1"] += card.quantity
else if(cmc == 2) cmcBuckets["2"] += card.quantity
else if(cmc == 3) cmcBuckets["3"] += card.quantity
else if(cmc == 4) cmcBuckets["4"] += card.quantity
else cmcBuckets["5+"] += card.quantity

})

const commander =
data.commanders ?
Object.values(data.commanders)[0].card.name :
"Unknown"

let warnings = []

if(totalCards != 100){
warnings.push("Deck não tem exatamente 100 cartas")
}

if(lands < 34){
warnings.push("Poucos terrenos (recomendado 34-38)")
}

if(ramp < 8){
warnings.push("Pouco ramp (recomendado 8+)")
}

if(draw < 6){
warnings.push("Pouco card draw (recomendado 6+)")
}

if(removal < 5){
warnings.push("Poucas remoções (recomendado 5+)")
}

let powerScore = 0

powerScore += ramp
powerScore += draw
powerScore += removal

let powerLevel = "Casual"

if(powerScore > 25) powerLevel = "High Power"
else if(powerScore > 18) powerLevel = "Focused"
else if(powerScore > 12) powerLevel = "Mid Power"

resultBox.textContent = `

Commander: ${commander}

Cartas totais: ${totalCards}

===== Estatísticas =====

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
"Erro ao ler o deck. Verifique se o link é válido e público."

}

}
