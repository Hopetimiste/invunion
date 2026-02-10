# Open Banking (EU) — PSD2 / AISP — Parcours “agrégateur → AISP” (Slovénie)

> Objectif: documenter le chemin pour **récupérer comptes + transactions (AIS)** en Europe
> en démarrant avec un **agrégateur** (Tink / Salt Edge / Plaid / etc.), puis, si besoin, en
> devenant **AISP** avec une autorité “home” en **Slovénie**.
>
> **Disclaimer**: ceci n’est pas un avis juridique. Valider avec un cabinet spécialisé + la **Banka Slovenije**
> (et, plus tard, les autorités “host” via passporting).

## 1) Glossaire (rapide)

- **PSD2**: directive UE qui encadre les services de paiement et l’accès aux données de compte via API.
- **TPP** (*Third Party Provider*): acteur tiers régulé qui se connecte aux banques.
- **AISP (AIS)** (*Account Information Service Provider*): statut/service permettant la **lecture**
  des infos de comptes (comptes, soldes, transactions), avec consentement client.
- **PISP**: initiation de paiement (hors scope ici).
- **RTS SCA**: règles de sécurité (authentification forte + communication sécurisée).
- **eIDAS**: cadre UE des certificats qualifiés; en pratique, beaucoup de banques exigent des certificats
  qualifiés pour l’authentification/identification des TPP.
- **QWAC / QSealC**: certificats qualifiés (auth TLS / “seal”).
- **EBA Register**: registre européen que les banques consultent souvent pour vérifier qu’un TPP est autorisé.
- **“Home” vs “Host”**: l’autorité **home** (ici Slovénie) autorise; le **passporting** notifie les pays **host**
  (FR/DE/AT/HR…).

## 2) Démarrer avec un agrégateur (recommandé au début)

### Pourquoi (en pratique)
- **Time-to-market**: tu lances le produit sans porter le fardeau régulatoire complet.
- **Fiabilité**: un agrégateur mature gère un “long tail” de banques et les variations d’implémentation PSD2.
- **Ops**: ils absorbent une partie de l’onboarding banque par banque, du support, des incidents récurrents.

### Ce que ça implique pour toi
- Tu n’es généralement **pas** le TPP auprès des banques: l’agrégateur est AISP (ou PI/EMI selon le cas).
- Tes obligations restent fortes sur:
  - **RGPD** (données personnelles possibles dans les libellés/contreparties, même si tes clients sont “pros”).
  - **Sécurité** (chiffrement, contrôle d’accès, logs, secrets, etc.).
  - **Consentement** (UX, information, preuve) — souvent contractualisé avec l’agrégateur.

### Reco d’architecture produit (utile pour la suite)
Même avec un agrégateur, implémenter une couche “provider abstraction” côté backend:
- `Provider` (Tink / Salt Edge / …)
- `Connection` (consent + état + dates + last_sync)
- `Account` (IBAN, devise, type)
- `Transaction` (id stable, booking date, amount, currency, remittance info, contreparties, etc.)

Objectif: pouvoir changer de fournisseur, et/ou ajouter un “fallback provider”, sans réécrire le produit.

## 3) Quand passer “direct” en AISP ?

En général quand tu as:
- **Volume** suffisant (sinon le coût régul/ops est disproportionné).
- Besoin de **contrôle** (qualité/latence, champs spécifiques, monitoring fin).
- Besoin de **réduire le risque** fournisseur (dépendance business / pricing / change of terms).
- Un segment banques/pays où l’agrégateur ne tient pas tes SLA.

## 4) Parcours AISP avec “home country” Slovénie (Banka Slovenije)

### 4.1 Pré-requis (substance)
Si tu veux que la Slovénie soit ton “home”:
- **Entité UE/EEE** + **substance locale** (dirigeants/ops — le fait de résider en Slovénie aide beaucoup).
- Gouvernance: responsabilités claires (direction, sécurité, conformité, risque, sous-traitance).
- Capacité à produire et maintenir des politiques/procédures à jour.

### 4.2 Dossier AISP (ce que tu dois être capable d’expliquer/démontrer)
Checklist typique (à adapter aux attentes exactes de la Banka Slovenije):
- **Programme d’activité**:
  - services AIS (quels endpoints / quelles données / quelles limites)
  - clients visés (B2B), pays visés (FR/DE/AT/SI/HR)
  - modèle opérationnel (support, incidents, SLA)
