import { DataStatus } from "./components/DataStatus.tsx";

export default function Page() {
  return (
    <main className="page">
      <div>
        <h1 className="title">Твојата кошничка</h1>
        <DataStatus />
      </div>
    </main>
  );
}
