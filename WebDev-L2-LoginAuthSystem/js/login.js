/* =====================================================================
   login.js : logique de la page de connexion
   ===================================================================== */
"use strict";

(function () {
  // Si l'utilisateur est déjà connecté, on l'envoie directement au tableau de bord
  if (getCurrentUser()) {
    window.location.replace("dashboard.html");
    return;
  }

  const form = document.getElementById("login-form");


  // Quand l'utilisateur clique sur "Se connecter"
  form.addEventListener("submit", async function (event) {
    // On empêche le rechargement de la page
    event.preventDefault();

    // On efface les anciens messages
    setFormMessage("");
    setFieldError("identifier", "");
    setFieldError("password", "");

    // Lecture des champs
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    // --- Validation : aucun champ ne doit être vide ---
    let valid = true;

    if (!identifier) {
      setFieldError("identifier", "Ce champ est obligatoire.");
      valid = false;
    }

    if (!password) {
      setFieldError("password", "Ce champ est obligatoire.");
      valid = false;
    }

    if (!valid) {
      return;
    }

    try {
      // On cherche le compte (par nom d'utilisateur ou par e-mail)
      const user = findByIdentifier(identifier);

      // On calcule toujours un hash, que le compte existe ou non.
      // Ainsi le temps de réponse ne révèle pas si le compte existe.
      const salt = user ? user.salt : "0".repeat(32);
      const hash = await hashPassword(password, salt);

      // La connexion n'est valide que si le compte existe ET que le hash correspond
      let isValid = false;

      if (user) {
        isValid = hash === user.passwordHash;
      }

      if (!isValid) {
        // Message unique : on ne dit pas quel champ est incorrect
        setFormMessage("Identifiants incorrects.", "error");
        return;
      }

      // Connexion réussie : on ouvre la session et on va au tableau de bord
      setSession(user.id);
      window.location.href = "dashboard.html";
    } catch (error) {
      setFormMessage("Erreur technique : ouvre la page via localhost ou https.", "error");
    }
  });
})();
