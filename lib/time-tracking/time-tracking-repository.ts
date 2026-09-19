import { supabase } from "@/lib/supabase";
import { buildDefaultTimeCategories } from "@/lib/time-tracking/default-time-categories";
import { buildNonWorkingDayInputs } from "@/lib/time-tracking/non-working-days";
import {
  buildTimeCategoryChanges,
  buildTimeEntryChanges,
  buildTimeTrackingSettingsChanges,
} from "@/lib/time-tracking/time-tracking-rules";
import type {
  TimeCategoryInput,
  TimeCategoryRow,
  TimeEntryInput,
  TimeEntryListFilters,
  TimeEntryPage,
  TimeEntryPageRequest,
  TimeEntryRow,
  TimeNonWorkingDayInput,
  TimeNonWorkingDayListFilters,
  TimeNonWorkingDayRow,
  TimeTrackingSettingsInput,
  TimeTrackingSettingsRow,
} from "@/types/time-tracking";

type TimeTrackingClient = Pick<typeof supabase, "from">;
type TimeTrackingClock = { now: () => Date };

export type TimeTrackingRepository = {
  getSettings: (userId: string) => Promise<TimeTrackingSettingsRow | null>;
  saveSettings: (
    userId: string,
    input: TimeTrackingSettingsInput,
  ) => Promise<TimeTrackingSettingsRow>;
  listCategories: (
    userId: string,
    includeArchived?: boolean,
  ) => Promise<TimeCategoryRow[]>;
  ensureDefaultCategories: (userId: string) => Promise<TimeCategoryRow[]>;
  createCategory: (
    userId: string,
    input: TimeCategoryInput,
  ) => Promise<TimeCategoryRow>;
  updateCategory: (
    userId: string,
    categoryId: string,
    input: TimeCategoryInput,
  ) => Promise<TimeCategoryRow>;
  archiveCategory: (
    userId: string,
    categoryId: string,
  ) => Promise<TimeCategoryRow>;
  restoreCategory: (
    userId: string,
    categoryId: string,
  ) => Promise<TimeCategoryRow>;
  categoryHasEntries: (
    userId: string,
    categoryId: string,
  ) => Promise<boolean>;
  deleteCategory: (userId: string, categoryId: string) => Promise<void>;
  listEntries: (
    userId: string,
    filters?: TimeEntryListFilters,
  ) => Promise<TimeEntryRow[]>;
  listEntriesPage: (
    userId: string,
    request: TimeEntryPageRequest,
  ) => Promise<TimeEntryPage>;
  createEntry: (
    userId: string,
    input: TimeEntryInput,
  ) => Promise<TimeEntryRow>;
  updateEntry: (
    userId: string,
    entryId: string,
    input: TimeEntryInput,
  ) => Promise<TimeEntryRow>;
  deleteEntry: (userId: string, entryId: string) => Promise<void>;
  listNonWorkingDays: (
    userId: string,
    filters?: TimeNonWorkingDayListFilters,
  ) => Promise<TimeNonWorkingDayRow[]>;
  saveNonWorkingDays: (
    userId: string,
    inputs: TimeNonWorkingDayInput[],
  ) => Promise<TimeNonWorkingDayRow[]>;
  deleteNonWorkingDay: (userId: string, dayId: string) => Promise<void>;
};

const systemClock: TimeTrackingClock = { now: () => new Date() };

/** Cria o repository isolado e injetável do domínio. Ex.: createTimeTrackingRepository(fakeClient). */
export function createTimeTrackingRepository(
  client: TimeTrackingClient = supabase,
  clock: TimeTrackingClock = systemClock,
): TimeTrackingRepository {
  return {
    ...createSettingsOperations(client),
    ...createCategoryOperations(client, clock),
    ...createEntryOperations(client, clock),
    ...createNonWorkingDayOperations(client),
  };
}

function createNonWorkingDayOperations(client: TimeTrackingClient) {
  return {
    listNonWorkingDays: (userId, filters = {}) =>
      listNonWorkingDays(client, userId, filters),
    saveNonWorkingDays: (userId, inputs) =>
      saveNonWorkingDays(client, userId, inputs),
    deleteNonWorkingDay: (userId, dayId) =>
      deleteOwnedRow(client, "time_non_working_days", userId, dayId),
  } satisfies Pick<
    TimeTrackingRepository,
    "listNonWorkingDays" | "saveNonWorkingDays" | "deleteNonWorkingDay"
  >;
}

function createSettingsOperations(client: TimeTrackingClient) {
  return {
    getSettings: (userId) => getSettings(client, userId),
    saveSettings: (userId, input) => saveSettings(client, userId, input),
  } satisfies Pick<
    TimeTrackingRepository,
    "getSettings" | "saveSettings"
  >;
}

