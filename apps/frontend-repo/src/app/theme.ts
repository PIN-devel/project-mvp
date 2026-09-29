import { createTheme, Button, type MantineColorsTuple } from "@mantine/core";

// MOTIFIN · Signal Mint brand tokens shared by app-level UI.
export const brandTokens = {
  primaryMint: "#31E6B8",
  deepNavy: "#0D1730",
  lightBackground: "#F4F8F8",
  lightTextAccent: "#006B56",
  cardSurface: "#FFFFFF",
} as const;

const brandMint: MantineColorsTuple = [
  "#E8FFF8",
  "#C7F9EA",
  "#A0F4DB",
  "#79EFD0",
  "#55EAC4",
  brandTokens.primaryMint, // Primary Mint (Index 5)
  "#26C9A0",
  "#1BAA86",
  "#10816A",
  "#075B4B",
];

// Legacy palettes remain available while existing screens are migrated in C.
const brandYellow: MantineColorsTuple = [
  "#fff9e1",
  "#fff0b5",
  "#ffe16a",
  "#ffd21a",
  "#ffc800",
  "#ffbc00", // 메인 컬러 (Index 5)
  "#e6a900",
  "#cc9600",
  "#b38400",
  "#8c6700",
];

const brandGray: MantineColorsTuple = [
  "#f6f5f4",
  "#e9e7e6",
  "#d1cdc9",
  "#b9b2ad",
  "#a19890",
  "#4b433e", // 서브 컬러 (Index 5)
  "#433c38",
  "#3c3632",
  "#342f2b",
  "#2d2925",
];

export const theme = createTheme({
  primaryColor: "brandMint",
  primaryShade: { light: 5, dark: 5 },
  other: {
    brand: brandTokens,
  },
  colors: {
    brandMint,
    brandYellow,
    brandGray,
  },
  fontFamily:
    "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  defaultRadius: "sm",
  components: {
    Button: Button.extend({
      defaultProps: {
        color: "brandMint",
        variant: "filled",
      },
      styles: (_theme, props) => ({
        root:
          props.variant === "filled" && props.color === "brandMint"
            ? { color: brandTokens.deepNavy }
            : undefined,
      }),
    }),
  },
});
