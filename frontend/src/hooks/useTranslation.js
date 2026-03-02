import { useState, useCallback } from "react";
import en from "../i18n/en.json";
import ta from "../i18n/ta.json";

const LOCALES = { en, ta };

/**
 * useTranslation — simple i18n hook for Patient Dashboard
 *
 * Usage:
 *   const { t, lang, toggleLang } = useTranslation();
 *   t("status.PENDING")  → "Pending" or "நிலுவையில்"
 */
export function useTranslation(defaultLang = "en") {
    const [lang, setLang] = useState(
        () => localStorage.getItem("medflow_lang") || defaultLang
    );

    const toggleLang = useCallback(() => {
        setLang(prev => {
            const next = prev === "en" ? "ta" : "en";
            localStorage.setItem("medflow_lang", next);
            return next;
        });
    }, []);

    /**
     * t("some.nested.key") — returns the translated string.
     * Falls back to English if Tamil key is missing.
     * Falls back to the key itself if neither locale has it.
     */
    const t = useCallback(
        (key) => {
            const keys = key.split(".");
            const resolve = (obj) =>
                keys.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);

            return resolve(LOCALES[lang]) ?? resolve(LOCALES["en"]) ?? key;
        },
        [lang]
    );

    return { t, lang, toggleLang };
}
