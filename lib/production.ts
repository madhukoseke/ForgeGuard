/** True when running on Vercel or NODE_ENV=production. */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  );
}
