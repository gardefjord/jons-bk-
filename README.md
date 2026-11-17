# Jons BK

Jons BK:s sida. Statisk sajt som publiceras med GitHub Pages.

## Sidor
`index.html` (Start), `matcher.html`, `laget.html`. Gemensamt: `style.css`, `site.js`.

## Innehåll du kan redigera (direkt på GitHub, även från mobilen)
- `spelare.json`: spelarkort. Lägg till utmärkelser i `utnamningar`, t.ex. `["Årets hjärta 2026"]`. Varje kortserie ligger i `kort` med bild och siffror.
- `data.json`: matcher och tabell. Skrivs över automatiskt, ändra inte för hand. Varje match har id, resultat (walkover märkta), plats, tabellplacering före/efter matchdagen, förra mötet med motståndaren, motståndarens form och väder.

## Automatik
`.github/workflows/deploy.yml` körs var tredje timme: hämtar matcher och tabell från Korpen Stockholms öppna API (division 8346) och väder från [Open-Meteo](https://open-meteo.com/), sparar `data.json` och publicerar sidan. Inga inloggningar behövs.
Webbplatsen visas på https://gardefjord.github.io/jons-bk-/

## Matchsidor
Tryck på en match under Matcher (eller på startsidan) så öppnas matchen som en låda. Länk till en match: `matcher.html#m<id>`, där id är matchens id i `data.json`.
