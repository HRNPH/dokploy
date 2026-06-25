import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

export const QuotaDashboard = () => {
	const { data: quotas, refetch } = api.quota.getAll.useQuery();
	const { data: requests, refetch: refetchRequests } =
		api.quota.getRequests.useQuery({ status: "pending" });

	const setQuota = api.quota.set.useMutation({
		onSuccess: () => {
			toast.success("Quota updated");
			refetch();
		},
		onError: (error) => toast.error(error.message),
	});

	const reviewRequest = api.quota.reviewRequest.useMutation({
		onSuccess: () => {
			toast.success("Request reviewed");
			refetchRequests();
			refetch();
		},
		onError: (error) => toast.error(error.message),
	});

	const [editingOrg, setEditingOrg] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Record<string, number>>({});

	const startEdit = (orgId: string, quota: any) => {
		setEditingOrg(orgId);
		setEditValues({
			maxProjects: quota.maxProjects,
			maxServices: quota.maxServices,
			maxServers: quota.maxServers,
			maxMembers: quota.maxMembers,
			maxCpu: quota.maxCpu,
			maxRam: quota.maxRam,
			maxDisk: quota.maxDisk,
		});
	};

	const saveEdit = async () => {
		if (!editingOrg) return;
		await setQuota.mutateAsync({
			organizationId: editingOrg,
			...editValues,
		});
		setEditingOrg(null);
	};

	return (
		<div className="space-y-6">
			{/* Pending Requests */}
			{requests && requests.length > 0 && (
				<Card className="bg-sidebar">
					<CardHeader>
						<CardTitle className="text-lg">Pending Quota Requests</CardTitle>
						<CardDescription>
							Review and approve/reject quota increase requests from users.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Resource</TableHead>
									<TableHead>Current</TableHead>
									<TableHead>Requested</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{requests.map((req) => (
									<TableRow key={req.requestId}>
										<TableCell className="font-medium capitalize">
											{req.resource}
										</TableCell>
										<TableCell>{req.currentValue}</TableCell>
										<TableCell>{req.requestedValue}</TableCell>
										<TableCell className="max-w-[200px] truncate">
											{req.reason || "-"}
										</TableCell>
										<TableCell className="flex gap-2">
											<Button
												size="sm"
												onClick={() =>
													reviewRequest.mutateAsync({
														requestId: req.requestId,
														status: "approved",
													})
												}
											>
												Approve
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onClick={() =>
													reviewRequest.mutateAsync({
														requestId: req.requestId,
														status: "rejected",
													})
												}
											>
												Reject
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* All Workspaces */}
			<Card className="bg-sidebar">
				<CardHeader>
					<CardTitle className="text-lg">Workspace Quotas</CardTitle>
					<CardDescription>
						Manage resource quotas for all workspaces.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!quotas || quotas.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No workspaces found.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workspace</TableHead>
									<TableHead>Projects</TableHead>
									<TableHead>Services</TableHead>
									<TableHead>Servers</TableHead>
									<TableHead>Members</TableHead>
									<TableHead>CPU</TableHead>
									<TableHead>RAM</TableHead>
									<TableHead>Disk</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{quotas.map((q) => (
									<TableRow key={q.quotaId}>
										<TableCell className="font-medium">
											{q.organization?.name || q.organizationId}
										</TableCell>
										<TableCell>
											<UsageCell
												current={q.usage.projects}
												max={q.maxProjects}
											/>
										</TableCell>
										<TableCell>
											<UsageCell
												current={q.usage.services}
												max={q.maxServices}
											/>
										</TableCell>
										<TableCell>
											<UsageCell
												current={q.usage.servers}
												max={q.maxServers}
											/>
										</TableCell>
										<TableCell>
											<UsageCell
												current={q.usage.members}
												max={q.maxMembers}
											/>
										</TableCell>
										<TableCell>{q.maxCpu} cores</TableCell>
										<TableCell>{q.maxRam} GB</TableCell>
										<TableCell>{q.maxDisk} GB</TableCell>
										<TableCell>
											<Dialog>
												<DialogTrigger asChild>
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															startEdit(q.organizationId, q)
														}
													>
														Edit
													</Button>
												</DialogTrigger>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>Edit Quota</DialogTitle>
														<DialogDescription>
															Update resource limits for{" "}
															{q.organization?.name || q.organizationId}
														</DialogDescription>
													</DialogHeader>
													<div className="grid grid-cols-2 gap-4">
														<QuotaField
															label="Max Projects"
															value={editValues.maxProjects}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxProjects: v,
																})
															}
														/>
														<QuotaField
															label="Max Services"
															value={editValues.maxServices}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxServices: v,
																})
															}
														/>
														<QuotaField
															label="Max Servers"
															value={editValues.maxServers}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxServers: v,
																})
															}
														/>
														<QuotaField
															label="Max Members"
															value={editValues.maxMembers}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxMembers: v,
																})
															}
														/>
														<QuotaField
															label="CPU (cores)"
															value={editValues.maxCpu}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxCpu: v,
																})
															}
														/>
														<QuotaField
															label="RAM (GB)"
															value={editValues.maxRam}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxRam: v,
																})
															}
														/>
														<QuotaField
															label="Disk (GB)"
															value={editValues.maxDisk}
															onChange={(v) =>
																setEditValues({
																	...editValues,
																	maxDisk: v,
																})
															}
														/>
													</div>
													<DialogFooter>
														<Button
															onClick={saveEdit}
															isLoading={setQuota.isPending}
														>
															Save
														</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

const UsageCell = ({ current, max }: { current: number; max: number }) => {
	const percent = max > 0 ? (current / max) * 100 : 0;
	const color =
		percent >= 90 ? "text-red-500" : percent >= 70 ? "text-yellow-500" : "";
	return (
		<div className="flex flex-col gap-1">
			<span className={`text-sm ${color}`}>
				{current}/{max}
			</span>
			<Progress value={percent} className="h-1" />
		</div>
	);
};

const QuotaField = ({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
}) => (
	<div className="space-y-1">
		<Label>{label}</Label>
		<Input
			type="number"
			min={0}
			value={value}
			onChange={(e) => onChange(Number.parseInt(e.target.value) || 0)}
		/>
	</div>
);
