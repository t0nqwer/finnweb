import { APP_NAME } from "@finnweb/shared";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>{APP_NAME}</h1>
      <p>FinnWeb monorepo is ready.</p>
    </main>
  );
}
