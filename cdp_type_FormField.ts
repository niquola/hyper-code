export type FormField = {
  name: string;
  type: string;
  options?: { value: string; label: string; selected: boolean }[];
};
