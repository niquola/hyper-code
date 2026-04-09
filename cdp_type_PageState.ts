import type { FormField } from "./cdp_type_FormField.ts";

export type PageState = {
  page: string | null;
  entities: { type: string; id: string | null; status: string | null; fields: Record<string, string>; href: string | null }[];
  actions: { action: string; text: string; selector: string }[];
  forms: { name: string; fields: FormField[] }[];
  nav: string[];
};
