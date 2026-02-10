import { Language } from "@/contexts/LanguageContext";

export type TranslationKey = 
  // Navigation
  | "nav.dashboard"
  | "nav.transactions"
  | "nav.cryptoTransactions"
  | "nav.invoicesIssued"
  | "nav.invoicesReceived"
  | "nav.settings"
  | "nav.support"
  | "nav.logout"
  
  // Settings
  | "settings.title"
  | "settings.description"
  | "settings.account"
  | "settings.accountDescription"
  | "settings.user"
  | "settings.technical"
  | "settings.technicalDescription"
  | "settings.language"
  | "settings.languageDescription"
  | "settings.password"
  | "settings.passwordDescription"
  | "settings.passwordReset"
  | "settings.passwordResetSent"
  | "settings.passwordResetInstruction"
  | "settings.sendResetEmail"
  | "settings.sendAnotherEmail"
  | "settings.mfa"
  | "settings.mfaDescription"
  | "settings.mfaComingSoon"
  | "settings.organizationEntity"
  | "settings.organizationEntityDescription"
  | "settings.organizationName"
  | "settings.entityName"
  | "settings.users"
  | "settings.notifications"
  | "settings.notificationFrequency"
  | "settings.contact"
  | "settings.billing"
  | "settings.apiKey"
  | "settings.webhook"
  | "settings.auditLog"
  
  // Dashboard
  | "dashboard.title"
  | "dashboard.revenue"
  | "dashboard.customers"
  | "dashboard.transactions"
  | "dashboard.invoices"
  | "dashboard.invoiceMatching"
  | "dashboard.linkedSystems"
  | "dashboard.revenueChart"
  | "dashboard.recentActivity"
  | "dashboard.invoicesIssued"
  | "dashboard.invoicesReceived"
  | "dashboard.transactionsMatched"
  | "dashboard.pendingActions"
  | "dashboard.vsLastMonth"
  
  // Transactions
  | "transactions.title"
  | "transactions.total"
  | "transactions.import"
  | "transactions.add"
  | "transactions.export"
  | "transactions.refresh"
  | "transactions.filters"
  | "transactions.startDate"
  | "transactions.endDate"
  | "transactions.status"
  | "transactions.search"
  | "transactions.source"
  | "transactions.paymentMethod"
  | "transactions.context"
  | "transactions.category"
  | "transactions.counterparty"
  | "transactions.externalRef"
  | "transactions.apply"
  | "transactions.clearAll"
  | "transactions.moreFilters"
  | "transactions.collapse"
  | "transactions.select"
  | "transactions.all"
  | "transactions.noResults"
  | "transactions.date"
  | "transactions.description"
  | "transactions.amount"
  | "transactions.active"
  | "transactions.showing"
  | "transactions.previous"
  | "transactions.next"
  
  // Status labels
  | "status.unconsidered"
  | "status.unmatched"
  | "status.matched"
  | "status.ignored"
  | "status.pending"
  
  // Payment methods
  | "payment.card"
  | "payment.transfer"
  | "payment.directDebit"
  | "payment.cash"
  | "payment.check"
  | "payment.crypto"
  | "payment.other"
  
  // Payment context
  | "context.cit"
  | "context.mit"
  | "context.recurring"
  | "context.oneTime"
  | "context.refund"
  | "context.other"
  
  // Common
  | "common.save"
  | "common.saveChanges"
  | "common.cancel"
  | "common.confirm"
  | "common.success"
  | "common.error"
  | "common.loading"
  | "common.sending"
  | "common.saving"
  | "common.search"
  | "common.noResults"
  | "common.managePreferences"
  | "common.name"
  | "common.email"
  | "common.phone"
  | "common.address"
  | "common.city"
  | "common.postalCode"
  | "common.country"
  | "common.download"
  | "common.actions";

type Translations = {
  [key in Language]: {
    [k in TranslationKey]: string;
  };
};

