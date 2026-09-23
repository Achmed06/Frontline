export type StoreCatalogPresentation = {
  available: boolean;
  price: string;
  testOnly: boolean;
};

export function storePurchaseLabel(
  catalog: StoreCatalogPresentation | null,
): string {
  if (!catalog?.available) return "KAUF NOCH NICHT VERFÜGBAR";
  return `${catalog.testOnly ? "TESTKAUF" : "KAUFEN"} · ${catalog.price}`;
}

export function storeModeCopy(
  catalog: StoreCatalogPresentation | null,
): {
  eyebrow: string;
  note: string;
  ready: string;
} {
  if (!catalog)
    return {
      eyebrow: "UNTERSTÜTZERPAKET · APPLE STORE",
      note: "Einmalige kosmetische Freischaltung. Keine stärkeren Truppen und keine zusätzlichen Kampfwerte.",
      ready: "Apple-Shop wird geladen …",
    };
  if (catalog.testOnly)
    return {
      eyebrow: "UNTERSTÜTZERPAKET · STOREKIT TEST",
      note: "Testbetrieb · Testkäufe verursachen keine Abbuchung. Fortschritt und Basisstufe bleiben unverändert.",
      ready: catalog.available
        ? "Apple-Testumgebung bereit. Kein Echtgeldkauf."
        : "Apple-Testprodukt oder Testumgebung noch nicht verfügbar.",
    };
  return {
    eyebrow: "UNTERSTÜTZERPAKET · APPLE STORE",
    note: "Einmalige kosmetische Freischaltung über Apple. Preis und Kaufbestätigung werden von Apple bereitgestellt.",
    ready: catalog.available
      ? "Apple-Shop bereit."
      : "Apple-Produkt ist derzeit nicht verfügbar.",
  };
}
