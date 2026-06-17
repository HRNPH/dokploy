import Head from "next/head";
import { useEffect } from "react";
import { api } from "@/utils/api";

export const WhitelabelingProvider = () => {
	const { data: config } = api.whitelabeling.getPublic.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (config?.customCss) {
			const styleId = "whitelabeling-custom-css";
			let styleEl = document.getElementById(styleId) as HTMLStyleElement;
			if (!styleEl) {
				styleEl = document.createElement("style");
				styleEl.id = styleId;
				document.head.appendChild(styleEl);
			}
			styleEl.textContent = config.customCss;

			return () => {
				styleEl?.remove();
			};
		}
	}, [config?.customCss]);

	if (!config) return null;

	return (
		<Head>
			{config.metaTitle && <title>{config.metaTitle}</title>}
			{config.faviconUrl && (
				<link rel="icon" type="image/x-icon" href={config.faviconUrl} />
			)}
		</Head>
	);
};
