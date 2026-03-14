async function analyzeDeck(){

const result=document.getElementById("result")

result.textContent="Analisando..."

let deckCards=[]

// =================
// PARSE LISTA
// =================

const raw=document.getElementById("deckList").value

const lines=raw.split("\n")

for(const line of lines){

const match=line.match(/^(\d+)\s(.+)/)

if(!match)continue

let qty=parseInt(match[1])
let name=match[2].replace(/\(.*?\)/g,"").trim()

deckCards.push({name,qty})

}

// =================
// BUSCA SCRYFALL
// =================

const names=[...new Set(deckCards.map(c=>c.name))]

const response=await fetch(
"https://api.scryfall.com/cards/collection",
{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
identifiers:names.map(n=>({name:n}))
})
}
)

const data=await response.json()

const cardDB={}

data.data.forEach(card=>{

cardDB[card.name]={

text:(card.oracle_text||"").toLowerCase(),
type:card.type_line,
cmc:card.cmc

}

})

// =================
// COMBOS
// =================

let foundCombos=[]

for(const combo of combos){

let found=true

for(const piece of combo.cards){

if(!deckCards.find(c=>c.name===piece))
found=false

}

if(found)foundCombos.push(combo.name)

}

// =================
// ARQUÉTIPOS
// =================

let archetypeScores={}

for(const key in archetypes){

archetypeScores[key]=0

for(const card of deckCards){

const info=cardDB[card.name]

if(!info)continue

for(const keyword of archetypes[key]){

if(info.text.includes(keyword))
archetypeScores[key]+=card.qty

}

}

}

// =================
// POWER LEVEL
// =================

let powerScore=0

if(foundCombos.length>0)
powerScore+=2

if(archetypeScores.stax>5)
powerScore+=2

let powerLevel="Casual"

if(powerScore>=2)powerLevel="Focused"
if(powerScore>=4)powerLevel="High Power"

// =================
// RESULTADO
// =================

result.innerHTML=`

Power Level:
<span class="tooltip" title="Baseado em combos, stax e densidade de estratégia">
${powerLevel}
</span>

Combos Detectados:
${foundCombos.join(", ")||"Nenhum"}

Arquétipos:

${Object.entries(archetypeScores)
.sort((a,b)=>b[1]-a[1])
.slice(0,3)
.map(a=>a[0]+" ("+a[1]+")")
.join("\n")}

`

}
