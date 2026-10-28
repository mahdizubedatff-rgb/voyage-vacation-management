import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { vacationService, type VacationFormValues } from "../services";
import type { Paginated, Vacation, VacationFilter } from "../types";

export const VACATIONS_PER_PAGE = 9;

export const vacationKeys = {
  all: ["vacations"] as const,
  list: (filter: VacationFilter, page: number) => ["vacations", "list", filter, page] as const,
  detail: (id: string) => ["vacations", "detail", id] as const,
};

export function useVacationList(filter: VacationFilter, page: number) {
  return useQuery({
    queryKey: vacationKeys.list(filter, page),
    queryFn: () => vacationService.list({ filter, page, limit: VACATIONS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });
}

export function useVacation(id: string | undefined) {
  return useQuery({
    queryKey: vacationKeys.detail(id ?? ""),
    queryFn: () => vacationService.get(id as string),
    enabled: Boolean(id),
  });
}

/**
 * Toggles a like with an optimistic update. The cached list is patched immediately, rolled back on
 * failure, and then reconciled with the server's like count so the UI never drifts from the database.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  const patchLists = (vacationId: string, patch: (v: Vacation) => Vacation) => {
    queryClient.setQueriesData<Paginated<Vacation>>({ queryKey: ["vacations", "list"] }, (data) =>
      data ? { ...data, items: data.items.map((v) => (v.id === vacationId ? patch(v) : v)) } : data,
    );
  };

  return useMutation({
    mutationFn: ({ vacation }: { vacation: Vacation }) =>
      vacation.isLiked ? vacationService.unlike(vacation.id) : vacationService.like(vacation.id),
    onMutate: async ({ vacation }) => {
      await queryClient.cancelQueries({ queryKey: ["vacations", "list"] });
      const snapshot = queryClient.getQueriesData<Paginated<Vacation>>({ queryKey: ["vacations", "list"] });
      patchLists(vacation.id, (v) => ({
        ...v,
        isLiked: !vacation.isLiked,
        likesCount: v.likesCount + (vacation.isLiked ? -1 : 1),
      }));
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]: [QueryKey, unknown]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (state) => {
      patchLists(state.vacationId, (v) => ({ ...v, isLiked: state.isLiked, likesCount: state.likesCount }));
    },
    onSettled: () => {
      // "My favourites" pages and page counts depend on likes, so refetch lists in the background.
      void queryClient.invalidateQueries({ queryKey: ["vacations", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useSaveVacation(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: VacationFormValues) => (id ? vacationService.update(id, values) : vacationService.create(values)),
    onSuccess: (vacation) => {
      queryClient.setQueryData(vacationKeys.detail(vacation.id), vacation);
      void queryClient.invalidateQueries({ queryKey: vacationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteVacation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vacationService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.setQueriesData<Paginated<Vacation>>({ queryKey: ["vacations", "list"] }, (data) =>
        data ? { ...data, items: data.items.filter((v) => v.id !== id), total: data.total - 1 } : data,
      );
      queryClient.removeQueries({ queryKey: vacationKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: vacationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