function createCategoryOperations(
  client: TimeTrackingClient,
  clock: TimeTrackingClock,
) {
  return {
    listCategories: (userId, includeArchived = true) =>
      listCategories(client, userId, includeArchived),
    ensureDefaultCategories: (userId) =>
      ensureDefaultCategories(client, userId),
    createCategory: (userId, input) =>
      createCategory(client, userId, input),
    updateCategory: (userId, categoryId, input) =>
      updateCategory(client, userId, categoryId, input),
    archiveCategory: (userId, categoryId) =>
      setCategoryArchive(client, clock, userId, categoryId, true),
    restoreCategory: (userId, categoryId) =>
      setCategoryArchive(client, clock, userId, categoryId, false),
    categoryHasEntries: (userId, categoryId) =>
      categoryHasEntries(client, userId, categoryId),
    deleteCategory: (userId, categoryId) =>
      deleteUnusedCategory(client, userId, categoryId),
  } satisfies Pick<
    TimeTrackingRepository,
    | "listCategories"
    | "ensureDefaultCategories"
    | "createCategory"
    | "updateCategory"
    | "archiveCategory"
    | "restoreCategory"
    | "categoryHasEntries"
    | "deleteCategory"
  >;
}

function createEntryOperations(
  client: TimeTrackingClient,
  clock: TimeTrackingClock,
) {
  return {
    listEntries: (userId, filters = {}) =>
      listEntries(client, userId, filters),
    listEntriesPage: (userId, request) =>
      listEntriesPage(client, userId, request),
    createEntry: (userId, input) =>
      createEntry(client, clock, userId, input),
    updateEntry: (userId, entryId, input) =>
      updateEntry(client, clock, userId, entryId, input),
    deleteEntry: (userId, entryId) =>
      deleteOwnedRow(client, "time_entries", userId, entryId),
  } satisfies Pick<
    TimeTrackingRepository,
    | "listEntries"
    | "listEntriesPage"
    | "createEntry"
    | "updateEntry"
    | "deleteEntry"
  >;
}

export const timeTrackingRepository = createTimeTrackingRepository();

