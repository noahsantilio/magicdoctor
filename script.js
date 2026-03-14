let chart

// ============================
// MINI BANCO DE CARTAS
// ============================

const localCardDB = {

"Sol Ring":{type:"Artifact",cmc:1,role:"ramp"},
"Arcane Signet":{type:"Artifact",cmc:2,role:"ramp"},
"Cultivate":{type:"Sorcery",cmc:3,role:"ramp"},
"Rampant Growth":{type:"Sorcery",cmc:2,role:"ramp"},
"Lightning Greaves":{type:"Artifact",cmc:2,role:"protection"},
"Swiftfoot Boots":{type:"Artifact",cmc:2,role:"protection"},
"Beast Whisperer":{type:"Creature",cmc:4,role:"draw"},
"Guardian Project":{type:"Enchantment",cmc:4,role:"draw"},
"Command Tower":{type:"Land",cmc:0},
"Forest":{type:"Land",cmc:0},
"Island":{type:"Land",cmc:0},
"Mountain":{type:"Land",cmc:0},
"Swamp":{type:"Land",cmc:0},
"Plains":{type:"Land",cmc:0}

}

// ============================
// CACHE
// ============================

function getCache(){

const cache = localStorage.getItem("cardCache")

return cache ? JSON.parse(cache) : {}

}

function saveCache(cache){

localStorage.setItem("cardCache",JSON.stringify(cache))

}

// ============================
// BUSCA Scryfall em lote
// ============================

async function fetchCardsBatch(names){

const response = await fetch(
"https://api.scryfall.com/cards/collection",
{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
identifiers:names.map(n=>({name:n}))
})
}
)

const data = await response.json()

const result={}

data.data.forEach(card=>{

result[card.name]={
type:card.type_line,
cmc:card.cmc,
text:card.oracle_text || ""
}

})

return result

}

// ============================
// CLASSIFICAÇÃO ESTRATÉGICA
// ============================

function classifyCard(card){

const text=(card.text || "").toLowerCase()

if(text.includes("search your library")) return "tutor"

if(text.includes("draw")) return "draw"

if(text.includes("destroy target") || text.includes("exile target")) return "removal"

if(text.includes("destroy all") || text.includes("each creature")) return "boardwipe"

if(text.includes("add {") || text.includes("treasure")) return "ramp"

return null

}

// ============================
// ANALISAR DECK
// ============================

async function analyzeDeck(){

const mode=document.getElementById("inputMode").value
const resultBox=document.getElementById("result")

resultBox.textContent="Analisando deck..."

let cardList=[]

// ============================
// PEGAR LISTA
// ============================

if(mode==="manual"){

const raw=document.getElementById("deckList").value
const lines=raw.split("\n")

for(const line of lines){

const match=line.match(/^(\d+)\s(.+)/)
if(!match) continue

const qty=parseInt(match[1])
const name=match[2].replace(/\(.*?\)/g,"").trim()

cardList.push({name,qty})

}

}else{

const link=document.getElementById("deckLink").value
const match=link.match(/decks\/([A-Za-z0-9\-_]+)/)

if(!match){

resultBox.textContent="Link inválido"
return

}

const deckID=match[1]

const response=await fetch(`https://api.moxfield.com/v2/decks/${deckID}`)
const data=await response.json()

Object.values(data.mainboard).forEach(card=>{

cardList.push({
name:card.card.name,
qty:card.quantity
})

})

}

// ============================
// BUSCA DADOS
// ============================

const cache=getCache()
const missing=[]
const cardData={}

for(const entry of cardList){

if(localCardDB[entry.name]){

cardData[entry.name]=localCardDB[entry.name]

}else if(cache[entry.name]){

cardData[entry.name]=cache[entry.name]

}else{

missing.push(entry.name)

}

}

// ============================
// BUSCA API
// ============================

if(missing.length){

const apiData=await fetchCardsBatch(missing)

Object.keys(apiData).forEach(name=>{

cardData[name]=apiData[name]
cache[name]=apiData[name]

})

saveCache(cache)

}

// ============================
// ANALISE
// ============================

let totals={
cards:0,
lands:0
}

let roles={
ramp:0,
draw:0,
removal:0,
boardwipe:0,
tutor:0,
protection:0,
wincon:0
}

let cmcBuckets={"0-1":0,"2":0,"3":0,"4":0,"5+":0}

for(const entry of cardList){

const info=cardData[entry.name]

if(!info) continue

const qty=entry.qty

totals.cards+=qty

if(info.type.includes("Land")) totals.lands+=qty

let cmc=info.cmc || 0

if(cmc<=1) cmcBuckets["0-1"]+=qty
else if(cmc===2) cmcBuckets["2"]+=qty
else if(cmc===3) cmcBuckets["3"]+=qty
else if(cmc===4) cmcBuckets["4"]+=qty
else cmcBuckets["5+"]+=qty

let role=info.role || classifyCard(info)

if(role && roles[role]!==undefined){

roles[role]+=qty

}

}

// ============================
// RESULTADO
// ============================

let warnings=[]

if(totals.cards!==100) warnings.push("Dec
