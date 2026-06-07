import Dashboard from "@/components/Dashboard";

// Single dashboard page. <Dashboard> is a client component that polls
// /api/actions every ~2s for the live audit feed.
export default function Page() {
  return <Dashboard />;
}
