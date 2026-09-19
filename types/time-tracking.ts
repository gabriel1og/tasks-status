export type TimeTrackingSettingsRow = {
  user_id: string;
  daily_goal_minutes: number;
  created_at: string;
  updated_at: string;
};

export type TimeTrackingSettingsInput = {
  daily_goal_minutes: number;
};

export type TimeNonWorkingDayReason = "holiday" | "vacation" | "other";

export type TimeNonWorkingDayRow = {
  id: string;
  user_id: string;
  non_working_date: string;
  reason: TimeNonWorkingDayReason;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeNonWorkingDayInput = {
  non_working_date: string;
  reason: TimeNonWorkingDayReason;
  note: string | null;
};

export type TimeNonWorkingDayListFilters = {
  endDate?: string;
  startDate?: string;
};

export type TimeCategoryRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeCategoryInput = {
  name: string;
  color: string;
};

export type TimeCategoryInsert = TimeCategoryInput & {
  user_id: string;
};

export type TimeEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  duration_minutes: number;
  task: string;
  category_id: string;
  created_at: string;
  updated_at: string;
};

export type TimeEntryInput = {
  entry_date: string;
  duration_minutes: number;
  task: string;
  category_id: string;
};

export type TimeEntryListFilters = {
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  task?: string;
};

export type TimeEntryPageRequest = TimeEntryListFilters & {
  page: number;
  pageSize: number;
};

export type TimeEntryPage = {
  entries: TimeEntryRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
