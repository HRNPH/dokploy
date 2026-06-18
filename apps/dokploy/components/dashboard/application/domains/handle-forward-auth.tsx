import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";

interface Props {
	domainId: string;
	applicationId: string;
	forwardAuthEnabled: boolean;
}

export const HandleForwardAuth = ({
	domainId,
	applicationId,
	forwardAuthEnabled,
}: Props) => {
	const [isOpen, setIsOpen] = useState(false);
	const utils = api.useUtils();

	const { data: status } = api.forwardAuth.status.useQuery(
		{ serverId: null },
		{ enabled: isOpen },
	);

	const updateDomain = api.domain.update.useMutation({
		onSuccess: () => {
			toast.success(
				forwardAuthEnabled
					? "SSO authentication disabled"
					: "SSO authentication enabled",
			);
			utils.domain.byApplicationId.invalidate({ applicationId });
			utils.application.readTraefikConfig.invalidate({ applicationId });
		},
		onError: (error) => toast.error(error.message),
	});

	const isEnabled = forwardAuthEnabled;
	const isProxyRunning = status?.running ?? false;

	const handleToggle = async (next: boolean) => {
		await updateDomain.mutateAsync({
			domainId,
			forwardAuthEnabled: next,
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="group hover:bg-emerald-500/10"
					title="SSO authentication"
				>
					<ShieldCheck
						className={`size-4 ${
							isEnabled
								? "text-emerald-500"
								: "text-primary group-hover:text-emerald-500"
						}`}
					/>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>SSO Authentication</DialogTitle>
					<DialogDescription>
						Require visitors to authenticate via SSO before reaching this
						domain.
					</DialogDescription>
				</DialogHeader>

				{!isProxyRunning && (
					<p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
						The forward auth proxy is not deployed yet. Configure it in{" "}
						<strong>Settings → SSO → Application Authentication</strong> first.
					</p>
				)}

				<div className="flex items-center justify-between rounded-lg border p-4 mt-2">
					<div className="flex flex-col">
						<span className="text-sm font-medium">
							Protect this domain with SSO
						</span>
						<span className="text-xs text-muted-foreground">
							{isEnabled
								? "Visitors must authenticate via your identity provider."
								: "The domain is publicly accessible."}
						</span>
					</div>
					<Switch
						checked={isEnabled}
						disabled={updateDomain.isPending || !isProxyRunning}
						onCheckedChange={handleToggle}
					/>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setIsOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
