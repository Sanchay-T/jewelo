export default function FoundationPage() {
  return (
    <main>
      <section className="foundation-card" aria-labelledby="foundation-title">
        <p>Jewelo v2</p>
        <h1 id="foundation-title">Production foundation</h1>
        <p>
          The web runtime is ready for implementation. Customer product flows
          intentionally begin in Goal 01.
        </p>
        <p>
          <a href="/api/health">Health</a> ·{" "}
          <a href="/api/readiness">Readiness</a>
        </p>
      </section>
    </main>
  );
}
