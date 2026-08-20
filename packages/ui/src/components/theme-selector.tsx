import { Combobox, type ComboboxOption } from "./combobox";

export type ExtensionThemePreference = "dark" | "light" | "system";

export type ThemeSelectorLabels = Record<ExtensionThemePreference, string>;

export type ThemeSelectorProps = {
  "aria-label": string;
  className?: string;
  labels: ThemeSelectorLabels;
  onValueChange: (theme: ExtensionThemePreference) => void;
  value: ExtensionThemePreference;
};

export function ThemeSelector({
  "aria-label": ariaLabel,
  className,
  labels,
  onValueChange,
  value
}: ThemeSelectorProps) {
  const options = (["system", "light", "dark"] as const).map(
    (theme) =>
      ({
        keywords: [labels[theme], theme],
        label: labels[theme],
        searchValue: `${labels[theme]} ${theme}`,
        value: theme
      }) satisfies ComboboxOption<ExtensionThemePreference>
  );

  return (
    <Combobox
      aria-label={ariaLabel}
      className={className}
      onValueChange={onValueChange}
      options={options}
      placeholder={ariaLabel}
      searchPlaceholder={ariaLabel}
      value={value}
    />
  );
}
