# Vaatimusmäärittely: Shift Assignment App

## Yleiskuvaus

Shift Assignment App on selainpohjainen sovellus, joka jakaa työvuorot IT-tuen valvojille ladattujen CSV-tiedostojen perusteella. Sovellus toimii täysin paikallisesti selaimessa, eikä se tallenna tietoja palvelimelle. Sovellus on suunniteltu toimimaan GitHub Pages -ympäristössä.

---

## Toiminnalliset vaatimukset

### 1. Tiedostojen lataus
- Käyttäjä voi ladata kaksi CSV-tiedostoa:
  - **Valvojien tiedot**: sisältää valvojien saatavuuden ja muut tiedot.
  - **Koepäivien tiedot**: sisältää kokeiden aikataulut ja resurssitarpeet.
- Sovellus tarkistaa tiedostojen oikean muodon ja ilmoittaa virheistä.
- Käyttäjä voi esikatsella ladattujen tiedostojen sisältöä ennen jatkamista.

### 2. Työvuorojen jakaminen
- Sovellus jakaa työvuorot seuraavien sääntöjen mukaisesti:
  - Yhdelle valvojalle voi tulla vain yksi vuoro per päivä.
  - Jokaisessa vuorossa on oltava vähintään määritelty määrä valvojia.
  - Valvojille annetaan vähintään kolme vuoroa, ja ylimääräiset vuorot jaetaan osallistujamäärien suhteessa.
  - Valvojia, joilla on aiempaa kokemusta tai hyvä ruotsinkielen taito, suositaan ylimääräisissä vuoroissa.
  - Valvojat sijoitetaan halleihin osallistujamäärien suhteessa. Halleja voi olla useampi kuin yksi, ja niiden nimet voivat vaihdella.
  - Valvojia ei saa sijoittaa vuoroihin, joissa he ovat jäävejä.
  - Valvojien vuorotoiveet otetaan huomioon, mutta niitä ei ole pakko toteuttaa, jos minimimäärät täyttyvät muuten.
  - Valvojia ei saa sijoittaa vuoroihin, jolloin he eivät ole käytettävissä.
  - Yli 6 tuntia kestävissä vuoroissa valvojille varataan 30 minuutin ruokatauko kokeen aikana.
  - **Työvuoro B:n tiedot ovat vapaaehtoisia**, ja jos niitä ei ole määritelty, vain työvuoro A otetaan huomioon.

### 3. Hallintapaneeli
- Käyttäjä voi määrittää hallintapaneelissa:
  - Lukuarvon "Keskustaan varattavat", joka määrittää valvojien määrän, jotka varataan keskustaan. Näistä valvojista luodaan erillinen raportti.
- Hallintapaneeli näyttää yhteenvedon valvojien sijoittelusta.

### 4. Raportointi
- Sovellus mahdollistaa seuraavien raporttien lataamisen:
  - Päivittäiset työvuorolistat.
  - Valvojakohtaiset työvuorolistat.
  - Keskustaan varattujen valvojien lista.

---

## Ei-toiminnalliset vaatimukset

- Sovellus toimii täysin paikallisesti selaimessa ilman palvelinpuolen käsittelyä.
- Sovellus on yhteensopiva GitHub Pages -ympäristön kanssa.
- Käyttöliittymä on käyttäjäystävällinen ja selkeä.

---

## CSV-tiedostojen rakenne

**Huomio**: Kaikissa CSV-tiedostoissa käytetään erottimena puolipistettä (`;`).

