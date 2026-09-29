import { Image } from "@mantine/core";

export interface BrandLogoProps {
  /** Background surface behind the logo, independent of the app color scheme. */
  surface: "light" | "dark";
  /** Display height. The source SVG's 220:40 aspect ratio determines width. */
  height?: number | string;
  /** Accessible image text. */
  alt?: string;
}

const logoSources = {
  light: "/brand/motifin-wordmark-on-light.svg",
  dark: "/brand/motifin-wordmark-on-dark.svg",
} as const;

export function BrandLogo({
  surface,
  height = 40,
  alt = "MOTIFIN",
}: BrandLogoProps) {
  return (
    <Image
      src={logoSources[surface]}
      alt={alt}
      h={height}
      w="auto"
      fit="contain"
    />
  );
}
