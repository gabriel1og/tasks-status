import { buildTimeTrackingSettingsChanges } from "@/lib/time-tracking/time-tracking-rules";

export const DEFAULT_DAILY_GOAL_MINUTES = 360;

export type DailyGoalParts = {
  hours: number;
  minutes: number;
};

/** Converte horas e minutos informados na interface para o total persistido em minutos. */
export function parseDailyGoalMinutes(
  hoursInput: string,
  minutesInput: string,
): number {
  if (!hoursInput.trim() || !minutesInput.trim()) {
    throw new Error(
      "Meta diária inválida. Preencha os campos de horas e minutos.",
    );
  }

  const hours = Number(hoursInput);
  const minutes = Number(minutesInput);
  if (!isValidGoalPart(hours) || !isValidGoalPart(minutes) || minutes >= 60) {
    throw new Error(
      "Meta diária inválida. Informe horas inteiras e minutos entre 0 e 59.",
    );
  }

  const dailyGoalMinutes = hours * 60 + minutes;
  return buildTimeTrackingSettingsChanges({
    daily_goal_minutes: dailyGoalMinutes,
  }).daily_goal_minutes;
}

/** Separa o total persistido nos campos de horas e minutos exibidos na interface. */
export function splitDailyGoalMinutes(
  dailyGoalMinutes: number,
): DailyGoalParts {
  const validatedGoal = buildTimeTrackingSettingsChanges({
    daily_goal_minutes: dailyGoalMinutes,
  }).daily_goal_minutes;
  return {
    hours: Math.floor(validatedGoal / 60),
    minutes: validatedGoal % 60,
  };
}

function isValidGoalPart(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