export const translations: Translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.transactions": "Transactions",
    "nav.cryptoTransactions": "Crypto Transactions",
    "nav.invoicesIssued": "Invoices Issued",
    "nav.invoicesReceived": "Invoices Received",
    "nav.settings": "Settings",
    "nav.support": "Support",
    "nav.logout": "Logout",
    
    // Settings
    "settings.title": "User Settings",
    "settings.description": "Manage your personal preferences",
    "settings.account": "Account",
    "settings.accountDescription": "Manage your account configuration",
    "settings.user": "User",
    "settings.technical": "Technical",
    "settings.technicalDescription": "Configure technical integrations",
    "settings.language": "Language",
    "settings.languageDescription": "Choose your preferred language for the application",
    "settings.password": "Password Management",
    "settings.passwordDescription": "Reset your password securely via email",
    "settings.passwordReset": "Password Reset",
    "settings.passwordResetSent": "A password reset link has been sent to",
    "settings.passwordResetInstruction": "Click the button below to receive a password reset link at your registered email address:",
    "settings.sendResetEmail": "Send Password Reset Email",
    "settings.sendAnotherEmail": "Send another reset email",
    "settings.mfa": "Multi-Factor Authentication",
    "settings.mfaDescription": "Configure MFA for additional security",
    "settings.mfaComingSoon": "MFA settings will be available here.",
    "settings.organizationEntity": "Organization & Entity",
    "settings.organizationEntityDescription": "Manage your organization and entity names. An organization can have multiple entities (multi-tenant).",
    "settings.organizationName": "Organization Name",
    "settings.entityName": "Entity Name",
    "settings.users": "Users",
    "settings.notifications": "Notifications",
    "settings.notificationFrequency": "Notification Frequency",
    "settings.contact": "Contact",
    "settings.billing": "Billing",
    "settings.apiKey": "API Key",
    "settings.webhook": "Webhook",
    "settings.auditLog": "Audit Log",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.revenue": "Revenue",
    "dashboard.customers": "Customers",
    "dashboard.transactions": "Transactions",
    "dashboard.invoices": "Invoices",
    "dashboard.invoiceMatching": "Invoice Matching",
    "dashboard.linkedSystems": "Linked Systems",
    "dashboard.revenueChart": "Revenue Chart",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.invoicesIssued": "Invoices Issued",
    "dashboard.invoicesReceived": "Invoices Received",
    "dashboard.transactionsMatched": "Transactions Matched",
    "dashboard.pendingActions": "Pending Actions",
    "dashboard.vsLastMonth": "vs last month",
    
    // Transactions
    "transactions.title": "Transactions",
    "transactions.total": "total",
    "transactions.import": "Import",
    "transactions.add": "Add",
    "transactions.export": "Export",
    "transactions.refresh": "Refresh",
    "transactions.filters": "Filters",
    "transactions.startDate": "Start Date",
    "transactions.endDate": "End Date",
    "transactions.status": "Status",
    "transactions.search": "Search",
    "transactions.source": "Source",
    "transactions.paymentMethod": "Payment Method",
    "transactions.context": "Context",
    "transactions.category": "Category",
    "transactions.counterparty": "Counterparty",
    "transactions.externalRef": "External Ref.",
    "transactions.apply": "Apply",
    "transactions.clearAll": "Clear all",
    "transactions.moreFilters": "More filters",
    "transactions.collapse": "Collapse",
    "transactions.select": "Select",
    "transactions.all": "All",
    "transactions.noResults": "No transactions found",
    "transactions.date": "Date",
    "transactions.description": "Description",
    "transactions.amount": "Amount",
    "transactions.active": "active",
    "transactions.showing": "Showing",
    "transactions.previous": "Previous",
    "transactions.next": "Next",
    
    // Status labels
    "status.unconsidered": "To process",
    "status.unmatched": "Unmatched",
    "status.matched": "Matched",
    "status.ignored": "Ignored",
    "status.pending": "Pending",
    
    // Payment methods
    "payment.card": "Card",
    "payment.transfer": "Transfer",
    "payment.directDebit": "Direct Debit",
    "payment.cash": "Cash",
    "payment.check": "Check",
    "payment.crypto": "Crypto",
    "payment.other": "Other",
    
    // Payment context
    "context.cit": "CIT",
    "context.mit": "MIT",
    "context.recurring": "Recurring",
    "context.oneTime": "One-time",
    "context.refund": "Refund",
    "context.other": "Other",
    
    // Common
    "common.save": "Save",
    "common.saveChanges": "Save Changes",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.success": "Success",
    "common.error": "Error",
    "common.loading": "Loading...",
    "common.sending": "Sending...",
    "common.saving": "Saving...",
    "common.search": "Search",
    "common.noResults": "No results found",
    "common.managePreferences": "Manage your personal preferences",
    "common.name": "Name",
    "common.email": "Email",
    "common.phone": "Phone",
    "common.address": "Address",
    "common.city": "City",
    "common.postalCode": "Postal Code",
    "common.country": "Country",
    "common.download": "Download",
    "common.actions": "Actions",
  },
  
  fr: {
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.transactions": "Transactions",
    "nav.cryptoTransactions": "Transactions Crypto",
    "nav.invoicesIssued": "Factures émises",
    "nav.invoicesReceived": "Factures reçues",
    "nav.settings": "Paramètres",
    "nav.support": "Support",
    "nav.logout": "Déconnexion",
    
    // Settings
    "settings.title": "Paramètres utilisateur",
    "settings.description": "Gérez vos préférences personnelles",
    "settings.account": "Compte",
    "settings.accountDescription": "Gérez la configuration de votre compte",
    "settings.user": "Utilisateur",
    "settings.technical": "Technique",
    "settings.technicalDescription": "Configurez les intégrations techniques",
    "settings.language": "Langue",
    "settings.languageDescription": "Choisissez votre langue préférée pour l'application",
    "settings.password": "Gestion du mot de passe",
    "settings.passwordDescription": "Réinitialisez votre mot de passe en toute sécurité par email",
    "settings.passwordReset": "Réinitialisation du mot de passe",
    "settings.passwordResetSent": "Un lien de réinitialisation a été envoyé à",
    "settings.passwordResetInstruction": "Cliquez sur le bouton ci-dessous pour recevoir un lien de réinitialisation à votre adresse email:",
    "settings.sendResetEmail": "Envoyer l'email de réinitialisation",
    "settings.sendAnotherEmail": "Envoyer un autre email",
    "settings.mfa": "Authentification multi-facteurs",
    "settings.mfaDescription": "Configurez l'authentification multi-facteurs pour plus de sécurité",
    "settings.mfaComingSoon": "Les paramètres MFA seront disponibles ici.",
    "settings.organizationEntity": "Organisation et Entité",
    "settings.organizationEntityDescription": "Gérez les noms de votre organisation et entité. Une organisation peut avoir plusieurs entités (multi-tenant).",
    "settings.organizationName": "Nom de l'organisation",
    "settings.entityName": "Nom de l'entité",
    "settings.users": "Utilisateurs",
    "settings.notifications": "Notifications",
    "settings.notificationFrequency": "Fréquence des notifications",
    "settings.contact": "Contact",
    "settings.billing": "Facturation",
    "settings.apiKey": "Clé API",
    "settings.webhook": "Webhook",
    "settings.auditLog": "Journal d'audit",
    
    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.revenue": "Revenus",
    "dashboard.customers": "Clients",
    "dashboard.transactions": "Transactions",
    "dashboard.invoices": "Factures",
    "dashboard.invoiceMatching": "Rapprochement des factures",
    "dashboard.linkedSystems": "Systèmes liés",
    "dashboard.revenueChart": "Graphique des revenus",
    "dashboard.recentActivity": "Activité récente",
    "dashboard.invoicesIssued": "Factures émises",
    "dashboard.invoicesReceived": "Factures reçues",
    "dashboard.transactionsMatched": "Transactions rapprochées",
    "dashboard.pendingActions": "Actions en attente",
    "dashboard.vsLastMonth": "vs mois dernier",
    
    // Transactions
    "transactions.title": "Transactions",
    "transactions.total": "au total",
    "transactions.import": "Importer",
    "transactions.add": "Ajouter",
    "transactions.export": "Exporter",
    "transactions.refresh": "Actualiser",
    "transactions.filters": "Filtres",
    "transactions.startDate": "Date début",
    "transactions.endDate": "Date fin",
    "transactions.status": "Statut",
    "transactions.search": "Recherche",
    "transactions.source": "Source",
    "transactions.paymentMethod": "Mode de paiement",
    "transactions.context": "Contexte",
    "transactions.category": "Catégorie",
    "transactions.counterparty": "Contrepartie",
    "transactions.externalRef": "Réf. externe",
    "transactions.apply": "Appliquer",
    "transactions.clearAll": "Effacer tout",
    "transactions.moreFilters": "Plus de filtres",
    "transactions.collapse": "Réduire",
    "transactions.select": "Sélectionner",
    "transactions.all": "Tous",
    "transactions.noResults": "Aucune transaction trouvée",
    "transactions.date": "Date",
    "transactions.description": "Description",
    "transactions.amount": "Montant",
    "transactions.active": "actif(s)",
    "transactions.showing": "Affichage de",
    "transactions.previous": "Précédent",
    "transactions.next": "Suivant",
    
    // Status labels
    "status.unconsidered": "À traiter",
    "status.unmatched": "Non rapproché",
    "status.matched": "Rapproché",
    "status.ignored": "Ignoré",
    "status.pending": "En attente",
    
    // Payment methods
    "payment.card": "Carte",
    "payment.transfer": "Virement",
    "payment.directDebit": "Prélèvement",
    "payment.cash": "Espèces",
    "payment.check": "Chèque",
    "payment.crypto": "Crypto",
    "payment.other": "Autre",
    
    // Payment context
    "context.cit": "CIT",
    "context.mit": "MIT",
    "context.recurring": "Récurrent",
    "context.oneTime": "Ponctuel",
    "context.refund": "Remboursement",
    "context.other": "Autre",
    
    // Common
    "common.save": "Enregistrer",
    "common.saveChanges": "Enregistrer les modifications",
    "common.cancel": "Annuler",
    "common.confirm": "Confirmer",
    "common.success": "Succès",
    "common.error": "Erreur",
    "common.loading": "Chargement...",
    "common.sending": "Envoi...",
    "common.saving": "Enregistrement...",
    "common.search": "Rechercher",
    "common.noResults": "Aucun résultat trouvé",
    "common.managePreferences": "Gérez vos préférences personnelles",
    "common.name": "Nom",
    "common.email": "Email",
    "common.phone": "Téléphone",
    "common.address": "Adresse",
    "common.city": "Ville",
    "common.postalCode": "Code postal",
    "common.country": "Pays",
    "common.download": "Télécharger",
    "common.actions": "Actions",
  },
  
  de: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.transactions": "Transaktionen",
    "nav.cryptoTransactions": "Krypto-Transaktionen",
    "nav.invoicesIssued": "Ausgestellte Rechnungen",
    "nav.invoicesReceived": "Empfangene Rechnungen",
    "nav.settings": "Einstellungen",
    "nav.support": "Support",
    "nav.logout": "Abmelden",
    
    // Settings
    "settings.title": "Benutzereinstellungen",
    "settings.description": "Verwalten Sie Ihre persönlichen Einstellungen",
    "settings.account": "Konto",
    "settings.accountDescription": "Verwalten Sie Ihre Kontokonfiguration",
    "settings.user": "Benutzer",
    "settings.technical": "Technisch",
    "settings.technicalDescription": "Konfigurieren Sie technische Integrationen",
    "settings.language": "Sprache",
    "settings.languageDescription": "Wählen Sie Ihre bevorzugte Sprache für die Anwendung",
    "settings.password": "Passwortverwaltung",
    "settings.passwordDescription": "Setzen Sie Ihr Passwort sicher per E-Mail zurück",
    "settings.passwordReset": "Passwort zurücksetzen",
    "settings.passwordResetSent": "Ein Link zum Zurücksetzen wurde gesendet an",
    "settings.passwordResetInstruction": "Klicken Sie auf die Schaltfläche unten, um einen Link zum Zurücksetzen an Ihre E-Mail-Adresse zu erhalten:",
    "settings.sendResetEmail": "E-Mail zum Zurücksetzen senden",
    "settings.sendAnotherEmail": "Weitere E-Mail senden",
    "settings.mfa": "Multi-Faktor-Authentifizierung",
    "settings.mfaDescription": "Konfigurieren Sie MFA für zusätzliche Sicherheit",
    "settings.mfaComingSoon": "MFA-Einstellungen werden hier verfügbar sein.",
    "settings.organizationEntity": "Organisation & Entität",
    "settings.organizationEntityDescription": "Verwalten Sie Ihre Organisations- und Entitätsnamen. Eine Organisation kann mehrere Entitäten haben (Multi-Tenant).",
    "settings.organizationName": "Organisationsname",
    "settings.entityName": "Entitätsname",
    "settings.users": "Benutzer",
    "settings.notifications": "Benachrichtigungen",
    "settings.notificationFrequency": "Benachrichtigungshäufigkeit",
    "settings.contact": "Kontakt",
    "settings.billing": "Abrechnung",
    "settings.apiKey": "API-Schlüssel",
    "settings.webhook": "Webhook",
    "settings.auditLog": "Audit-Protokoll",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.revenue": "Umsatz",
    "dashboard.customers": "Kunden",
    "dashboard.transactions": "Transaktionen",
    "dashboard.invoices": "Rechnungen",
    "dashboard.invoiceMatching": "Rechnungsabgleich",
    "dashboard.linkedSystems": "Verknüpfte Systeme",
    "dashboard.revenueChart": "Umsatzdiagramm",
    "dashboard.recentActivity": "Letzte Aktivität",
    "dashboard.invoicesIssued": "Ausgestellte Rechnungen",
    "dashboard.invoicesReceived": "Empfangene Rechnungen",
    "dashboard.transactionsMatched": "Abgeglichene Transaktionen",
    "dashboard.pendingActions": "Ausstehende Aktionen",
    "dashboard.vsLastMonth": "vs letzter Monat",
    
    // Transactions
    "transactions.title": "Transaktionen",
    "transactions.total": "insgesamt",
    "transactions.import": "Importieren",
    "transactions.add": "Hinzufügen",
    "transactions.export": "Exportieren",
    "transactions.refresh": "Aktualisieren",
    "transactions.filters": "Filter",
    "transactions.startDate": "Startdatum",
    "transactions.endDate": "Enddatum",
    "transactions.status": "Status",
    "transactions.search": "Suche",
    "transactions.source": "Quelle",
    "transactions.paymentMethod": "Zahlungsmethode",
    "transactions.context": "Kontext",
    "transactions.category": "Kategorie",
    "transactions.counterparty": "Gegenpartei",
    "transactions.externalRef": "Ext. Referenz",
    "transactions.apply": "Anwenden",
    "transactions.clearAll": "Alle löschen",
    "transactions.moreFilters": "Mehr Filter",
    "transactions.collapse": "Einklappen",
    "transactions.select": "Auswählen",
    "transactions.all": "Alle",
    "transactions.noResults": "Keine Transaktionen gefunden",
    "transactions.date": "Datum",
    "transactions.description": "Beschreibung",
    "transactions.amount": "Betrag",
    "transactions.active": "aktiv",
    "transactions.showing": "Anzeige von",
    "transactions.previous": "Zurück",
    "transactions.next": "Weiter",
    
    // Status labels
    "status.unconsidered": "Zu bearbeiten",
    "status.unmatched": "Nicht abgeglichen",
    "status.matched": "Abgeglichen",
    "status.ignored": "Ignoriert",
    "status.pending": "Ausstehend",
    
    // Payment methods
    "payment.card": "Karte",
    "payment.transfer": "Überweisung",
    "payment.directDebit": "Lastschrift",
    "payment.cash": "Bargeld",
    "payment.check": "Scheck",
    "payment.crypto": "Krypto",
    "payment.other": "Andere",
    
    // Payment context
    "context.cit": "CIT",
    "context.mit": "MIT",
    "context.recurring": "Wiederkehrend",
    "context.oneTime": "Einmalig",
    "context.refund": "Rückerstattung",
    "context.other": "Andere",
    
    // Common
    "common.save": "Speichern",
    "common.saveChanges": "Änderungen speichern",
    "common.cancel": "Abbrechen",
    "common.confirm": "Bestätigen",
    "common.success": "Erfolg",
    "common.error": "Fehler",
    "common.loading": "Laden...",
    "common.sending": "Senden...",
    "common.saving": "Speichern...",
    "common.search": "Suchen",
    "common.noResults": "Keine Ergebnisse gefunden",
    "common.managePreferences": "Verwalten Sie Ihre persönlichen Einstellungen",
    "common.name": "Name",
    "common.email": "E-Mail",
    "common.phone": "Telefon",
    "common.address": "Adresse",
    "common.city": "Stadt",
    "common.postalCode": "Postleitzahl",
    "common.country": "Land",
    "common.download": "Herunterladen",
    "common.actions": "Aktionen",
  },
};

export function getTranslation(language: Language, key: TranslationKey): string {
  return translations[language]?.[key] || translations.en[key] || key;
}
