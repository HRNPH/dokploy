import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";

const oidcSchema = z.object({
	providerId: z.string().min(1, "Provider ID is required"),
	issuer: z.string().url("Must be a valid URL"),
	clientId: z.string().min(1, "Client ID is required"),
	clientSecret: z.string().min(1, "Client Secret is required"),
	domains: z.string().min(1, "At least one domain is required"),
});

type OidcForm = z.infer<typeof oidcSchema>;

export const SSOSettings = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { data: providers, refetch } = api.sso.listProviders.useQuery();
	const utils = api.useUtils();

	const registerMutation = api.sso.register.useMutation({
		onSuccess: () => {
			toast.success("SSO provider registered");
			setIsOpen(false);
			refetch();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to register SSO provider");
		},
	});

	const deleteMutation = api.sso.deleteProvider.useMutation({
		onSuccess: () => {
			toast.success("SSO provider deleted");
			refetch();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete SSO provider");
		},
	});

	const form = useForm<OidcForm>({
		resolver: zodResolver(oidcSchema),
		defaultValues: {
			providerId: "",
			issuer: "",
			clientId: "",
			clientSecret: "",
			domains: "",
		},
	});

	const onSubmit = async (values: OidcForm) => {
		await registerMutation.mutateAsync({
			providerId: values.providerId,
			issuer: values.issuer,
			domains: values.domains.split(",").map((d) => d.trim()),
			oidcConfig: {
				clientId: values.clientId,
				clientSecret: values.clientSecret,
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<CardTitle className="text-xl">SSO Providers</CardTitle>
					<CardDescription>
						Configure OIDC identity providers for Single Sign-On.
					</CardDescription>
				</div>
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button size="sm">
							<Plus className="mr-2 size-4" />
							Add Provider
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Register OIDC Provider</DialogTitle>
							<DialogDescription>
								Add a new OpenID Connect identity provider (Keycloak, Auth0,
								Google, etc.)
							</DialogDescription>
						</DialogHeader>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								<FormField
									control={form.control}
									name="providerId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Provider ID</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g. keycloak, auth0, google"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="issuer"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Issuer URL</FormLabel>
											<FormControl>
												<Input
													placeholder="https://auth.example.com/realms/myrealm"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="clientId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Client ID</FormLabel>
											<FormControl>
												<Input placeholder="dokploy" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="clientSecret"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Client Secret</FormLabel>
											<FormControl>
												<Input type="password" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="domains"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Allowed Domains</FormLabel>
											<FormControl>
												<Input
													placeholder="example.com, company.org"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<DialogFooter>
									<Button
										type="submit"
										isLoading={registerMutation.isPending}
									>
										Register Provider
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</DialogContent>
				</Dialog>
			</div>

			{providers && providers.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No SSO providers configured yet.
				</p>
			)}

			{providers?.map((provider) => (
				<Card key={provider.id} className="bg-sidebar">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="font-medium">{provider.providerId}</p>
							<p className="text-sm text-muted-foreground">
								{provider.issuer}
							</p>
							<p className="text-xs text-muted-foreground">
								Domain: {provider.domain}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() =>
								deleteMutation.mutate({ providerId: provider.providerId })
							}
						>
							<Trash2 className="size-4 text-destructive" />
						</Button>
					</CardContent>
				</Card>
			))}
		</div>
	);
};
