
# Translate Transactions Page to English

## Summary
Replace all French labels and text in the Transactions page with English equivalents. This is a simple text replacement task - no API calls or database queries needed.

## French Text to Replace

### 1. Label Mappings (lines 28-60)
| French | English |
|--------|---------|
| À traiter | To Process |
| Non rapproché | Unmatched |
| Rapproché | Matched |
| Ignoré | Ignored |
| En attente | Pending |
| Carte | Card |
| Virement | Transfer |
| Prélèvement | Direct Debit |
| Espèces | Cash |
| Chèque | Check |
| Récurrent | Recurring |
| Ponctuel | One-time |
| Remboursement | Refund |
| Autre | Other |
| Manuel | Manual |

### 2. UI Text (throughout the file)
| French | English |
|--------|---------|
| au total | total |
| Actualiser | Refresh |
| Filtres | Filters |
| actif(s) | active |
| Réduire | Collapse |
| Plus de filtres | More filters |
| Date début | Start Date |
| Date fin | End Date |
| Sélectionner | Select |
| Statut | Status |
| Tous/Toutes | All |
| Recherche | Search |
| Description, contrepartie, IBAN... | Description, counterparty, IBAN... |
| Mode de paiement | Payment Method |
| Contexte | Context |
| Catégorie | Category |
| Ex: Salaires | e.g. Salaries |
| Contrepartie | Counterparty |
| Nom ou IBAN | Name or IBAN |
| Réf. externe | External Ref. |
| Référence | Reference |
| Appliquer | Apply |
| Effacer tout | Clear all |

### 3. Error Message & Formatting
- Line 110: Change French error message to English
- Line 155: Change locale from `fr-FR` to `en-US` for currency formatting

## Technical Details
- File: `src/pages/Transactions.tsx`
- Changes: Text-only replacements
- No API or backend changes required
