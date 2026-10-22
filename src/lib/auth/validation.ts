export function validEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value: FormDataEntryValue | null, strong = false) {
  return typeof value === "string" && value.length >= (strong ? 8 : 1) && value.length <= 128 ? value : null;
}

export function credentials(form: FormData, strong = false) {
  const email = validEmail(form.get("email"));
  const password = validPassword(form.get("password"), strong);
  return email && password ? { email, password } : null;
}

export function applicationOrigin(value: string | undefined) {
  if (!value) throw new Error("Configure APP_URL para os links de autenticação.");
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("APP_URL deve ser uma origem HTTPS válida.");
  }
  return url.origin;
}
