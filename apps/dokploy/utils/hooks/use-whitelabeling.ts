import { api } from "@/utils/api";

/**
 * Hook to access whitelabeling config for authenticated pages.
 */
export function useWhitelabeling() {
	const { data, ...rest } = api.whitelabeling.get.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
	return { config: data ?? null, ...rest };
}

/**
 * Hook to access the public whitelabeling config.
 * For unauthenticated pages (login, register, error, etc.)
 */
export function useWhitelabelingPublic() {
	const { data, ...rest } = api.whitelabeling.getPublic.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
	return { config: data ?? null, ...rest };
}
