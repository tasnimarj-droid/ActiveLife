# ActiveLife 🏃‍♂️💪

**ActiveLife** est une application web mono-page (SPA) moderne dédiée au suivi de l'activité physique et du poids corporel au quotidien. Entièrement développée en front-end pur, elle offre une solution autonome, fluide et sécurisée pour gérer ses entraînements et atteindre ses objectifs de santé.

## 🌐 Démo en ligne
 Retrouvez l'application déployée ici : [ActiveLife Live Demo](https://tasnimarj-droid.github.io/ActiveLife/)

## 🚀 Fonctionnalités principales

* **Authentification & Démo :** Système complet de connexion et d'inscription avec un compte de démonstration intégré (`demo@avicenne.com` / `demo123`).
* **Tableau de Bord Interactif :** Vue calendaire (semaine/jour), résumé chiffré des dépenses caloriques et anneaux de progression.
* **Journal des Exercices :** Enregistrement des entraînements avec estimation automatique des calories brûlées selon la discipline (course, musculation, vélo, natation, marche).
* **Suivi du Poids :** Enregistrement régulier des pesées, calcul automatique de l'IMC et suivi de l'écart par rapport au poids de référence.
* **Graphiques Avancés :** Visualisation des tendances via des graphiques interactifs (Chart.js).
* **Export PDF Client :** Génération d'un rapport de synthèse personnel directement dans le navigateur grâce à `jsPDF`, sans appel serveur.

## 🛠️ Stack Technique

* **Langages :** HTML5, CSS3, JavaScript (Vanilla / ES6)
* **Bibliothèques & Outils :**
  * [Chart.js](https://www.chart.js) pour les graphiques dynamiques
  * [jsPDF](https://github.com/parallax/jsPDF) pour l'export des rapports en PDF
  * Font Awesome 6 pour l'iconographie
  * Google Fonts ("Outfit")
* **Stockage :** Persistance locale des données via l'API `localStorage` (aucune base de données distante requise).

## 📦 Utilisation

Aucune installation complexe ni serveur backend n'est nécessaire.

1. Clonez le dépôt :
   ```bash
   git clone [https://github.com/tasnimarj-droid/ActiveLife.git](https://github.com/tasnimarj-droid/ActiveLife.git)
