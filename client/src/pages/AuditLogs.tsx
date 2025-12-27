import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  FileText,
  Download,
  Filter,
  X,
  Clock,
  User,
  Smartphone,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow, format } from "date-fns";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading } = trpc.auditLogs.getAll.useQuery({ limit });
  const auditLogs: any[] = logs || [];

  const actionTypes = [
    "user_login",
    "user_logout",
    "user_created",
    "user_updated",
    "user_deleted",
    "permission_granted",
    "permission_revoked",
    "device_added",
    "device_removed",
    "device_monitored",
    "data_accessed",
    "data_exported",
    "settings_changed",
    "security_event",
  ];

  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActionType = !actionTypeFilter || log.actionType === actionTypeFilter;
    const matchesStatus = !statusFilter || log.status === statusFilter;
    return matchesSearch && matchesActionType && matchesStatus;
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "user_login":
      case "user_logout":
        return <User className="w-4 h-4 glow-cyan" />;
      case "device_added":
      case "device_removed":
      case "device_monitored":
        return <Smartphone className="w-4 h-4 glow-purple" />;
      default:
        return <FileText className="w-4 h-4 glow-cyan" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === "success"
      ? "text-green-400 glow-green"
      : "text-red-400 glow-red";
  };

  const handleExportLogs = () => {
    const csv = [
      ["Timestamp", "User ID", "Device ID", "Action", "Action Type", "Status", "Details"],
      ...filteredLogs.map((log: any) => [
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        log.userId || "",
        log.deviceId || "",
        log.action,
        log.actionType,
        log.status,
        JSON.stringify(log.details || {}),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Filters */}
        <div className="card-neon p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 glow-cyan" />
            <h3 className="font-bold">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium glow-cyan mb-2 block">
                Search
              </label>
              <Input
                placeholder="Search by action or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-neon"
              />
            </div>
            <div>
              <label className="text-sm font-medium glow-cyan mb-2 block">
                Action Type
              </label>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="input-neon">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-card border-glow">
                  <SelectItem value="">All Actions</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium glow-cyan mb-2 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="input-neon">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-card border-glow">
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setActionTypeFilter("");
                  setStatusFilter("");
                }}
                variant="outline"
                className="btn-neon flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                onClick={handleExportLogs}
                className="btn-neon-cyan flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card-neon overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 glow-cyan mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-glow-cyan hover:bg-transparent">
                  <TableHead className="glow-cyan">Timestamp</TableHead>
                  <TableHead className="glow-cyan">Action</TableHead>
                  <TableHead className="glow-cyan">Type</TableHead>
                  <TableHead className="glow-cyan">User</TableHead>
                  <TableHead className="glow-cyan">Device</TableHead>
                  <TableHead className="glow-cyan">Status</TableHead>
                  <TableHead className="glow-cyan">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-glow-cyan/30 hover:bg-accent/10 transition-colors"
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.actionType)}
                        {log.action}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="px-2 py-1 rounded bg-accent/20 text-xs">
                        {log.actionType.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.userId ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          User #{log.userId}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.deviceId ? (
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Device #{log.deviceId}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.status === "success" ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400">Success</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">Failed</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.details ? (
                        <code className="text-xs bg-accent/20 px-2 py-1 rounded">
                          {JSON.stringify(log.details).substring(0, 50)}...
                        </code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Load More */}
        {(logs?.length || 0) >= limit && (
          <div className="text-center">
            <Button
              onClick={() => setLimit(limit + 50)}
              className="btn-neon"
            >
              Load More Logs
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
