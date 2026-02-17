import PersonalView from "@/components/PersonalView";
import { getTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tasks = await getTasks();
  return <PersonalView initialTasks={tasks} />;
}
