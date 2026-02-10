# Guide de résolution des problèmes Cloud SQL

Ce document décrit comment résoudre les 6 problèmes de sécurité et de disponibilité identifiés sur votre instance Cloud SQL.

## Problèmes identifiés

1. **Instance non protégée par un basculement** (Disponibilité)
2. **Pas de règle de sauvegarde automatisée** (Protection des données)
3. **Aucune règle de mot de passe utilisateur** (Sécurité)
4. **Aucune règle relative aux mots de passe** (Sécurité)
5. **Audit non activé pour une instance importante** (Sécurité)
6. **Autorise les connexions directes non chiffrées** (Sécurité)

---

## 1. Activer le basculement (High Availability)

### Via Console GCP

1. Allez dans **Cloud SQL** > votre instance
2. Cliquez sur **Modifier** (Edit)
3. Dans la section **Disponibilité**, cochez **Haute disponibilité**
4. Sélectionnez une **zone de basculement** (différente de la zone principale)
5. Cliquez sur **Enregistrer**

### Via gcloud CLI

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --availability-type=REGIONAL \
  --failover-replica-name=[INSTANCE_NAME]-failover \
  --failover-replica-zone=[ZONE]
```

### Coût
⚠️ **Important** : L'activation de la haute disponibilité double approximativement le coût de l'instance.

### Impact
- Temps d'indisponibilité réduit en cas de panne
- Instance de failover automatique en cas de problème
- Downtime minimal lors des mises à jour

---

## 2. Configurer les sauvegardes automatisées

### Via Console GCP

1. Allez dans **Cloud SQL** > votre instance
2. Cliquez sur **Modifier** (Edit)
3. Dans la section **Sauvegardes automatiques** :
   - Cochez **Activer les sauvegardes automatiques**
   - Définissez l'**heure de sauvegarde** (recommandé : heures creuses, ex: 02:00 UTC)
   - Définissez la **rétention** (recommandé : 7 jours minimum, 30 jours pour production)
4. Cliquez sur **Enregistrer**

### Via gcloud CLI

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --backup-start-time=02:00 \
  --backup \
  --enable-bin-log
```

### Configuration recommandée

```bash
# Sauvegardes quotidiennes à 2h00 UTC, rétention 30 jours
gcloud sql instances patch [INSTANCE_NAME] \
  --backup-start-time=02:00 \
  --backup \
  --enable-bin-log \
  --retained-backups-count=30
```

### Impact
- Sauvegardes quotidiennes automatiques
- Possibilité de restauration point-in-time (PITR) si binlog activé
- Protection contre la perte de données

---

## 3. & 4. Configurer les règles de mot de passe

### Via Console GCP

1. Allez dans **Cloud SQL** > votre instance
2. Cliquez sur **Modifier** (Edit)
3. Dans la section **Sécurité** > **Règles de mot de passe** :
   - **Longueur minimale** : 8 caractères (recommandé : 12)
   - **Complexité** : Exiger majuscules, minuscules, chiffres et caractères spéciaux
   - **Expiration** : Définir une durée (recommandé : 90 jours)
   - **Historique** : Empêcher la réutilisation des 5 derniers mots de passe
4. Cliquez sur **Enregistrer**

### Via gcloud CLI

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --database-flags=password_min_length=12,password_complexity=HIGH,password_reuse_interval=5,password_expiration_days=90
```

### Configuration recommandée

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --database-flags=password_min_length=12,password_complexity=HIGH,password_reuse_interval=5,password_expiration_days=90,password_lockout_time=1,password_lockout_attempts=5
```

### Impact
- Mots de passe plus robustes
- Rotation régulière des mots de passe
- Protection contre les attaques par force brute

---

## 5. Activer l'audit logging

### Via Console GCP

1. Allez dans **Cloud SQL** > votre instance
2. Cliquez sur **Modifier** (Edit)
3. Dans la section **Sécurité** > **Audit** :
   - Cochez **Activer l'audit**
   - Sélectionnez les types d'événements à auditer :
     - ✅ **ADMIN_READ** : Accès administrateur
     - ✅ **DATA_READ** : Lectures de données
     - ✅ **DATA_WRITE** : Écritures de données
4. Cliquez sur **Enregistrer**

### Via gcloud CLI

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log=all
```

### Configuration recommandée avec Cloud Logging

```bash
# Activer l'audit PostgreSQL
gcloud sql instances patch [INSTANCE_NAME] \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log=all,pgaudit.log_catalog=off

# Les logs seront automatiquement envoyés à Cloud Logging
```

### Impact
- Traçabilité complète des accès et modifications
- Conformité réglementaire (RGPD, PCI-DSS, etc.)
- Détection d'activités suspectes

### Consultation des logs

```bash
# Via gcloud
gcloud logging read "resource.type=cloudsql_database AND resource.labels.database_id=[PROJECT_ID]:[INSTANCE_NAME]" --limit 50

# Via Console : Cloud Logging > Logs Explorer
```

---

## 6. Forcer les connexions SSL/TLS

### Via Console GCP

1. Allez dans **Cloud SQL** > votre instance
2. Cliquez sur **Modifier** (Edit)
3. Dans la section **Sécurité** :
   - Cochez **Exiger SSL**
   - Décochez **Autoriser les connexions non chiffrées**
4. Cliquez sur **Enregistrer**

### Via gcloud CLI

```bash
gcloud sql instances patch [INSTANCE_NAME] \
  --require-ssl
