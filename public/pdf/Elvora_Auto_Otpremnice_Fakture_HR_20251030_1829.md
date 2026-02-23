# Elvora — Auto Otpremnice & Fakture (HR)

## Cilj
Elvora automatski obrađuje **e-mail narudžbe** za svaki market zasebno, generira **Otpremnice (DN)** i **Fakture (INV)**, priprema **listu utovara** i šalje dokumente tek nakon **odobrenja** voditelja ili skladištara.

## Dnevni tok (sažetak)
1) **Ulaz mailova** → forward na orders+ORG@elvora.app.  
2) **Parser** (CSV/XLS/PDF/OCR) → narudžbe u “Market queue” (STO-001, STO-002…).  
3) **Spajanje po marketu** (više mailova u jednu dnevnu narudžbu).  
4) **Alokacija zalihe** → status: full / partial (razlika = backorder).  
5) **Generiraj DRAFT**: DN (obavezno) i INV (po politici).  
6) **Pregled za voditelja/skladištara**: spremno / partial / review.  
7) **Odobri** → **pošalji**: DN marketu + CC računovodstvo; INV marketu (ili po isporuci) + CC računovodstvo.  
8) **Raspodjela po kamionima**: lista utovara i rute.  
9) **Knjiženje**: DN → minus zaliha; INV → promet.  
10) **Backorder** ostaje vidljiv za sljedeću isporuku.

## Statusi dokumenata
- draft (autogenerirano), pproved (odobreno), sent (poslano), on_hold (stop s razlogom).

## Politike
- **DN**: odmah nakon alokacije ili nakon odobrenja.  
- **INV**: odmah s DN ili nakon potvrde isporuke.  
- **Auto-send** dopušten samo za narudžbe bez upozorenja, u prozoru rada.  
- **Dvojno odobrenje** za visoke iznose (opcija).

## Mail rutiranje
- **DN →** 
arudzbe@market.hr **+ CC:** acunovodstvo@vasadomena.hr  
- **INV →** akture@market.hr (ili po isporuci) **+ CC:** acunovodstvo@vasadomena.hr  
- **Sažetak voditelju** (1× dnevno): poslano / on-hold / backorder.

## Greške & iznimke
- Nepoznat SKU → “Mapiraj na naš SKU” (pamti se).  
- Manjak → partial DN + backorder DN.  
- Nečitljiv ulaz → “Review” s originalnim prilogom.

## Uloge
- **Radnik skladišta**: pick, prijava razlika.  
- **Skladištar/Voditelj**: pregled, **Odobri & pošalji**, dodjela kamionu, hold.  
- **Računovodstvo**: prima sve DN/INV, export.  
- **Vozač**: manifest, QR potvrda utovar/istovar.

## Minimalne tablice (sažeto)
- purchase_orders_inbox, orders, order_items,  
  delivery_notes, invoices,  
  inventory_reservations, inventory_movements,  
  (logistika) oute_manifests, ehicle_loads.

## Mobilna aplikacija (nadzor)
- Home: **Spremno**, **Partial/Backorder**, **Review**.  
- Akcije: **Odobri & pošalji sve bez upozorenja**, Odobri po marketu, **On hold** (razlog), **Dodijeli kamionu**.  
- Push: “X marketa poslano”, “Y čeka review”.

