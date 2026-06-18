import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

const configSchema = z.object({
	authDomain: z.string().min(1, "Auth domain is required"),
	https: z.boolean(),
	certificateType: z.enum(["none", "letsencrypt", "custom"]),
});

type ConfigForm = z.infer<typeof configSchema>;

interface Props {
	serverId?: string | null;
}

export const ForwardAuthConfig = ({ serverId = null }: Props) => {
	const [selectedProvider, setSelectedProvider] = useState<string>("");
	const utils = api.useUtils();

	const { data: status, refetch: refetchStatus } =
		api.forwardAuth.status.useQuery({ serverId });

	const { data: providers } = api.sso.listProviders.useQuery();

	const configureMutation = api.forwardAuth.configure.useMutation({
		onSuccess: () => {
			toast.success("Forward auth configured");
			refetchStatus();
		},
		onError: (error) => toast.error(error.message),
	});

	const deployMutation = api.forwardAuth.deploy.useMutation({
		onSuccess: () => {
			toast.success("Forward auth proxy deployed");
			refetchStatus();
		},
		onError: (error) => toast.error(error.message),
	});

	const removeMutation = api.forwardAuth.remove.useMutation({
		onSuccess: () => {
			toast.success("Forward auth removed");
			refetchStatus();
		},
		onError: (error) => toast.error(error.message),
	});

	const form = useForm<ConfigForm>({
		resolver: zodResolver(configSchema),
		defaultValues: {
			authDomain: status?.settings?.authDomain ?? "",
			https: status?.settings?.https ?? true,
			certificateType:
				(status?.settings?.certificateType as any) ?? "letsencrypt",
		},
	});

	const onConfigure = async (values: ConfigForm) => {
		await configureMutation.mutateAsync({
			serverId,
			authDomain: values.authDomain,
			https: values.https,
			certificateType: values.certificateType,
		});
	};

	const onDeploy = async () => {
		if (!selectedProvider) {
			toast.error("Select an SSO provider first");
			return;
		}
		await deployMutation.mutateAsync({
			serverId,
			providerId: selectedProvider,
		});
	};

	const isRunning = status?.running ?? false;
	const isConfigured = !!status?.settings;

	return (
		<Card className="bg-sidebar">
			<CardHeader>
				<CardTitle className="text-lg">Application Authentication</CardTitle>
				<CardDescription>
					Protect deployed applications behind SSO using an oauth2-proxy
					forward auth gate.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isRunning && (
					<AlertBlock type="success">
						Forward auth proxy is running. Enable it per-domain in your
						application's domain settings.
					</AlertBlock>
				)}

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onConfigure)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="authDomain"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Auth Domain</FormLabel>
									<FormControl>
										<Input
											placeholder="auth.example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="certificateType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Certificate</FormLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="letsencrypt">
													Let's Encrypt
												</SelectItem>
												<SelectItem value="none">None</SelectItem>
												<SelectItem value="custom">Custom</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex items-end">
								<Button
									type="submit"
									variant="outline"
									className="w-full"
									isLoading={configureMutation.isPending}
								>
									Save Config
								</Button>
							</div>
						</div>
					</form>
				</Form>

				{isConfigured && (
					<div className="space-y-4 pt-4 border-t">
						<div className="space-y-2">
							<FormLabel>SSO Provider</FormLabel>
							<Select
								value={selectedProvider}
								onValueChange={setSelectedProvider}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select an OIDC provider" />
								</SelectTrigger>
								<SelectContent>
									{providers?.map((p) => (
										<SelectItem key={p.providerId} value={p.providerId}>
											{p.providerId} ({p.domain})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={onDeploy}
								isLoading={deployMutation.isPending}
								disabled={!selectedProvider}
							>
								{isRunning ? "Update Proxy" : "Deploy Proxy"}
							</Button>

							{isRunning && (
								<Button
									variant="destructive"
									onClick={() =>
										removeMutation.mutate({ serverId })
									}
									isLoading={removeMutation.isPending}
								>
									Remove Proxy
								</Button>
							)}
						</div>
					</div>
				)}

				<div className="pt-4 border-t">
					<p className="text-sm text-muted-foreground">
						Once deployed, enable forward auth on individual domains in your
						application settings under <strong>Domains → Edit → Forward Auth</strong>.
					</p>
				</div>
			</CardContent>
		</Card>
	);
};
