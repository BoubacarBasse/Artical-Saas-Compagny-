/* PHASE 0 PLACEHOLDER — replaced wholesale in Phase 1 (see the plan).
   Exists so routing and the middleware guard are real and testable. */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main data-testid="route-order-detail">
      <h1>order-detail</h1>
      <p>{id}</p>
    </main>
  );
}
