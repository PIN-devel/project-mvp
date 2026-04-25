import { createTheme, Button, type MantineColorsTuple } from "@mantine/core";

// 브랜드 컬러 팔레트
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
  primaryColor: "brandYellow",
  primaryShade: { light: 5, dark: 7 },
  colors: {
    brandYellow,
    brandGray,
  },
  fontFamily:
    "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  defaultRadius: "sm",
  components: {
    Button: Button.extend({
      defaultProps: {
        color: "brandYellow",
        variant: "filled",
      },
    }),
  },
});
