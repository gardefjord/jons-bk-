# Jons BK

Jons BK:s sida. Statisk sajt som publiceras med GitHub Pages.

## Sidor
`index.html` (Start), `matcher.html`, `laget.html`, `galleri.html`, `om-oss.html`. Gemensamt: `style.css`, `site.js`.

## Innehåll du kan redigera (direkt på GitHub, även från mobilen)
- `spelare.json`: spelarkort. Lägg till utmärkelser i `utnamningar`, t.ex. `["Årets hjärta 2026"]`. Varje kortserie ligger i `kort` med bild och siffror.
- `galleri.json`: bilder till galleriet. Lägg bilden i `assets/foton/` och en rad i filen.
- `data.json`: matcher och tabell. Skrivs över automatiskt, ändra inte för hand.

## Automatik
`.github/workflows/deploy.yml` körs var tredje timme: hämtar matcher och tabell från Korpen Stockholms öppna API (division 8346), sparar `data.json` och publicerar sidan. Inga inloggningar behövs.
Webbplatsen visas på https://gardefjord.github.io/jons-bk-/
