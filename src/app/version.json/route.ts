export function GET(): Response {
  return new Response(process.env.NEXT_PUBLIC_BUILD_INFO || "{}", {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
