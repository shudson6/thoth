import { cookies } from "next/headers";
import PersonalView from "@/components/PersonalView";
import { getTasks, getGroups, getSetting } from "@/lib/tasks";

export const dynamic = "force-dynamic";

function todayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function Home() {
  const cookieStore = await cookies();
  const timezone = cookieStore.get("tz")?.value || "UTC";
  const initialDate = todayInTimezone(timezone);
  const [tasks, groups, weekStartRaw] = await Promise.all([getTasks(), getGroups(), getSetting("week_start")]);
  const initialWeekStart = [0, 1, 6].includes(Number(weekStartRaw)) ? Number(weekStartRaw) : 1;
  return (
    <PersonalView
      initialTasks={tasks}
      initialGroups={groups}
      initialDate={initialDate}
      initialTimezone={timezone}
      initialWeekStart={initialWeekStart}
    />
  );
}
