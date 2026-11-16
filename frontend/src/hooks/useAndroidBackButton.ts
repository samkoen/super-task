import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { getHomePath } from "../config/routes";
import { closeModal, resolveAndroidBackAction, topOpenModal } from "../utils/androidBack";

/**
 * Bouton « retour » de la barre Android : ferme la fenêtre ouverte, sinon revient à la page
 * précédente ; sur l'accueil, met l'appli en arrière-plan au lieu de la fermer.
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = useRef({ pathname: location.pathname, homePath: user ? getHomePath(user.role) : null });
  state.current = { pathname: location.pathname, homePath: user ? getHomePath(user.role) : null };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener("backButton", ({ canGoBack }) => {
      const modal = topOpenModal();
      const { pathname, homePath } = state.current;
      const action = resolveAndroidBackAction({ hasOpenModal: Boolean(modal), pathname, homePath, canGoBack });
      if (action === "closeOverlay" && modal) closeModal(modal);
      else if (action === "navigateBack") navigate(-1);
      else if (action === "goHome" && homePath) navigate(homePath, { replace: true });
      else void CapApp.minimizeApp();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [navigate]);
}
