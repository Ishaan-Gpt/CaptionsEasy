/**
 * Facts the legal pages depend on. Fill every value marked TODO before launch (and have a lawyer review the
 * pages); they are rendered verbatim on /terms, /privacy, /cookies, /acceptable-use, /refunds, /copyright,
 * /subprocessors.
 */
export const LEGAL = {
  product: "CaptionsEasy",
  /** TODO: the registered legal entity that operates the service, e.g. "Acme Media Private Limited" */
  operator: "[Company legal name]",
  /** TODO: registered business address */
  address: "[Registered address]",
  /** TODO: support / privacy / legal inbox */
  email: "[contact email]",
  /** TODO: confirm governing law and courts */
  jurisdiction: "India",
  courts: "the courts of [city], India",
  /** date the current versions took effect */
  effective: "30 September 2026",
  /** minimum age to hold an account */
  minAge: 13,
  site: "captionseasy.vercel.app",
} as const;

export const LEGAL_PAGES = [
  { href: "/terms", title: "Terms of Service" },
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/cookies", title: "Cookie Policy" },
  { href: "/acceptable-use", title: "Acceptable Use" },
  { href: "/refunds", title: "Refunds & Cancellation" },
  { href: "/copyright", title: "Copyright & Takedowns" },
  { href: "/subprocessors", title: "Subprocessors" },
] as const;
