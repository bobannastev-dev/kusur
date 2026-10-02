import { DataStatus } from "../components/DataStatus.tsx";

export default function Page() {
  return (
    <main className="page">
      <div>
        <h1 className="title">Поевтинето</h1>
        <DataStatus />
      </div>
    </main>
  );
}
