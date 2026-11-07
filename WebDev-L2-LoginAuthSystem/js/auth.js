/* =====================================================================
   auth.js : fonctions communes aux trois pages
   - gestion des utilisateurs (localStorage)
   - hachage des mots de passe (SHA-256 + sel)
   - gestion de la session (sessionStorage)
   - petits utilitaires d'affichage des erreurs
   ===================================================================== */
"use strict";

// Noms des clés utilisées dans le stockage du navigateur
const USERS_KEY = "users";
const SESSION_KEY = "session";


/* ---------------------------------------------------------------------
   1. Stockage des utilisateurs
   --------------------------------------------------------------------- */

// Retourne la liste des utilisateurs enregistrés (tableau vide si aucun)
function getUsers() {
  try {
    const data = JSON.parse(localStorage.getItem(USERS_KEY));

    // On vérifie que les données sont bien un tableau
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    // Données corrompues : on repart d'une liste vide
    return [];
  }
}

// Enregistre la liste complète des utilisateurs
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}


/* ---------------------------------------------------------------------
   2. Hachage du mot de passe (SHA-256 avec sel)
   --------------------------------------------------------------------- */

// Transforme un tableau d'octets en texte hexadécimal
function bytesToHex(buffer) {
  const bytes = Array.from(new Uint8Array(buffer));
  let hex = "";

  for (const byte of bytes) {
    // padStart garantit 2 caractères par octet (ex. "0a" et non "a")
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

// Génère un sel aléatoire de 16 octets (unique pour chaque utilisateur)
function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

// Calcule le hash SHA-256 de (sel + mot de passe)
async function hashPassword(password, salt) {
  // L'API Web Crypto n'existe qu'en localhost ou en https
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("CRYPTO_UNAVAILABLE");
  }

  const data = new TextEncoder().encode(salt + password);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return bytesToHex(digest);
}


/* ---------------------------------------------------------------------
   3. Recherche d'un utilisateur
   --------------------------------------------------------------------- */

// Met un texte en minuscules et sans espaces autour pour comparer
function normalize(value) {
  return String(value).trim().toLowerCase();
}

// Cherche un utilisateur par nom d'utilisateur
function findByUsername(username) {
  const users = getUsers();

  return users.find(function (user) {
    return normalize(user.username) === normalize(username);
  });
}

// Cherche un utilisateur par adresse e-mail
function findByEmail(email) {
  const users = getUsers();

  return users.find(function (user) {
    return normalize(user.email) === normalize(email);
  });
}

// Cherche un utilisateur par nom d'utilisateur OU par e-mail
function findByIdentifier(identifier) {
  return findByUsername(identifier) || findByEmail(identifier);
}


/* ---------------------------------------------------------------------
   4. Session (sessionStorage : elle s'efface à la fermeture de l'onglet)
   --------------------------------------------------------------------- */

// Ouvre une session en mémorisant l'identifiant de l'utilisateur
function setSession(userId) {
  sessionStorage.setItem(SESSION_KEY, userId);
}

// Retourne l'utilisateur connecté, ou null s'il n'y a pas de session
function getCurrentUser() {
  const userId = sessionStorage.getItem(SESSION_KEY);

  if (!userId) {
    return null;
  }

  const users = getUsers();
  const user = users.find(function (item) {
    return item.id === userId;
  });

  return user || null;
}

// Ferme la session (déconnexion)
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}


/* ---------------------------------------------------------------------
   5. Utilitaires d'affichage
   --------------------------------------------------------------------- */

// Affiche (ou efface) le message d'erreur sous un champ
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(inputId + "-error");

  if (error) {
    error.textContent = message || "";
  }

  if (input) {
    // La classe "invalid" colore le champ en rouge
    input.classList.toggle("invalid", Boolean(message));
  }
}

// Affiche un message général sous le formulaire (type : "error" ou "success")
function setFormMessage(message, type) {
  const element = document.getElementById("form-message");

  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.className = "form-message" + (type ? " " + type : "");
}
