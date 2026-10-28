"use client";

import { Fredoka, Nunito } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import BloopyRewardToast from "@/components/BloopyRewardToast";
import BloopyInteractionLayer from "@/components/BloopyInteractionLayer";
import NotificationScheduler from "@/components/NotificationScheduler";
import AppearanceProvider from "@/components/AppearanceProvider";
import BloopyThemeProvider from "@/components/BloopyThemeProvider";
import BloopyPresence from "@/components/BloopyPresence";
import RobotProvider from "@/components/RobotProvider";
import { useBloopyRouteHistory } from "@/lib/useSafeBloopyBack";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fredoka",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

/**
 * Shared shell for every signed-in Bloopy page. Each page renders its own
 * full-screen dark UI and header; this layout supplies the theme/appearance
 * providers, fonts, bottom nav, and the app-wide reward/presence layers.
 * (An older pastel fallback shell lived here behind a route allowlist — every
 * route was on the list, so the fallback was unreachable and has been removed.)
 */
export default function BloopyAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Track internal route changes so safe in-app back arrows always have a trail.
  useBloopyRouteHistory();

  return (
    <AppearanceProvider>
      <BloopyThemeProvider>
        <RobotProvider>
          <div className={`bloopy-app ${nunito.className} ${fredoka.variable} antialiased`}>
            {children}
            <BottomNav />
            <BloopyRewardToast />
            <BloopyInteractionLayer />
            <NotificationScheduler />
            <BloopyPresence />
          </div>
        </RobotProvider>
      </BloopyThemeProvider>
    </AppearanceProvider>
  );
}
