import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { RotateCcw, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";

const whitelabelingSchema = z.object({
	appName: z.string().nullable(),
	appDescription: z.string().nullable(),
	logoUrl: z.string().nullable(),
	faviconUrl: z.string().nullable(),
	loginLogoUrl: z.string().nullable(),
	customCss: z.string().nullable(),
	supportUrl: z.string().nullable(),
	docsUrl: z.string().nullable(),
	errorPageTitle: z.string().nullable(),
	errorPageDescription: z.string().nullable(),
	metaTitle: z.string().nullable(),
	footerText: z.string().nullable(),
});

type WhitelabelingForm = z.infer<typeof whitelabelingSchema>;

export const WhitelabelingSettings = () => {
	const { data: config, refetch } = api.whitelabeling.get.useQuery();
	const utils = api.useUtils();

	const updateMutation = api.whitelabeling.update.useMutation({
		onSuccess: () => {
			toast.success("Whitelabeling settings saved");
			refetch();
			utils.whitelabeling.getPublic.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to save settings");
		},
	});

	const resetMutation = api.whitelabeling.reset.useMutation({
		onSuccess: () => {
			toast.success("Whitelabeling settings reset to defaults");
			refetch();
			utils.whitelabeling.getPublic.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reset settings");
		},
	});

	const form = useForm<WhitelabelingForm>({
		resolver: zodResolver(whitelabelingSchema),
		defaultValues: {
			appName: null,
			appDescription: null,
			logoUrl: null,
			faviconUrl: null,
			loginLogoUrl: null,
			customCss: null,
			supportUrl: null,
			docsUrl: null,
			errorPageTitle: null,
			errorPageDescription: null,
			metaTitle: null,
			footerText: null,
		},
	});

	useEffect(() => {
		if (config) {
			form.reset(config);
		}
	}, [config, form]);

	const onSubmit = async (values: WhitelabelingForm) => {
		await updateMutation.mutateAsync({ whitelabelingConfig: values });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<CardTitle className="text-xl">Branding</CardTitle>
					<CardDescription>
						Customize the appearance of your Dokploy instance.
					</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => resetMutation.mutate()}
					isLoading={resetMutation.isPending}
				>
					<RotateCcw className="mr-2 size-4" />
					Reset to Defaults
				</Button>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
					id="whitelabeling-form"
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="appName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Application Name</FormLabel>
									<FormControl>
										<Input
											placeholder="Dokploy"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="metaTitle"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Meta Title (Browser Tab)</FormLabel>
									<FormControl>
										<Input
											placeholder="Dokploy"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="appDescription"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Application Description</FormLabel>
								<FormControl>
									<Input
										placeholder="Deploy your applications with ease"
										value={field.value ?? ""}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="logoUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Logo URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://example.com/logo.png"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="loginLogoUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Login Page Logo URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://example.com/login-logo.png"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="faviconUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Favicon URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://example.com/favicon.ico"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="footerText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Footer Text</FormLabel>
									<FormControl>
										<Input
											placeholder="Powered by Dokploy"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="supportUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Support URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://support.example.com"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="docsUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Documentation URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://docs.example.com"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="errorPageTitle"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Error Page Title</FormLabel>
									<FormControl>
										<Input
											placeholder="Something went wrong"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="errorPageDescription"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Error Page Description</FormLabel>
									<FormControl>
										<Input
											placeholder="Please try again later"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="customCss"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Custom CSS</FormLabel>
								<FormControl>
									<Textarea
										placeholder=":root { --primary: 222.2 47.4% 11.2%; }"
										className="font-mono text-sm min-h-[120px]"
										value={field.value ?? ""}
										onChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button
						type="submit"
						isLoading={updateMutation.isPending}
						form="whitelabeling-form"
					>
						<Save className="mr-2 size-4" />
						Save Changes
					</Button>
				</form>
			</Form>
		</div>
	);
};
