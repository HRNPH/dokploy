import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";

const requestSchema = z.object({
	resource: z.string().min(1),
	requestedValue: z.coerce.number().min(1),
	reason: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export const QuotaView = () => {
	const { data, refetch } = api.quota.get.useQuery();
	const [isOpen, setIsOpen] = useState(false);

	const requestIncrease = api.quota.requestIncrease.useMutation({
		onSuccess: () => {
			toast.success("Quota increase request submitted");
			setIsOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(error.message),
	});

	const form = useForm<RequestForm>({
		resolver: zodResolver(requestSchema),
		defaultValues: {
			resource: "",
			requestedValue: 0,
			reason: "",
		},
	});

	const onSubmit = async (values: RequestForm) => {
		await requestIncrease.mutateAsync({
			resource: values.resource as any,
			requestedValue: values.requestedValue,
			reason: values.reason,
		});
	};

	if (!data) return null;

	const { quota, usage } = data;

	const resources = [
		{
			name: "Projects",
			current: usage.projects,
			max: quota.maxProjects,
			key: "projects",
		},
		{
			name: "Services",
			current: usage.services,
			max: quota.maxServices,
			key: "services",
		},
		{
			name: "Servers",
			current: usage.servers,
			max: quota.maxServers,
			key: "servers",
		},
		{
			name: "Members",
			current: usage.members,
			max: quota.maxMembers,
			key: "members",
		},
		{
			name: "CPU",
			current: "-",
			max: `${quota.maxCpu} cores`,
			key: "cpu",
		},
		{
			name: "RAM",
			current: "-",
			max: `${quota.maxRam} GB`,
			key: "ram",
		},
		{
			name: "Disk",
			current: "-",
			max: `${quota.maxDisk} GB`,
			key: "disk",
		},
	];

	return (
		<Card className="bg-sidebar">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">Resource Quota</CardTitle>
						<CardDescription>
							Your workspace resource limits. Contact admin to increase.
						</CardDescription>
					</div>
					<Dialog open={isOpen} onOpenChange={setIsOpen}>
						<DialogTrigger asChild>
							<Button size="sm">Request Increase</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Request Quota Increase</DialogTitle>
								<DialogDescription>
									Submit a request to increase your resource quota.
								</DialogDescription>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-4"
								>
									<FormField
										control={form.control}
										name="resource"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Resource</FormLabel>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select resource" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{resources.map((r) => (
															<SelectItem key={r.key} value={r.key}>
																{r.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="requestedValue"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Requested Value</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={1}
														placeholder="New limit"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="reason"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Reason (optional)</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Why do you need this increase?"
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
											isLoading={requestIncrease.isPending}
										>
											Submit Request
										</Button>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{resources.map((r) => {
						const isNumeric = typeof r.current === "number";
						const percent =
							isNumeric && typeof r.max === "number"
								? (r.current / r.max) * 100
								: 0;
						return (
							<div key={r.key} className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">{r.name}</span>
									<span className="font-medium">
										{r.current} / {r.max}
									</span>
								</div>
								{isNumeric && typeof r.max === "number" && (
									<Progress value={percent} className="h-2" />
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
};
