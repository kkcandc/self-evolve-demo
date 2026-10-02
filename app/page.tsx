import { Dashboard } from "../components/Dashboard";

export default function Page() {
  return (
    <>
      <Dashboard />
      <footer className="colophon app">
        <p>
          Original demo of the self-evolve loop: propose, test, and accept only when an external
          eval improves. Inspired by{" "}
          <a href="https://x.com/RoundtableSpace/status/2105330581345103924">
            a note on the idea
          </a>{" "}
          and{" "}
          <a href="https://github.com/DaizeDong/self-evolve">DaizeDong/self-evolve</a>. This
          harness is written from scratch and runs entirely in the browser.
        </p>
      </footer>
    </>
  );
}
