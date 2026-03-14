let chart

function toggleInputMode(){

const mode=document.getElementById("inputMode").value

document.getElementById("deckLink").style.display =
mode==="moxfield"?"block":"none"

document.getElementById("deckList").style.display =
mode==="manual"?"block":"none"

}

function clearAnalysis(){

document.getElementById("result").textContent="Resultado aparecerá aqui"

document.getElementById("deckLink").value=""
document.getElementById("deckList").value=""

if(chart){
chart.destroy()
}

}

async function fetchCardData(name){

try{

const response=await fetch(
`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
)

if(!response.ok) return null

return await response.json()

}catch{

return null

}

}

async function analyzeDeck(){

const mode=document.getElementById("inputMode").value
const resultBox=document.getElementById("result")

let cards=[]
let commander="Desconhecido"
let colors=[]
let cmcBuckets={"0-1":0,"2":0,"3":0,"4":0,"5+":0}

resultBox.textContent="Analisando deck..."

try{

if(mode==="moxfield"){

const link=document.getElementById("deckLink").value.trim()

const match=link.match(/moxfield\.com\/decks\/([A-Za-z0-9\-_]+)/)

if(!match){
resultBox.textContent="Link do Moxfield inválido."
return
}

const deckID=match[1]

const response=await fetch(`https://api.moxfield.com/v2/decks/${deckID}`)

const data=await response.json()

commander=data.commanders
?Object.values(data.commanders)[0].card.name
:"Não identificado"

colors=data.colorIdentity||[]

cards=Object.values(data.mainboard).map(card=>({
name:card.card.name,
quantity:card.quantity,
type:card.card.type_line,
cmc:card.card.cmc
}))

}else{

const rawList=document.getElementById("deckList").value.trim()

if(!rawList){
resultBox.textContent="Cole uma lista de deck."
return
}

const lines=rawList.split("\n")

for(const line of lines){

const match=line.match(/^(\d+)\s(.+)/)

if(!match) continue

const quantity=parseInt(match[1])

let name=match[2]

name=name.replace(/\(.*?\)/g,"").trim()

const cardData=await fetchCardData(name)

if(cardData){

cards.push({
name:name,
quantity:quantity,
type:cardData.type_line,
cmc:cardData.cmc
})

}

}

}

let totalCards=0
let lands=0
let creatures=0
let artifacts=0
let enchantments=0
let instants=0
let sorceries=0

for(const card of cards){

totalCards+=card.quantity

if(card.type.includes("Land")) lands+=card.quantity
if(card.type.includes("Creature")) creatures+=card.quantity
if(card.type.includes("Artifact")) artifacts+=card.quantity
if(card.type.includes("Enchantment")) enchantments+=card.quantity
if(card.type.includes("Instant")) instants+=card.quantity
if(card.type.includes("Sorcery")) sorceries+=card.quantity

let cmc=card.cmc

if(cmc<=1) cmcBuckets["0-1"]+=card.quantity
else if(cmc===2) cmcBuckets["2"]+=card.quantity
else if(cmc===3) cmcBuckets["3"]+=card.quantity
else if(cmc===4) cmcBuckets["4"]+=card.quantity
else cmcBuckets["5+"]+=card.quantity

}

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

===== Curva de Mana =====

0-1: ${cmcBuckets["0-1"]}
2: ${cmcBuckets["2"]}
3: ${cmcBuckets["3"]}
4: ${cmcBuckets["4"]}
5+: ${cmcBuckets["5+"]}

===== Problemas Detectados =====

${warnings.length ? warnings.join("\n") : "Nenhum problema crítico detectado"}

`

drawChart(cmcBuckets)

}catch(error){

resultBox.textContent="Erro ao analisar deck."

}

}

function drawChart(data){

const ctx=document.getElementById("manaCurveChart")

if(chart) chart.destroy()

chart=new Chart(ctx,{
type:"bar",
data:{
labels:["0-1","2","3","4","5+"],
datasets:[{
label:"Curva de Mana",
data:[
data["0-1"],
data["2"],
data["3"],
data["4"],
data["5+"]
]
}]
}
})

}
