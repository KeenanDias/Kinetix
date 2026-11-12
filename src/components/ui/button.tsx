import { cn } from "@/lib/format";

const variants = {
  primary: "bg-brand-900 text-white hover:bg-brand-800",
  volt: "bg-volt-400 text-brand-950 hover:bg-volt-300",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  // Solid red for the final "yes, do it" button in reject/delete confirmations.
  destructive: "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-base",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClasses(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
