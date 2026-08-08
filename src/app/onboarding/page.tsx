import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Bienvenida" };

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
