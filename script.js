let chart

function toggleMode(){

const mode=document.getElementById("inputMode").value

document.getElementById("deckLink").style.display=
mode==="moxfield"?"block":"none"

document.getElementById("deckList").style.display=
mode==="manual"?"block":"block":"none"

}

function clearAnalysis(){

document.getElementById("result").textContent="Resultado aparecerá aqui"

document.getElementById("deckLink").value=""
document.getElementById("deckList").value=""

if(chart) chart.destroy()

}

function normalizeMoxfieldLink(link){

link=link.trim()

if(!link.includes("http"))
link="https://"+link

const match=link.match(/moxfield\.com\/decks\/([A-Za-z0-9\-_]+)/)

return match?match[1]:null

}

function parseDeckList(raw){

const lines=raw.split("\n")

const list=[]

for(const line of lines){

const match=line.match(/^(\d+)\s(.+)/)

if(!match) continue

let qty=parseInt(match[1])

let name=match[2]

name=name.replace(/\(.*?\)/g,"")
name=name.replace(/[0-9]+$/,"")
name=name.trim()

list.push({name,qty})

}

return list

}

async function fetchScryfallBatch(names){

const response=await fetch("https://api.scryfall.com/cards/collection",{

method:"POST",
headers:{'Content-Type':'application/json'},

body:JSON.stringify({

identifiers:names.map(n=>({name:n}))

})

})

const data=await response.json()

const map={}

data.data.forEach(card=>{

map[card.name]={

type:card.type_line,
cmc:card.cmc,
text:(card.oracle_text||"").toLowerCase()

}

})

return map

}

function classify(card){

const t=card.text

if(t.includes("draw")) return "draw"

if(t.includes("search your library")) return "tutor"

if(t.includes("destroy target")||t.includes("exile target"))
return "removal"

if(t.includes("destroy all")||t.includes("each creature"))
return "boardwipe"

if(t.includes("add {")||t.includes("treasure"))
return "ramp"

return null

}

async function analyzeDeck(){

const result=document.getElementById("result")

result.textContent="Analisando..."

let list=[]

const mode=document.getElementById("inputMode").value

try{

if(mode==="manual"){

const raw=document.getElementById("deckList").value

list=parseDeckList(raw)

}else{

const link=document.getElementById("deckLink").value

const id=normalizeMoxfieldLink(link)

if(!id){

result.textContent="Link do Moxfield inválido"

return
}

const response=await fetch(`https://api.moxfield.com/v2/decks/${id}`)

if(!response.ok){

result.textContent="Erro ao acessar deck do Moxfield"
return
}

const data=await response.json()

Object.values(data.mainboard).forEach(card=>{

list.push({

name:card.card.name,
qty:card.quantity

})

})

}

if(list.length===0){

result.textContent="Nenhuma carta encontrada"

return

}

const unique=[...new Set(list.map(c=>c.name))]

const batch=await fetchScryfallBatch(unique)

let totals={cards:0,lands:0}

let roles={ramp:0,draw:0,removal:0,boardwipe:0,tutor:0}

let curve={"0-1":0,"2":0,"3":0,"4":0,"5+":0}

for(const entry of list){

const card=batch[entry.name]

if(!card) continue

const qty=entry.qty

totals.cards+=qty

if(card.type.includes("Land"))
totals.lands+=qty

const cmc=card.cmc

if(cmc<=1)curve["0-1"]+=qty
else if(cmc===2)curve["2"]+=qty
else if(cmc===3)curve["3"]+=qty
else if(cmc===4)curve["4"]+=qty
else curve["5+"]+=qty

const role=classify(card)

if(role)roles[role]+=qty

}

result.textContent=`

===== Contagem =====

Cartas totais: ${totals.cards}
Terrenos: ${totals.lands}

===== Estratégia =====

Ramp: ${roles.ramp}
Draw: ${roles.draw}
Removal: ${roles.removal}
Boardwipe: ${roles.boardwipe}
Tutors: ${roles.tutor}

===== Curva de Mana =====

0-1: ${curve["0-1"]}
2: ${curve["2"]}
3: ${curve["3"]}
4: ${curve["4"]}
5+: ${curve["5+"]}

`

drawChart(curve)

}catch(e){

result.textContent="Erro na análise"

console.error(e)

}

}

function drawChart(curve){

const ctx=document.getElementById("manaChart")

if(chart) chart.destroy()

chart=new Chart(ctx,{

type:"bar",

data:{

labels:["0-1","2","3","4","5+"],

datasets:[{

label:"Curva de Mana",

data:[
curve["0-1"],
curve["2"],
curve["3"],
curve["4"],
curve["5+"]
]

}]

}

})

}
