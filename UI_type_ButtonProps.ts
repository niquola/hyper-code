export type ButtonVariant = "primary" | "danger" | "outline" | "ghost" | "success";

export type ButtonProps = {
  action?: string;
  type?: "submit" | "button";
  variant?: ButtonVariant;
  href?: string;
  link?: string;
  children: string;
};