### Valvojien tiedot
| Sarake               | Kuvaus                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| Sukunimi             | Valvojan sukunimi                                                     |
| Etunimi              | Valvojan etunimi                                                     |
| Päivämäärät (DD.MM.YYYY) | Päivät, jolloin valvoja on käytettävissä. Sarakkeita voi olla useita, ja niiden otsikot ovat muotoa DD.MM.YYYY. |
| Ruotsinkielen taito  | Valvojan ruotsinkielen taito (Äidinkieli, Kiitettävä, jne.)           |
| Valvonut aikaisemmin | Onko valvoja valvonut aiemmin (Checked/Unchecked)                    |
| Sijoitus             | Valvojan sijoitus (Messukeskus, Keskustakampus tai Keskustakampus / Messukeskus)                      |
| Jääviydet            | Kokeet, joissa valvoja on jäävi (esim A).                      |
| Vuorotoiveet         | Valvojan toive tietystä vuorosta (esim. 02.05.2025 10:30-12:30)              |

**Tietosisältö**:
- **Sukunimi ja Etunimi**: Tekstimuotoisia tietoja.
- **Päivämäärät**: Päivämäärät muodossa DD.MM.YYYY, joissa valvoja on käytettävissä.
- **Ruotsinkielen taito**: Tekstimuotoinen arvio. Vaihtoehdot "Äidinkieli", "Kiitettävä", "Hyvä", "Tyydyttävä", "Välttävä" ja "Ei osaamista".
- **Valvonut aikaisemmin**: Boolean-arvo (Checked/Unchecked).
- **Sijoitus**: Tekstimuotoinen tieto. Vaihtoehdot: "Messukeskus", "Keskustakampus / Messukeskus" tai "Keskustakampus".
- **Jääviydet**: Lista koekoodeista, joissa valvoja on jäävi. Kokeet erotellaan välilyönnillä.
- **Vuorotoiveet**: Lista valvojan toivomista vuoroista muodossa "DD:MM:YYYY HH:MM-HH:MM"

### Koepäivien tiedot
| Sarake                  | Kuvaus                                                             |
|--------------------------|-------------------------------------------------------------------|
| Päivä                   | Koepäivä (DD.MM.YYYY)                                            |
| Koe klo                 | Kokeen aikaväli (HH:MM-HH:MM)                                    |
| Valintakokeen nimi      | Kokeen nimi                                                      |
| Koekoodi                | Kokeen koodi (esim. A)                                           |
| Osallistujat yhteensä   | Osallistujien kokonaismäärä                                      |
| Halli X osallistujat    | Osallistujien määrä kussakin hallissa (Halleja voi olla useampi) |
| Työvuoro A klo          | Työvuoro A:n aikaväli (HH:MM-HH:MM)                              |
| Työvuoro A hlömäärä     | Työvuoro A:n minimivalvojamäärä                                  |
| Työvuoro B klo          | *(Vapaaehtoinen)* Työvuoro B:n aikaväli (HH:MM-HH:MM)            |
| Työvuoro B hlömäärä     | *(Vapaaehtoinen)* Työvuoro B:n minimivalvojamäärä                |

**Tietosisältö**:
- **Päivä**: Päivämäärä muodossa DD.MM.YYYY.
- **Koe klo**: Aikaväli muodossa HH:MM-HH:MM.
- **Valintakokeen nimi ja Koekoodi**: Tekstimuotoisia tietoja.
- **Osallistujat yhteensä**: Kokonaisluku.
- **Halli X osallistujat**: Kokonaislukuja, yksi sarake per halli.
- **Työvuoro A/B klo**: Aikaväli muodossa HH:MM-HH:MM.
- **Työvuoro A/B hlömäärä**: Kokonaislukuja, jotka määrittävät minimivalvojamäärän.

---

## Käyttöohjeet

1. Lataa sovellus ja avaa `index.html` selaimessa.
2. Lataa valvojien ja koepäivien CSV-tiedostot sovellukseen.
3. Määritä tarvittavat asetukset hallintapaneelissa.
4. Tarkastele valvojien sijoittelua ja lataa raportit tarvittaessa.

---

## Jatkokehitys

- Lisää mahdollisuus muokata valvojien ja kokeiden tietoja suoraan käyttöliittymässä.
- Toteuta tuki useammille kielille.
- Paranna algoritmia, jotta se huomioi entistä paremmin valvojien toiveet ja rajoitteet.