import { Languages, Palette, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { DropdownMenu, DropdownMenuLabel, DropdownMenuSeparator, type DropdownMenuProps } from "./dropdown-menu";
import { LanguageSelector, type LanguageSelectorOption } from "./language-selector";
import { ThemeSelector, type ExtensionThemePreference, type ThemeSelectorLabels } from "./theme-selector";

export type PreferencesMenuProps<TLanguage extends string> = Omit<
  DropdownMenuProps,
  "aria-label" | "children" | "trigger"
> & {
  "aria-label": string;
  childrenAfter?: ReactNode;
  childrenBefore?: ReactNode;
  language?: TLanguage;
  languageLabel?: string;
  languageOptions?: ReadonlyArray<LanguageSelectorOption<TLanguage>>;
  onChangeLanguage?: (language: TLanguage) => void;
  onChangeTheme?: (theme: ExtensionThemePreference) => void;
  theme?: ExtensionThemePreference;
  themeLabel?: string;
  themeLabels?: ThemeSelectorLabels;
  trigger?: ReactNode;
};

export function PreferencesMenu<TLanguage extends string>({
  "aria-label": ariaLabel,
  childrenAfter,
  childrenBefore,
  language,
  languageLabel,
  languageOptions,
  onChangeLanguage,
  onChangeTheme,
  theme,
  themeLabel,
  themeLabels,
  trigger = <Settings aria-hidden="true" size={18} strokeWidth={2.35} />,
  ...props
}: PreferencesMenuProps<TLanguage>) {
  const showLanguage = language && languageLabel && languageOptions && onChangeLanguage;
  const showTheme = theme && themeLabel && themeLabels && onChangeTheme;

  return (
    <DropdownMenu aria-label={ariaLabel} trigger={trigger} {...props}>
      {childrenBefore}
      {childrenBefore && (showLanguage || showTheme || childrenAfter) ? <DropdownMenuSeparator /> : null}
      {showLanguage ? (
        <>
          <DropdownMenuLabel icon={<Languages aria-hidden size={14} strokeWidth={2.2} />}>
            {languageLabel}
          </DropdownMenuLabel>
          <div className="px-2 pb-1">
            <LanguageSelector
              aria-label={languageLabel}
              className="w-full"
              onValueChange={onChangeLanguage}
              options={languageOptions}
              value={language}
            />
          </div>
        </>
      ) : null}
      {showLanguage && showTheme ? <DropdownMenuSeparator /> : null}
      {showTheme ? (
        <>
          <DropdownMenuLabel icon={<Palette aria-hidden size={14} strokeWidth={2.2} />}>{themeLabel}</DropdownMenuLabel>
          <div className="px-2 pb-1">
            <ThemeSelector
              aria-label={themeLabel}
              className="w-full"
              labels={themeLabels}
              onValueChange={onChangeTheme}
              value={theme}
            />
          </div>
        </>
      ) : null}
      {childrenAfter ? (
        <>
          {showLanguage || showTheme ? <DropdownMenuSeparator /> : null}
          {childrenAfter}
        </>
      ) : null}
    </DropdownMenu>
  );
}
