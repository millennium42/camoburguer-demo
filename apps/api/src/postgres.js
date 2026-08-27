import { DEFAULT_BUSINESS_TIME_ZONE } from "@camoburguer/finance-core";

const timezoneOption = `-c timezone=${DEFAULT_BUSINESS_TIME_ZONE}`;

export function withBusinessTimeZone(connectionString) {
  let url;
  try {
    if (typeof connectionString !== "string") throw new Error();
    url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    // URL parsing errors can contain credentials; expose neither input nor cause.
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }

  // Match pg-connection-string: repeated query parameters use their last value.
  const options = url.searchParams.getAll("options").at(-1) || "";
  const trimmed = options.trimEnd();
  if (trimmed !== timezoneOption && !trimmed.endsWith(` ${timezoneOption}`)) {
    // PostgreSQL uses the last setting, so retain existing options and override only timezone.
    url.searchParams.set("options", `${options}${options ? " " : ""}${timezoneOption}`);
  }
  return url.toString();
}
