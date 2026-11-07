/* =====================================================================
   dashboard.js : page protégée (accessible uniquement avec une session)
   ===================================================================== */
"use strict";

(function () {
  // Vérifie la session puis affiche la page, ou redirige vers la connexion
  function guard() {
    const user = getCurrentUser();

    // Pas de session : accès refusé, retour à la page de connexion
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    // Affichage des informations de l'utilisateur
    document.getElementById("user-name").textContent = user.username;
    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-email").textContent = user.email;

    // Date d'inscription au format français (ex. 7 novembre 2026)
    const createdDate = new Date(user.createdAt);
    document.getElementById("profile-created").textContent = createdDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    // La page était cachée (attribut hidden) : on la montre maintenant
    document.body.hidden = false;
  }

  // Vérification au chargement de la page
  guard();

  // Si la page revient du cache (bouton "Précédent" après une déconnexion),
  // on revérifie la session pour ne rien afficher sans être connecté
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      guard();
    }
  });

  // Bouton "Se déconnecter" : on ferme la session et on retourne à la connexion
  document.getElementById("logout-btn").addEventListener("click", function () {
    clearSession();
    window.location.replace("login.html");
  });
})();
