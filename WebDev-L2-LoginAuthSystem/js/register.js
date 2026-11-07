/* =====================================================================
   register.js : logique de la page d'inscription
   ===================================================================== */
"use strict";

(function () {
  // Si l'utilisateur est déjà connecté, on l'envoie directement au tableau de bord
  if (getCurrentUser()) {
    window.location.replace("dashboard.html");
    return;
  }

  const form = document.getElementById("register-form");

  // Forme minimale d'une adresse e-mail : texte@texte.texte
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  // Vérifie les trois champs et affiche les erreurs.
  // Retourne true si tout est valide, false sinon.
  function validate(username, email, password) {
    let valid = true;

    // On efface d'abord les anciennes erreurs
    setFieldError("username", "");
    setFieldError("email", "");
    setFieldError("password", "");

    // --- Nom d'utilisateur ---
    if (!username) {
      setFieldError("username", "Le nom d'utilisateur est obligatoire.");
      valid = false;
    } else if (username.length < 3) {
      setFieldError("username", "Au moins 3 caractères.");
      valid = false;
    } else if (findByUsername(username)) {
      // Doublon : ce nom est déjà pris
      setFieldError("username", "Ce nom d'utilisateur existe déjà.");
      valid = false;
    }

    // --- Adresse e-mail ---
    if (!email) {
      setFieldError("email", "L'adresse e-mail est obligatoire.");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError("email", "Adresse e-mail invalide.");
      valid = false;
    } else if (findByEmail(email)) {
      // Doublon : cette adresse est déjà utilisée
      setFieldError("email", "Cette adresse e-mail est déjà utilisée.");
      valid = false;
    }

    // --- Mot de passe : 8 caractères minimum dont 1 chiffre ---
    if (!password) {
      setFieldError("password", "Le mot de passe est obligatoire.");
      valid = false;
    } else if (password.length < 8) {
      setFieldError("password", "Au moins 8 caractères.");
      valid = false;
    } else if (!/\d/.test(password)) {
      setFieldError("password", "Au moins 1 chiffre est requis.");
      valid = false;
    }

    return valid;
  }


  // Quand l'utilisateur clique sur "S'inscrire"
  form.addEventListener("submit", async function (event) {
    // On empêche le rechargement de la page
    event.preventDefault();
    setFormMessage("");

    // Lecture des champs
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Si un champ est invalide, on s'arrête ici
    if (!validate(username, email, password)) {
      return;
    }

    try {
      // On ne stocke jamais le mot de passe : seulement le sel et le hash
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);

      // Création du nouvel utilisateur
      const newUser = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        username: username,
        email: email,
        salt: salt,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString()
      };

      // Ajout à la liste puis sauvegarde
      const users = getUsers();
      users.push(newUser);
      saveUsers(users);

      // Message de succès puis redirection vers la connexion
      form.reset();
      setFormMessage("Compte créé avec succès. Redirection vers la connexion...", "success");

      setTimeout(function () {
        window.location.href = "login.html";
      }, 1500);
    } catch (error) {
      setFormMessage(
        "Impossible de sécuriser le mot de passe sur ce navigateur. Ouvre la page via localhost ou https.",
        "error"
      );
    }
  });
})();
