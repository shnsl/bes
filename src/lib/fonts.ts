export type AppFontId =
  | "inter"
  | "sf"
  | "montserrat"
  | "lato"
  | "raleway"
  | "rubik"
  | "karla"
  | "mulish"
  | "lexend"
  | "figtree"
  | "dm-sans"
  | "saira";

export type AppFontOption = {
  id: AppFontId;
  label: string;
  stack: string;
  file?: string;
  format?: "opentype" | "truetype";
};

/** Farm reposundan alınan, Türkçe destekli fontlar */
export const APP_FONTS: AppFontOption[] = [
  {
    id: "inter",
    label: "Inter",
    stack: '"Inter", system-ui, sans-serif',
    file: "Inter-Regular.otf",
    format: "opentype",
  },
  {
    id: "sf",
    label: "San Francisco",
    stack: '"San Francisco", system-ui, sans-serif',
    file: "SF-Pro-Display-Regular.otf",
    format: "opentype",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    stack: '"Montserrat", system-ui, sans-serif',
    file: "Montserrat-Regular.ttf",
    format: "truetype",
  },
  {
    id: "lato",
    label: "Lato",
    stack: '"Lato", system-ui, sans-serif',
    file: "Lato-Regular.ttf",
    format: "truetype",
  },
  {
    id: "raleway",
    label: "Raleway",
    stack: '"Raleway", system-ui, sans-serif',
    file: "Raleway-Regular.ttf",
    format: "truetype",
  },
  {
    id: "rubik",
    label: "Rubik",
    stack: '"Rubik", system-ui, sans-serif',
    file: "Rubik-Regular.ttf",
    format: "truetype",
  },
  {
    id: "karla",
    label: "Karla",
    stack: '"Karla", system-ui, sans-serif',
    file: "Karla-Regular.ttf",
    format: "truetype",
  },
  {
    id: "mulish",
    label: "Mulish",
    stack: '"Mulish", system-ui, sans-serif',
    file: "Mulish-Regular.ttf",
    format: "truetype",
  },
  {
    id: "lexend",
    label: "Lexend",
    stack: '"Lexend", system-ui, sans-serif',
    file: "Lexend-Regular.ttf",
    format: "truetype",
  },
  {
    id: "figtree",
    label: "Figtree",
    stack: '"Figtree", system-ui, sans-serif',
    file: "Figtree-Regular.ttf",
    format: "truetype",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    stack: '"DM Sans", system-ui, sans-serif',
    file: "DMSans-Regular.ttf",
    format: "truetype",
  },
  {
    id: "saira",
    label: "Saira",
    stack: '"Saira", system-ui, sans-serif',
    file: "Saira-Regular.ttf",
    format: "truetype",
  },
];

export const DEFAULT_FONT_ID: AppFontId = "inter";

export function isAppFontId(value: string | null | undefined): value is AppFontId {
  return APP_FONTS.some((font) => font.id === value);
}

export function getFontOption(id: AppFontId): AppFontOption {
  return APP_FONTS.find((font) => font.id === id) ?? APP_FONTS[0];
}

export function nextFontId(current: AppFontId): AppFontId {
  const index = APP_FONTS.findIndex((font) => font.id === current);
  const next = index < 0 ? 0 : (index + 1) % APP_FONTS.length;
  return APP_FONTS[next].id;
}
