# Système d'authentification (Login Authentication System)

**OIBSIP · Web Development & Designing · Level 2 · Task 4**

Système d'authentification côté client : inscription, connexion, page protégée et déconnexion. Approche retenue : **(A) HTML / CSS / JavaScript vanilla avec `localStorage`**.

## Fonctionnalités

- Inscription : nom d'utilisateur, e-mail, mot de passe.
- Validation du mot de passe : 8 caractères minimum, au moins 1 chiffre.
- Détection des doublons (nom d'utilisateur et e-mail, insensible à la casse).
- Connexion par nom d'utilisateur ou e-mail.
- Message d'erreur unique « Identifiants incorrects » (ne révèle pas quel champ est faux).
- Page `dashboard.html` protégée : redirection vers `login.html` sans session active.
- Déconnexion : efface la session et redirige vers la connexion.
- Mots de passe jamais stockés en clair : **SHA-256 avec sel aléatoire** par utilisateur (API Web Crypto).
- Validation des formulaires : aucune soumission vide.

## Structure

```
WebDev-L2-LoginAuthSystem/
├── register.html
├── login.html
├── dashboard.html
├── css/style.css
├── js/
│   ├── auth.js        # stockage, hachage, session
│   ├── register.js
│   ├── login.js
│   └── dashboard.js
├── screenshots/
└── README.md
```

## Fonctionnement

- **Utilisateurs** : `localStorage["users"]` contient `{ id, username, email, salt, passwordHash, createdAt }`.
- **Session** : `sessionStorage["session"]` contient l'identifiant de l'utilisateur connecté ; elle se termine à la fermeture de l'onglet.
- **Hachage** : `SHA-256(sel + mot de passe)` via `crypto.subtle.digest`.

## Lancer le projet

1. Télécharger ou cloner le dépôt.
2. Ouvrir `register.html` dans un navigateur, de préférence via un serveur local (extension *Live Server* de VS Code, ou `python -m http.server`), car `crypto.subtle` requiert un contexte sécurisé (`localhost` ou `https`).
3. Créer un compte, se connecter, puis tester la déconnexion et l'accès direct à `dashboard.html`.

## Captures d'écran

Voir le dossier `screenshots/` : champs vides, validation du mot de passe, inscription réussie, doublon, identifiants incorrects, tableau de bord et affichage mobile.

## Limites (à connaître)

Ce projet est une démonstration pédagogique. Une authentification réelle doit être vérifiée **côté serveur** : tout ce qui est dans `localStorage` est lisible et modifiable par l'utilisateur. Pour un vrai système, on utiliserait un backend avec un algorithme de hachage lent (bcrypt, Argon2) et des sessions ou jetons gérés par le serveur.

## Auteur

MIBANTESSA NSILOULOU Georvelain
