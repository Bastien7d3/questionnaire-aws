# ☁️ AWS Certified Cloud Practitioner (CLF-C02) - Quiz de Révision Statique S3

Site web statique moderne, ultra-rapide et autonome hébergé sur **Amazon S3 (Static Website Hosting)** pour réviser l'examen de certification AWS Certified Cloud Practitioner.

---

## 🌐 Liens d'Accès

- **Site Web S3 en direct (Public)** :  
  👉 **[http://quiz-aws-certif-bastien-2026.s3-website.eu-west-3.amazonaws.com](http://quiz-aws-certif-bastien-2026.s3-website.eu-west-3.amazonaws.com)**
- **Région AWS** : `eu-west-3` (Paris)
- **Bucket S3** : `quiz-aws-certif-bastien-2026`
- **Source des questions** : [GitHub - AWS-Certified-Cloud-Practitioner-Notes](https://github.com/kananinirav/AWS-Certified-Cloud-Practitioner-Notes/blob/master/practice-exam/exams.md)

---

## 🎯 Fonctionnalités Principales

1. **Tirage Aléatoire Dynamique** :
   - Une nouvelle question est tirée au sort à chaque rechargement de page (`F5`) ou réponse validée.
   - Bouton dédié **"Question suivante au hasard 🎲"** disponible à tout moment.

2. **Validation Interactive & Feedback Instantané** :
   - Prise en charge des questions à **choix unique** (radio) et **choix multiples** (*"Choose TWO"*, *"Choose THREE"*).
   - Coloration immédiate des réponses : vert pour les bonnes réponses, rouge pour les mauvais choix.
   - Affichage de l'explication détaillée quand disponible.

3. **Approfondissement Pédagogique (Liens de Révision)** :
   Pour chaque question posée, un bloc dédié propose :
   - 📚 **Documentation officielle AWS** du service concerné (EC2, S3, IAM, CloudTrail, DynamoDB, RDS, etc.).
   - 🔍 **Recherche directe dans la documentation AWS** basée sur les mots-clés de la question.
   - 📖 **Lien de référence de l'examen d'origine** (Whitepapers AWS, FAQs, guides d'architecture).
   - 🐙 **Lien direct vers la question sur GitHub** pour voir le contexte d'origine.

4. **Filtres & Entraînement Ciblé** :
   - Choix de l'examen : *Tous les examens (1 142 questions)* ou ciblage sur un *Practice Exam spécifique (1 à 23)*.
   - Mode *Questions non vues uniquement 🆕*.
   - Mode *Questions à revoir (Erreurs) ❌* pour revoir uniquement les questions ratées.
   - Mode *Favoris (⭐)* pour réviser ses questions enregistrées.

5. **Suivi des Statistiques & Gamification** :
   - Compteur de questions répondues, bonnes réponses, taux de précision en %.
   - **Série active (Streak 🔥)** en temps réel.
   - Sauvegarde automatique locale via `localStorage` (pas besoin de base de données).

6. **Ergonomie & Accessibilité** :
   - Raccourcis clavier : touches `1-5` ou `A-E` pour choisir une option, `Entrée` pour valider/passer, `R` ou `N` pour question suivante.
   - Thème Clair / Thème Sombre (Dark Mode) avec détection automatique de l'OS.
   - Interface 100% responsive (Mobile, Tablette, PC).

---

## 🏗️ Architecture S3 Serverless

```
                       ┌────────────────────────────────────────────────────────┐
                       │               Amazon S3 Static Website                 │
                       │          Bucket : quiz-aws-certif-bastien-2026         │
                       │               Région : eu-west-3 (Paris)               │
                       │                                                        │
Navigateur Client ────►│   ├── index.html       (Interface du Quiz)             │
(HTTP / HTTPS)         │   ├── style.css        (Feuille de style moderne)      │
                       │   ├── app.js           (Moteur logique et stats)       │
                       │   ├── questions.js     (Jeu complet de 1142 questions) │
                       │   ├── questions.json   (Données brutes structurées)    │
                       │   └── error.html       (Document d'erreur 404)         │
                       │                                                        │
                       │   Bucket Policy : s3:GetObject (Public Allow)          │
                       │   Block Public Access : Désactivé                      │
                       │   Static Website Hosting : Activé                      │
                       └────────────────────────────────────────────────────────┘
```

---

## 🚀 Utilisation & Déploiement

### Option 1 : Lancement Local (Sans AWS)

Pour réviser hors-ligne sur votre machine :
- **Double-cliquez** sur `start_local.bat`  
*OU* lancez en PowerShell :
```powershell
.\start_local.ps1
```
Le serveur local démarre sur `http://localhost:8000` et s'ouvre automatiquement dans votre navigateur.

---

### Option 2 : Re-déploiement sur Amazon S3

Le script PowerShell `deploy_to_s3.ps1` automatise tout le cycle de vie :
```powershell
.\deploy_to_s3.ps1 -BucketName "mon-bucket-quiz-2026" -Region "eu-west-3"
```

Le script effectue :
1. La création du bucket si inexistant.
2. La désactivation du `BlockPublicAccess`.
3. L'application de la Bucket Policy de lecture publique (`s3:GetObject`).
4. L'activation de l'hébergement de site statique (`index.html` + `error.html`).
5. La synchronisation et configuration des MIME-types de tous les fichiers.
6. L'affichage de l'URL publique finale.

---

### Option 3 : Mise à jour du Dataset depuis GitHub

Si vous souhaitez re-télécharger ou mettre à jour les questions depuis le dépôt GitHub :
```powershell
python build_dataset.py
```
Le script analyse les 23 fichiers markdown, extrait les questions, réponses, explications et génère automatiquement les liens AWS et GitHub associés.