```

### Mise à jour du code applicatif

Votre code doit déjà supporter SSL (voir `src/config/database.ts`). Vérifiez que :

1. **En production**, SSL est activé :

```typescript
// src/config/index.ts
database: {
  // ...
  ssl: process.env.DB_SSL === 'true', // Doit être 'true' en production
}
```

2. **Variables d'environnement** en production :

```bash
DB_SSL=true
CLOUD_SQL_CONNECTION_NAME=[PROJECT_ID]:[REGION]:[INSTANCE_NAME]
```

3. **Certificat SSL** (si connexion directe IP) :

Pour les connexions via IP publique, téléchargez le certificat client :

```bash
# Télécharger le certificat
gcloud sql ssl-certs create client-cert \
  [CERT_NAME] \
  --instance=[INSTANCE_NAME] \
  --format=default

# Le certificat sera stocké dans Secret Manager ou configuré dans l'application
```

### Impact
- Toutes les connexions sont chiffrées
- Protection contre les attaques man-in-the-middle
- Conformité aux standards de sécurité

---

## Script de configuration complète

Voici un script bash pour appliquer toutes les configurations d'un coup :

```bash
#!/bin/bash

# Configuration
INSTANCE_NAME="[VOTRE_INSTANCE_NAME]"
PROJECT_ID="[VOTRE_PROJECT_ID]"
REGION="[VOTRE_REGION]"
FAILOVER_ZONE="[ZONE_DE_FAILOVER]"

echo "🔧 Configuration de la sécurité Cloud SQL pour $INSTANCE_NAME"

# 1. Activer HA (optionnel - coûteux)
read -p "Activer la haute disponibilité? (double le coût) [y/N]: " enable_ha
if [[ $enable_ha =~ ^[Yy]$ ]]; then
  echo "✅ Activation de la haute disponibilité..."
  gcloud sql instances patch $INSTANCE_NAME \
    --availability-type=REGIONAL \
    --failover-replica-zone=$FAILOVER_ZONE
fi

# 2. Configurer les sauvegardes
echo "✅ Configuration des sauvegardes automatiques..."
gcloud sql instances patch $INSTANCE_NAME \
  --backup-start-time=02:00 \
  --backup \
  --enable-bin-log \
  --retained-backups-count=30

# 3. & 4. Règles de mot de passe
echo "✅ Configuration des règles de mot de passe..."
gcloud sql instances patch $INSTANCE_NAME \
  --database-flags=password_min_length=12,password_complexity=HIGH,password_reuse_interval=5,password_expiration_days=90

# 5. Activer l'audit
echo "✅ Activation de l'audit logging..."
gcloud sql instances patch $INSTANCE_NAME \
  --database-flags=cloudsql.enable_pgaudit=on,pgaudit.log=all,pgaudit.log_catalog=off

# 6. Forcer SSL
echo "✅ Activation du SSL obligatoire..."
gcloud sql instances patch $INSTANCE_NAME \
  --require-ssl

echo "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Vérifier que DB_SSL=true dans vos variables d'environnement"
echo "2. Tester la connexion à la base de données"
echo "3. Vérifier les logs d'audit dans Cloud Logging"
echo "4. Planifier la rotation des mots de passe existants"
```

---

## Ordre de priorité recommandé

Si vous ne pouvez pas tout faire d'un coup, voici l'ordre de priorité :

1. **🔴 Critique** : Forcer SSL (#6) - Protection immédiate
2. **🟠 Important** : Sauvegardes automatiques (#2) - Protection des données
3. **🟠 Important** : Règles de mot de passe (#3, #4) - Sécurité des accès
4. **🟡 Recommandé** : Audit logging (#5) - Conformité et traçabilité
5. **🟢 Optionnel** : High Availability (#1) - Disponibilité (coûteux)

---

## Vérification post-configuration

Après avoir appliqué les configurations, vérifiez :

```bash
# Vérifier l'état de l'instance
gcloud sql instances describe [INSTANCE_NAME]

# Vérifier les flags de base de données
gcloud sql instances describe [INSTANCE_NAME] --format="value(settings.databaseFlags)"

# Tester la connexion SSL
psql "host=[IP] port=5432 dbname=[DB_NAME] user=[USER] sslmode=require"
```

---

## Notes importantes

- ⚠️ **High Availability** : Double le coût, mais essentiel pour la production
- ⚠️ **Sauvegardes** : Prenez en compte les coûts de stockage
- ⚠️ **SSL** : Assurez-vous que votre application supporte SSL avant d'activer
- ⚠️ **Audit** : Les logs peuvent être volumineux, surveillez les coûts Cloud Logging
- ⚠️ **Mots de passe** : Les règles s'appliquent aux nouveaux mots de passe, planifiez la rotation

---

## Support

Pour plus d'informations :
- [Documentation Cloud SQL - Sécurité](https://cloud.google.com/sql/docs/postgres/security)
- [Documentation Cloud SQL - Haute disponibilité](https://cloud.google.com/sql/docs/postgres/high-availability)
- [Documentation Cloud SQL - Sauvegardes](https://cloud.google.com/sql/docs/postgres/backup-recovery/backing-up)
