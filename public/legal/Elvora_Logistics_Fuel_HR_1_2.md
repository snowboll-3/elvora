# Elvora Logistics — Vođenje goriva i maziva (HR.1.2)
_Ažurirano: 

## 1) Evidencija voznog parka (Master data)
- Interni ID (npr. CAK-TRK-012), Reg. oznaka (uz povijest), Tip (kamion/prikolica/kombi/viličar)
- Gorivo (Dizel/Benzin/LPG/AdBlue), Spremnik (L) + AdBlue spremnik (L)
- Norma potrošnje (L/100 km), Osovine/nosivost, Zadnja km, Status, Vlasništvo, Povezane zone
- Uvoz CSV flote + brzo dodavanje vozila u appu

## 2) Identifikacija unosa s terena (bez naljepnica)
- Vozač **slika registarsku tablicu** → AI OCR prepoznaje i veže vozilo
- Vozač **slika račun** s pumpe ili skenira QR s računa
- Elvora automatski čita: tip goriva, litara, €/L, ukupno, PDV, vrijeme, lokaciju
- Povezuje: vozilo, vozača (po loginu), rutu/smenu (ako postoji), GPS

## 3) Validacije i sigurnost
- Litara ≤ kapacitet spremnika (+5% tolerancije)
- €/L outlier (±15% prosjeka 7 dana) → **Review**
- Potrošnja > +25% norme u 3 uzastopna točenja → **Review**
- Duplikat računa (isti iznos ±5 min) → **Flag**
- Statusi: 🟢 OK · 🟡 Review · 🔴 Odbijeno

## 4) Računovodstvo i izvještaji
- Dnevni pregled: Reg, vozač, litara, €/L, ukupno, PDV, lokacija, račun (slika)
- Mjesečni obračun po vozilu/vozaču (PDF + CSV), auto-arhiva (cloud + lokalno)
- Fuel-card CSV import (INA/Crodux/Shell) → auto-match s fotkama
- Geolokacija pumpe (opcija) i Anomaly Report (top odstupanja)

## 5) Servisi, ulja i maziva (realna opcija)
- **Bez ručnog unosa količina ulja/maziva** — vozila idu na redovne servise
- Evidentira se **datum servisa i kilometraža** → podsjetnici (npr. za 20.000 km ili 6 mj)
- Status: 🟢 Servis odrađen · 🟡 U tijeku · 🔴 Kasni servis
- Računi servisa iz e-maila: automatsko vezivanje po registarskoj oznaci, arhiva u Transport > Servisni izvještaji

## 6) Uloge i prava
- Vozač: slika tablicu + račun; bez izmjena cijena
- Dispečer/Skladištar: pregled, Review/OK
- Voditelj/Direktor: odobri mjesečni obračun, export PDF/CSV
- Računovodstvo: read-only + preuzimanje izvještaja

## 7) Offline-first
- Unosi i fotke se spremaju lokalno bez signala; sinkronizacija kad signal postoji
- Cache poznatih tablica i internih ID-eva na uređaju

## 8) Privatnost i audit
- Svaka promjena logirana (tko/kad/što), PDF s hashom integriteta u footeru
