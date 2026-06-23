# VUORO – Käyttöohjeet

**VUORO** (Valintakokeiden organisointialgoritmi ja resurssien ohjaaja) on Helsingin yliopiston hakijapalveluiden käyttöön suunniteltu selainpohjainen sovellus. Sen avulla hallitaan valvojien työvuoroja valintakoepäivinä ja tuotetaan tarvittavat raportit ja palkkalaskelmat.

---

## Sisällysluettelo

1. [Sovelluksen avaaminen](#1-sovelluksen-avaaminen)
2. [Näkymät](#2-näkymät)
3. [Tulostus-näkymä](#3-tulostus-näkymä)
   - [Syötetiedoston rakenne (Messukeskus)](#syötetiedoston-rakenne-messukeskus)
   - [Syötetiedoston rakenne (Keskusta)](#syötetiedoston-rakenne-keskusta)
   - [Vuorojen lataaminen ja esikatselu](#vuorojen-lataaminen-ja-esikatselu)
   - [Taukojen asettaminen](#taukojen-asettaminen)
   - [Vuorojen tarkistus](#vuorojen-tarkistus)
   - [CSV-vienti](#csv-vienti)
   - [Valvojaluetteloiden vienti PDF-muotoon](#valvojaluetteloiden-vienti-pdf-muotoon)
   - [Työvuorolistojen vienti PDF-muotoon](#työvuorolistojen-vienti-pdf-muotoon)
4. [Palkkalaskelma-näkymä](#4-palkkalaskelma-näkymä)
5. [Kieliasetus](#5-kieliasetus)
6. [Konfiguraatiotiedostot](#6-konfiguraatiotiedostot)
7. [Tiedostomuotojen yhteenveto](#7-tiedostomuotojen-yhteenveto)
8. [Virheilmoitukset ja validointi](#8-virheilmoitukset-ja-validointi)

---

## 1. Sovelluksen avaaminen

Sovellus löytyy osoitteesta <https://muukkto.github.io/vuoro/>

> **Huomio paikallisen version avaamisesta kehitystarkoituksiin** Sovellus hakee konfiguraatiotiedostoja suhteellisilla poluilla. Jos avaat tiedostot suoraan tiedostojärjestelmästä (`file://`), selain saattaa estää tiedostojen lataamisen CORS-rajoituksen vuoksi. Suositellaan käyttämään paikallista web-palvelinta (esim. `python -m http.server`).

---

## 2. Näkymät

| Näkymä | Tarkoitus |
|--------|-----------|
| **[Tulostus](https://muukkto.github.io/vuoro/index.html)** | Vuorojen lataus, esikatselu, taukojen asettaminen, validointi ja PDF/CSV-vienti |
| **[Palkkalaskelma](https://muukkto.github.io/vuoro/pay_check.html)** | Työtuntien laskenta ja palkkalaskelmien vienti PDF-muotoon |

---

## 3. Tulostus-näkymä

### Syötetiedoston rakenne (Messukeskus)

Messukeskuksen valvojien ja IT-valvojien vuorot ladataan **CSV- tai Excel-tiedostosta** (`.csv`, `.xlsx`, `.xls`), jossa on seuraavat pakolliset sarakkeet:

| Sarake | Kuvaus |
|--------|--------|
| `First Name` | Etunimi |
| `Last Name` | Sukunimi |
| `Nickname` | Kutsumanimi |
| `Email` | Sähköpostiosoite |
| `Haka_id` | Haka-tunniste (muoto: `tunnus@organisaatio.fi`) |
| `Language Skill` | Ruotsin kielen taito: `äidinkieli`, `kiitettävä`, `hyvä`, `tyydyttävä`, `välttävä` tai `ei osaamista` |
| `Previous Experience` | Aiempi kokemus: `Kyllä` tai `En` |
| `Disqualifications` | Jääviydet pilkulla eroteltuna (esim. `A, B`). Tyhjä jos ei jääviyyksiä. |
| `AVAILABILITY_PP.KK.VVVV` | Saatavuussarakkeet päivämäärittäin (esim. `AVAILABILITY_01.06.2026`): arvo `Kyllä` tai `Checked` tarkoittaa saatavilla. |

Kutakin **koekoodi-saraketta** (esim. `A`, `B`, `C`) kohti voi olla seuraavat lisäsarakkeet:

| Sarake | Kuvaus | Esimerkki |
|--------|--------|--------|
| `[KOODI]` | Vuoron aikaväli muodossa `HH:MM-HH:MM` | *07:00-15:00* |
| `[KOODI]-Hall` | Salin nimi (voidaan käyttää myös roolilistojen tulostamiseen) | *7A* tai *Opastajat* |
| `[KOODI]-Break` | Tauon aikaväli muodossa `HH:MM-HH:MM` (valinnainen) | *10:00-10:30* |
| `[KOODI]-Information` | Lisätiedot (valinnainen) | *7A1 sektoriviestijä* |

Jokainen valvoja muodostaa tiedostossa **yhden rivin**.

**Esimerkki tiedoston rakenteesta:**

| First Name | Last Name | Nickname | Email | Haka_id | Language Skill | Previous Experience | Disqualifications | AVAILABILITY_01.06.2026 | A | A-Hall | A-Break | A-Information | ... |
|------------|-----------|----------|-------|---------|----------------|---------------------|-------------------|-------------------------|---|--------|---------|---------------|---|
| Maija Maria | Meikäläinen | Maija | maija.meikalainen@helsinki.fi | maija@helsinki.fi | hyvä | Kyllä | B | Kyllä | 08:00-16:00 | 6B | 11:30-12:00 | 6B2 tunnistaja  | ... |

---

### Syötetiedoston rakenne (Keskusta)

Messukeskuksen valvojien ja IT-valvojien vuorot ladataan **CSV- tai Excel-tiedostosta** (`.csv`, `.xlsx`, `.xls`), jossa on seuraavat sarakkeet:

| Sarake | Kuvaus | Esimerkki |
|--------|--------|--------|
| `Supervisor` | Valvojan nimi | *Maija Meikäläinen* |
| `Exam` | Koekoodin | *A* |
| `Building` | Rakennus | *Porthania* |
| `Room` | Huone | *Sali 1* |
| `Information` | Lisätiedot | *IT-valvoja* tai *Tauottaja* |
| `Shift-start` | Vuoron alkamisaika `HH:MM` | *08:30* |
| `Shift-end` | Vuoron päättymisaika `HH:MM` | *15:00* |
| `Break-start` | Tauon alkamisaika `HH:MM` (valinnainen) | *11:00* |
| `Language Skill` | Ruotsin kielen taito (x jos löytyy) | *x* |
| `Email` | Sähköpostiosoite | *maija.meikalainen@helsinki.fi* |
| `Haka_id` | Haka-tunniste (tunnus@organisaatio.fi) | *maija@helsinki.fi* |
| `Disqualifications` | Jääviydet pilkulla eroteltuna (esim. `A, B`). Tyhjä jos ei jääviyyksiä. | *A, C* |

Jokainen työvuoro muodostaa tiedostossa **yhden rivin**.

---

### Vuorojen lataaminen ja esikatselu

1. Valitse **rooli** pudotusvalikosta:
   - **Messukeskus valvojat** – Messukeskuksen tenttikoordinaattorit
   - **Messukeskus IT-valvojat** – Messukeskuksen IT-tuki
   - **Keskusta valvojat** – Keskustan kampuksen valvojat
   - **Keskusta IT-valvojat** – Keskustan kampuksen IT-tuki
2. Valitse CSV- tai Excel-tiedosto **"Lataa vuorot"** -kentästä.
3. Paina **"Lataa ja esikatsele"** -painiketta.
   - Tiedosto validoidaan automaattisesti. Virheistä ilmoitetaan hälytysikkunassa.
   - Onnistuneen latauksen jälkeen näkyviin tulevat esikatselu- ja vientitoiminnot.

4. Tarkastele vuoroja kahdessa eri näkymässä:
   - **"Näytä vuorot valvojittain"** – listaa kunkin valvojan kaikki vuorot
   - **"Näytä vuorot kokeittain"** – listaa kunkin koepäivän valvojat

---

### Taukojen asettaminen

Paina **"Aseta tauot"** -painiketta, kun vuorot on ladattu.

- Tauot lasketaan automaattisesti niille valvojille, joiden vuoro kestää **yli 6 tuntia**.
- Valvojat jaetaan taukoryhmiin tasaisesti salin ja vuoron pituuden perusteella.
- Tauko on 30 minuuttia.
- Jos taukoja on jo asetettu, sovellus pyytää vahvistuksen uudelleenasettamiselle.

---

### Vuorojen tarkistus

Paina **"Tarkista vuorot"** -painiketta (oranssi) havaitaksesi mahdolliset ongelmat:

| Tarkistustyyppi | Kuvaus |
|----------------|--------|
| **Saatavuus** | Vuoro on päivänä, jolle valvoja ei ole ilmoittautunut saatavilla |
| **Päällekkäisyys** | Valvojalla on samaan aikaan kaksi päällekkäistä vuoroa |
| **Jääviys** | Valvoja on merkitty jääväksi kokeeseen, johon hänellä on vuoro |
| **Puuttuva tauko** | Yli 6 tuntia kestävä vuoro ilman taukoa |
| **Liian vähän vuoroja** | Valvojalla on alle 6 vuoroa |

Tulokset näytetään ryhmiteltyinä ongelmatyypin mukaan lomakkeen alla.

---

### CSV-vienti

Paina **"Vie vuorot CSV-tiedostoon"** viedäksesi nykyisen vuorojaon CSV-muotoon.

- Tiedosto ladataan nimellä `shifts_export.csv`.
- Tiedosto sisältää kaikki valvoja- ja vuorotiedot, mukaan lukien tauot.
- **Huom.** CSV-vienti ei ole käytettävissä Keskusta-rooleilla.

---

### Valvojaluetteloiden vienti PDF-muotoon

1. Valitse **koe** pudotusvalikosta (tai "Kaikki kokeet").
2. Jos valitsit yksittäisen kokeen, valitse haluttu **halli** tai järjestämistapa:
   - **Kaikki valvojat** – kaikki valvojat yhdessä listassa
   - **Kaikki halleittain** – erillinen sivu per halli
   - **Kaikki aakkosjärjestyksessä** – valvojat aakkostettu sukunimen mukaan, jaettuna noin 60 hengen sivuille
3. Kaikkien kokeiden kohdalla voit valita **"Järjestä halleittain"** -valintaruudun.
4. Paina **"Vie valvojaluettelot PDF-tiedostoon"**.
   - Tiedosto latautuu PDF-muodossa suoraan selaimesta.

---

### Työvuorolistojen vienti PDF-muotoon

1. Kirjoita haluttu **lisäteksti taulukon alle** tekstikenttään (valinnainen).
2. Paina **"Vie työvuorot yksittäisiin PDF-tiedostoihin"**.
   - Sovellus luo kullekin valvojalle oman PDF-tiedoston.
   - Tiedostot pakataan automaattisesti ZIP-arkistoon ja ladataan selaimesta.

---

## 4. Palkkalaskelma-näkymä

Palkkalaskelma-näkymässä (`pay_check.html`) lasketaan valvojien maksettavat työtunnit.

### Käyttövaiheet

1. Lataa **vuorotiedosto** (sama CSV/Excel kuin Tulostus-näkymässä) painamalla "Lataa ja esikatsele".
2. Tarkastele työtunteja valvojakohtaisesti painamalla **"Näytä työtunnit valvojittain"**.
3. Muokkaa tarvittaessa **ohjetekstiä palkkalaskelmaan** (oletustekstinä on yhteystietoja koskeva ohje).
4. Vie palkkalaskelmat:
   - **"Vie yhteenveto palkkalaskelmista"** – yksittäinen PDF/Excel kaikista valvojista
   - **"Vie palkkalaskelmat yksittäisiin PDF-tiedostoihin"** – ZIP-arkisto, jossa kullekin valvojalle oma PDF

### Palkkalaskelman sisältö

Kunkin valvojan PDF sisältää:
- Valvojan nimi
- Taulukon kaikista vuoroista: päivämäärä, koekoodi, vuoron aikaväli, tauko, **maksettavat tunnit**, lisätiedot

---

## 5. Kieliasetus

Tulostus-näkymässä voit vaihtaa käyttöliittymän kielen sivun yläosasta:

- **Suomi** (oletus)
- **English**

Kielenvaihto päivittää kaikki käyttöliittymän tekstit dynaamisesti.

---

## 6. Konfiguraatiotiedostot

Sovellus lukee konfiguraatiotiedostot hakemistosta `src/conf/`:

| Tiedosto | Kuvaus |
|----------|--------|
| `exam_information.csv` | Kokeiden nimet, koodit, päivämäärät ja kellonajat. **Muokattava ennen käyttöä.** |
| `validation-schema.json` | Messukeskuksen tiedoston validointisäännöt |
| `validation-schema-keskusta.json` | Keskustan tiedoston validointisäännöt |

### exam_information.csv -tiedoston rakenne

```
Date;Time;Name;Code;
01.06.2026;09:00-12:00;Valintakoe A;A;
```

| Sarake | Kuvaus |
|--------|--------|
| `Date` | Kokeen päivämäärä muodossa `PP.KK.VVVV` |
| `Time` | Kokeen aikaväli muodossa `HH:MM-HH:MM` |
| `Name` | Kokeen koko nimi |
| `Code` | Lyhytkoodi, jota käytetään vuorotiedostossa sarakenimissä |

---

## 7. Tiedostomuotojen yhteenveto

| Toiminto | Syötetiedosto | Tulostiedosto |
|----------|--------------|--------------|
| Vuorojen lataus (Messukeskus) | CSV / Excel | – |
| Vuorojen lataus (Keskusta) | CSV / Excel | – |
| CSV-vienti | – | `shifts_export.csv` |
| Valvojaluettelot | – | PDF (yhdistetty) |
| Työvuorolistat | – | ZIP (PDF per valvoja) |
| Palkkalaskelmat | CSV / Excel | ZIP (PDF per valvoja) tai yhteenveto PDF |

---

## 8. Virheilmoitukset ja validointi

Sovellus validoi ladatun tiedoston automaattisesti ennen käsittelyä. Yleisimmät virheet:

| Virhe | Syy ja ratkaisu |
|-------|----------------|
| `First Name` tai `Last Name` puuttuu | Pakollinen sarake on tyhjä tai puuttuu kokonaan tiedostosta |
| Sähköpostin muoto on virheellinen | Tarkista `Email`-sarakkeen arvo |
| Haka_id on virheellisessä muodossa | Muodon tulee olla `tunnus@organisaatio.fi` |
| Virheellinen arvo `Language Skill` | Sallitut arvot: `äidinkieli`, `kiitettävä`, `hyvä`, `tyydyttävä`, `välttävä`, `ei osaamista` |
| Aikamuoto on virheellinen | Vuorojen tulee olla muodossa `HH:MM-HH:MM` |
| Jääviydet virheellisessä muodossa | Käytä pilkulla ja välilyönnillä eroteltua koodilistaa, esim. `A, B` |

Jos validointi epäonnistuu, sovellus näyttää hälytysikkunan, jossa listataan enintään 20 ensimmäistä virhettä.
