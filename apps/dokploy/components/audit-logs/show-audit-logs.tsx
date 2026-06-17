import { format } from "date-fns";
import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

const ACTION_COLORS: Record<string, string> = {
	create: "text-green-600",
	update: "text-blue-600",
	delete: "text-red-600",
	deploy: "text-purple-600",
	login: "text-emerald-600",
	logout: "text-orange-600",
};

export const ShowAuditLogs = () => {
	const [actionFilter, setActionFilter] = useState<string>("all");
	const [resourceFilter, setResourceFilter] = useState<string>("all");

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		api.auditLog.list.useInfiniteQuery(
			{
				limit: 50,
				action: actionFilter === "all" ? undefined : actionFilter,
				resourceType: resourceFilter === "all" ? undefined : resourceFilter,
			},
			{
				getNextPageParam: (lastPage) => lastPage.nextCursor,
			},
		);

	const logs = data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<Card className="h-full bg-sidebar p-2.5 rounded-xl max-w-5xl mx-auto w-full">
			<div className="rounded-xl bg-background shadow-md">
				<CardHeader>
					<CardTitle className="text-xl">Audit Logs</CardTitle>
					<CardDescription>
						Track actions performed by team members.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-4">
						<Select value={actionFilter} onValueChange={setActionFilter}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by action" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Actions</SelectItem>
								<SelectItem value="create">Create</SelectItem>
								<SelectItem value="update">Update</SelectItem>
								<SelectItem value="delete">Delete</SelectItem>
								<SelectItem value="deploy">Deploy</SelectItem>
								<SelectItem value="login">Login</SelectItem>
								<SelectItem value="logout">Logout</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={resourceFilter}
							onValueChange={setResourceFilter}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by resource" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Resources</SelectItem>
								<SelectItem value="project">Project</SelectItem>
								<SelectItem value="application">Application</SelectItem>
								<SelectItem value="compose">Compose</SelectItem>
								<SelectItem value="server">Server</SelectItem>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="settings">Settings</SelectItem>
								<SelectItem value="session">Session</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Resource</TableHead>
									<TableHead>Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center text-muted-foreground"
										>
											No audit logs found.
										</TableCell>
									</TableRow>
								)}
								{logs.map((log) => (
									<TableRow key={log.id}>
										<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
											{format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
										</TableCell>
										<TableCell className="text-sm">
											{log.userEmail}
										</TableCell>
										<TableCell>
											<span
												className={`text-sm font-medium ${ACTION_COLORS[log.action] || "text-foreground"}`}
											>
												{log.action}
											</span>
										</TableCell>
										<TableCell className="text-sm">
											{log.resourceType}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
											{log.resourceName || log.resourceId || "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{hasNextPage && (
						<div className="flex justify-center">
							<button
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
								className="text-sm text-muted-foreground hover:underline"
							>
								{isFetchingNextPage ? "Loading..." : "Load more"}
							</button>
						</div>
					)}
				</CardContent>
			</div>
		</Card>
	);
};
