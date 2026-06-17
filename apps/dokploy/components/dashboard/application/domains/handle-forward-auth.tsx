import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
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
}

export const HandleForwardAuth = ({ domainId, applicationId }: Props) => {
	// Forward auth requires SSO infrastructure - disabled until reimplemented
	return null;
};
