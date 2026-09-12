import type {
  TagOptionRow,
  TaskEnvironmentStatusRow,
  TaskStatusRow,
} from "@/types/database";

export type TaskEnvironmentAvailability = Record<string, Record<string, boolean>>;

export function buildTaskEnvironmentAvailability(
  statuses: TaskEnvironmentStatusRow[],
): TaskEnvironmentAvailability {
  return statuses.reduce<TaskEnvironmentAvailability>((availability, status) => {
    return {
      ...availability,
      [status.task_id]: {
        ...(availability[status.task_id] ?? {}),
        [status.environment_tag_id]: status.available,
      },
    };
  }, {});
}

export function getEnvironmentAvailability(
  availability: TaskEnvironmentAvailability,
  taskId: string,
  environmentTagId: string,
) {
  return availability[taskId]?.[environmentTagId] ?? false;
}

export function getEnvironmentFilterOptions(environmentTags: TagOptionRow[]) {
  return environmentTags.map((tag) => ({
    value: tag.id,
    label: tag.nome,
  }));
}

export function taskMatchesAvailableEnvironment(
  task: TaskStatusRow,
  availability: TaskEnvironmentAvailability,
  environmentTagId: string,
) {
  if (!environmentTagId) {
    return true;
  }

  return getEnvironmentAvailability(availability, task.id, environmentTagId);
}
