import type { ButtonProps } from "@mantine/core";

// Apply only to the primary next action for the current Core Cycle state.
export const journeyPrimaryProps = {
  color: "brandMint.5",
  variant: "filled",
  size: "lg",
  h: 56,
  px: "xl",
  fw: 700,
  radius: 10,
  vars: (theme) => ({
    root: {
      "--button-color": theme.other.brand.deepNavy,
      "--button-hover": theme.colors.brandMint[6],
    },
  }),
} satisfies ButtonProps;
