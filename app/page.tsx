import PersonalView from "@/components/PersonalView";
import { getTasks, getGroups } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tasks, groups] = await Promise.all([getTasks(), getGroups()]);
  return <PersonalView initialTasks={tasks} initialGroups={groups} />;
}