- **Gouvernance & contrôles**:
  - organisation, délégations, contrôle interne
  - politique de sous-traitance (cloud, agrégateur “fallback”, etc.)
- **Sécurité / RTS SCA**:
  - IAM (MFA admin, moindre privilège), segmentation, chiffrement au repos/en transit
  - journalisation et traçabilité (audit logs)
  - gestion vulnérabilités (patch, SAST/DAST si possible), gestion secrets
  - continuité (BCP/DRP), sauvegardes et tests de restauration
  - détection et réponse à incident (runbooks, astreinte)
- **Consentement**:
  - preuve du consentement (qui/quoi/quand), révocation
  - gestion des expirations et **re-consent** (souvent ~90 jours selon banques)
  - parcours SCA (redirections, callbacks, erreurs)
- **RGPD**:
  - minimisation des données, rétention
  - DPIA (souvent requis en pratique pour ce type de traitement)
  - droits des personnes, sous-traitants (DPA), localisation et transferts

### 4.3 Assurance obligatoire
Mettre en place une **assurance responsabilité professionnelle (PII)** couvrant l’activité AISP
(montants/périmètre à cadrer avec un courtier + les exigences du régulateur).

### 4.4 Process d’autorisation (haut niveau)
1. **Pré-échange** (recommandé): clarifier scope, documents, attentes.
2. **Dépôt** du dossier AISP auprès de la **Banka Slovenije**.
3. **Allers-retours**: questions, compléments, ajustements.
4. **Autorisation / enregistrement**: tu deviens AISP “home” Slovénie.
5. **Passporting** vers les pays cibles (FR/DE/AT/HR) via notification “home → host”.

### 4.5 “Go live” technique (le vrai chantier)
Après autorisation, il faut réussir l’intégration bancaire en pratique:
- **Certificats eIDAS**: obtenir **QWAC + QSealC** via un **QTSP** (prestataire de confiance qualifié)
  et les utiliser selon les exigences des banques (mTLS, signature, etc.).
- **Hétérogénéité API**: même “PSD2”, les implémentations varient (champs, erreurs, limitations, fenêtres d’historique).
- **Ops & monitoring**:
  - métriques par banque (taux de succès connexion, refresh, latence)
  - alerting sur erreurs “consent expired”, “SCA required”, “rate limited”, etc.
  - stratégie de retry + idempotence + dédoublonnage des transactions

## 5) Trajectoire recommandée (agrégateur → AISP) — jalons

### Phase A — MVP (agrégateur)
- Lancer avec 1 agrégateur (et éventuellement un plan “fallback”).
- Construire l’abstraction provider et les métriques de fiabilité par banque/pays.

### Phase B — “AISP readiness” (parallèle)
- Écrire et appliquer les politiques (sécurité, incidents, consent, RGPD).
- Mettre en place logs/audit, gestion secrets, BCP/DRP.
- Préparer DPIA + contractualisation sous-traitants (cloud, etc.).

### Phase C — Dossier + autorisation AISP (Slovénie)
- Pré-échange + dépôt du dossier.
- Souscription PII.
- Préparation eIDAS (QTSP, certificats, environnements).

### Phase D — Hybride (recommandé au début)
- “Direct banques” sur un sous-ensemble critique + agrégateur en fallback
  (le temps de stabiliser pays/banques).

## 6) Points d’attention spécifiques à la réconciliation bancaire (B2B)

- **Qualité des libellés / remittance info**: c’est souvent le facteur #1 de réussite de matching.
- **IDs stables**: éviter les doublons et permettre une sync incrémentale fiable.
- **Données personnelles involontaires**: même en B2B, les transactions peuvent contenir des identifiants de particuliers
  (noms, IBAN, référence) → RGPD, minimisation, rétention.

## 7) Liens utiles (à valider / compléter)

- Bank of Slovenia (Banka Slovenije): `https://www.bsi.si/`
- EBA Register: `https://www.eba.europa.eu/`
- PSD2 + RTS SCA (textes UE): `https://eur-lex.europa.eu/`