async function getSettings(
  client: TimeTrackingClient,
  userId: string,
): Promise<TimeTrackingSettingsRow | null> {
  const { data, error } = await client
    .from("time_tracking_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as TimeTrackingSettingsRow | null;
}

async function saveSettings(
  client: TimeTrackingClient,
  userId: string,
  input: TimeTrackingSettingsInput,
): Promise<TimeTrackingSettingsRow> {
  const changes = buildTimeTrackingSettingsChanges(input);
  const { data, error } = await client
    .from("time_tracking_settings")
    .upsert({ ...changes, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as TimeTrackingSettingsRow;
}

async function listCategories(
  client: TimeTrackingClient,
  userId: string,
  includeArchived: boolean,
): Promise<TimeCategoryRow[]> {
  let request = client
    .from("time_categories")
    .select("*")
    .eq("user_id", userId);
  if (!includeArchived) request = request.is("archived_at", null);
  const { data, error } = await request.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimeCategoryRow[];
}

async function ensureDefaultCategories(
  client: TimeTrackingClient,
  userId: string,
): Promise<TimeCategoryRow[]> {
  const defaults = buildDefaultTimeCategories(userId);
  const { error } = await client.from("time_categories").upsert(defaults, {
    onConflict: "user_id,name",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return listCategories(client, userId, false);
}

async function createCategory(
  client: TimeTrackingClient,
  userId: string,
  input: TimeCategoryInput,
): Promise<TimeCategoryRow> {
  const changes = buildTimeCategoryChanges(input);
  const { data, error } = await client
    .from("time_categories")
    .insert({ ...changes, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as TimeCategoryRow;
}

async function updateCategory(
  client: TimeTrackingClient,
  userId: string,
  categoryId: string,
  input: TimeCategoryInput,
): Promise<TimeCategoryRow> {
  const changes = buildTimeCategoryChanges(input);
  return updateOwnedRow<TimeCategoryRow>(
    client,
    "time_categories",
    userId,
    categoryId,
    changes,
  );
}

async function setCategoryArchive(
  client: TimeTrackingClient,
  clock: TimeTrackingClock,
  userId: string,
  categoryId: string,
  shouldArchive: boolean,
): Promise<TimeCategoryRow> {
  return updateOwnedRow<TimeCategoryRow>(
    client,
    "time_categories",
    userId,
    categoryId,
    { archived_at: shouldArchive ? clock.now().toISOString() : null },
  );
}

async function categoryHasEntries(
  client: TimeTrackingClient,
  userId: string,
  categoryId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category_id", categoryId);
  if (error) throw error;
  if (count === null) {
    throw new Error(
      `Uso da categoria ${categoryId} indeterminado. A contagem exata era obrigatória.`,
    );
  }
  return count > 0;
}

async function deleteUnusedCategory(
  client: TimeTrackingClient,
  userId: string,
  categoryId: string,
): Promise<void> {
  if (await categoryHasEntries(client, userId, categoryId)) {
    const usageError = new Error(
      `A categoria ${categoryId} possui apontamentos e deve ser arquivada.`,
    ) as Error & { code: string };
    usageError.code = "TIME_CATEGORY_IN_USE";
    throw usageError;
  }
  await deleteOwnedRow(client, "time_categories", userId, categoryId);
}

async function listEntries(
  client: TimeTrackingClient,
  userId: string,
  filters: TimeEntryListFilters,
): Promise<TimeEntryRow[]> {
  let request = client
    .from("time_entries")
    .select("*")
    .eq("user_id", userId);
  if (filters.startDate) request = request.gte("entry_date", filters.startDate);
  if (filters.endDate) request = request.lte("entry_date", filters.endDate);
  if (filters.categoryId) request = request.eq("category_id", filters.categoryId);
  if (filters.task?.trim()) {
    request = request.ilike("task", buildContainsPattern(filters.task));
  }
  const { data, error } = await request.order("entry_date", {
    ascending: false,
  });
  if (error) throw error;
  return (data ?? []) as TimeEntryRow[];
}

async function listNonWorkingDays(
  client: TimeTrackingClient,
  userId: string,
  filters: TimeNonWorkingDayListFilters,
): Promise<TimeNonWorkingDayRow[]> {
  let request = client
    .from("time_non_working_days")
    .select("*")
    .eq("user_id", userId);
  if (filters.startDate) {
    request = request.gte("non_working_date", filters.startDate);
  }
  if (filters.endDate) {
    request = request.lte("non_working_date", filters.endDate);
  }
  const { data, error } = await request.order("non_working_date", {
    ascending: false,
  });
  if (error) throw error;
  return (data ?? []) as TimeNonWorkingDayRow[];
}

async function saveNonWorkingDays(
  client: TimeTrackingClient,
  userId: string,
  inputs: TimeNonWorkingDayInput[],
): Promise<TimeNonWorkingDayRow[]> {
  if (inputs.length === 0) {
    throw new Error("Informe pelo menos um dia sem apontamento.");
  }
  const rows = inputs.flatMap((input) =>
    buildNonWorkingDayInputs({
      endDate: input.non_working_date,
      note: input.note ?? "",
      reason: input.reason,
      startDate: input.non_working_date,
    }).map((normalized) => ({ ...normalized, user_id: userId })),
  );
  const { data, error } = await client
    .from("time_non_working_days")
    .upsert(rows, { onConflict: "user_id,non_working_date" })
    .select("*");
  if (error) throw error;
  return (data ?? []) as TimeNonWorkingDayRow[];
}

async function listEntriesPage(
  client: TimeTrackingClient,
  userId: string,
  filters: TimeEntryPageRequest,
): Promise<TimeEntryPage> {
  assertValidPageRequest(filters);
  let request = client
    .from("time_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId);
  if (filters.startDate) request = request.gte("entry_date", filters.startDate);
  if (filters.endDate) request = request.lte("entry_date", filters.endDate);
  if (filters.categoryId) request = request.eq("category_id", filters.categoryId);
  if (filters.task?.trim()) {
    request = request.ilike("task", buildContainsPattern(filters.task));
  }

  const firstRow = (filters.page - 1) * filters.pageSize;
  const { count, data, error } = await request
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(firstRow, firstRow + filters.pageSize - 1);
  if (error) throw error;
  const totalCount = count ?? 0;
  return {
    entries: (data ?? []) as TimeEntryRow[],
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

function assertValidPageRequest(request: TimeEntryPageRequest): void {
  const validPage = Number.isInteger(request.page) && request.page > 0;
  const validSize = Number.isInteger(request.pageSize) && request.pageSize > 0;
  if (!validPage || !validSize || request.pageSize > 100) {
    throw new Error(
      `Paginação inválida: página ${request.page}, tamanho ${request.pageSize}. Use inteiros positivos e até 100 itens.`,
    );
  }
}

function buildContainsPattern(value: string): string {
  const escaped = value.trim().replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}

async function createEntry(
  client: TimeTrackingClient,
  clock: TimeTrackingClock,
  userId: string,
  input: TimeEntryInput,
): Promise<TimeEntryRow> {
  const changes = buildTimeEntryChanges(input, getClockCivilDate(clock));
  const { data, error } = await client
    .from("time_entries")
    .insert({ ...changes, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as TimeEntryRow;
}

async function updateEntry(
  client: TimeTrackingClient,
  clock: TimeTrackingClock,
  userId: string,
  entryId: string,
  input: TimeEntryInput,
): Promise<TimeEntryRow> {
  const changes = buildTimeEntryChanges(input, getClockCivilDate(clock));
  return updateOwnedRow<TimeEntryRow>(
    client,
    "time_entries",
    userId,
    entryId,
    changes,
  );
}

async function updateOwnedRow<Row>(
  client: TimeTrackingClient,
  table: "time_categories" | "time_entries",
  userId: string,
  recordId: string,
  changes: Record<string, unknown>,
): Promise<Row> {
  const { data, error } = await client
    .from(table)
    .update(changes)
    .eq("id", recordId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Row;
}

async function deleteOwnedRow(
  client: TimeTrackingClient,
  table: "time_categories" | "time_entries" | "time_non_working_days",
  userId: string,
  recordId: string,
): Promise<void> {
  const { error } = await client
    .from(table)
    .delete()
    .eq("id", recordId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
}

function getClockCivilDate(clock: TimeTrackingClock): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(clock.now());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
