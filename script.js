async function analyzeDeck(){

const link = document.getElementById("deckLink").value

if(!link.includes("moxfield")){
alert("Use um link do Moxfield")
return
}

const deckID = link.split("/decks/")[1]

const response = await fetch(
`https://api.moxfield.com/v2/decks/all/${deckID}`
)

const data = await response.json()

const cards = Object.values(data.mainboard)

let totalCards = 0

cards.forEach(card => {
totalCards += card.quantity
})

const decklist = cards
.map(card => card.quantity + " " + card.card.name)
.join("\n")

const result = `
Commander: ${data.commanders ? Object.values(data.commanders)[0].card.name : "Unknown"}

Total de cartas: ${totalCards}

Decklist:
${decklist}
`

document.getElementById("result").textContent = result

}
