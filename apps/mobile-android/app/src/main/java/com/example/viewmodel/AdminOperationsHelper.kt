package com.example.viewmodel

import com.example.data.PersistedAdminBundle
import com.example.model.*

object AdminOperationsHelper {
    fun toBundle(state: StudioUiState): PersistedAdminBundle = PersistedAdminBundle(
        customers = state.customers,
        mcpServices = state.mcpServices,
        swarmWorkers = state.swarmWorkers,
        queueJobs = state.queueJobs,
        schemaTables = state.schemaTables,
        gatewayRoutes = state.gatewayRoutes,
        securityEvents = state.securityEvents,
        auditRecords = state.auditRecords,
        featureFlags = state.featureFlags,
        providerKeys = state.providerKeys,
        blockedIps = state.blockedIps,
        platformConfig = state.platformConfig
    )

    fun toggleSwarmWorker(workers: List<SwarmWorker>, id: String): List<SwarmWorker> =
        workers.map { w ->
            if (w.id != id) w
            else {
                val nextStatus = if (w.status == "active") "paused" else "active"
                w.copy(
                    status = nextStatus,
                    logs = (w.logs + "Status toggled to $nextStatus").takeLast(8)
                )
            }
        }

    fun retryQueueJob(jobs: List<TaskQueueJob>, id: String): List<TaskQueueJob> =
        jobs.map { j ->
            if (j.id != id) j
            else j.copy(status = "completed", attempts = j.attempts + 1, errorDetails = null)
        }

    fun retryAllDlq(jobs: List<TaskQueueJob>): List<TaskQueueJob> =
        jobs.map { j ->
            if (j.status == "dlq" || j.status == "failed") {
                j.copy(status = "completed", attempts = j.attempts + 1, errorDetails = null)
            } else j
        }

    fun clearCompletedJobs(jobs: List<TaskQueueJob>): List<TaskQueueJob> =
        jobs.filterNot { it.status == "completed" }

    fun runParitySync(tables: List<SchemaParityTable>): List<SchemaParityTable> =
        tables.map { t ->
            if (t.driftDetected) {
                t.copy(
                    prodColumns = t.localColumns,
                    stagingColumns = t.localColumns,
                    driftDetected = false,
                    driftSummary = null,
                    lastMigrated = "Just now"
                )
            } else t
        }

    fun toggleGatewayFailover(routes: List<LlmGatewayRoute>, id: String): List<LlmGatewayRoute> =
        routes.map { r ->
            if (r.id == id) r.copy(autoFailoverActive = !r.autoFailoverActive) else r
        }

    fun rebootService(services: List<McpTowerService>, id: String): List<McpTowerService> =
        services.map { s ->
            if (s.id != id) s
            else s.copy(
                status = "healthy",
                lastChecked = "Rebooted just now",
                errorCount = 0,
                logs = (s.logs + McpServiceLog("log_${System.currentTimeMillis()}", "Now", "INFO", "Service rebooted cleanly")).takeLast(10)
            )
        }

    fun rebootAllServices(services: List<McpTowerService>): List<McpTowerService> =
        services.map { s ->
            s.copy(
                status = "healthy",
                lastChecked = "Cluster rebooted",
                errorCount = 0
            )
        }
}
