import { Combobox, type ComboboxOption } from "./combobox";

export type LanguageSelectorOption<TLanguage extends string> = {
  label: string;
  value: TLanguage;
};

export type LanguageSelectorProps<TLanguage extends string> = {
  "aria-label": string;
  className?: string;
  onValueChange: (language: TLanguage) => void;
  options: ReadonlyArray<LanguageSelectorOption<TLanguage>>;
  value: TLanguage;
};

export function LanguageSelector<TLanguage extends string>({
  "aria-label": ariaLabel,
  className,
  onValueChange,
  options,
  value
}: LanguageSelectorProps<TLanguage>) {
  const comboboxOptions = options.map(
    (option) =>
      ({
        keywords: [option.label, option.value],
        label: option.label,
        searchValue: `${option.label} ${option.value}`,
        value: option.value
      }) satisfies ComboboxOption<TLanguage>
  );

  return (
    <Combobox
      aria-label={ariaLabel}
      className={className}
      onValueChange={onValueChange}
      options={comboboxOptions}
      placeholder={ariaLabel}
      searchPlaceholder={ariaLabel}
      value={value}
    />
  );
}
