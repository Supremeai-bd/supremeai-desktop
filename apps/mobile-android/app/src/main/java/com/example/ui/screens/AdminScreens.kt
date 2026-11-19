package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.ui.theme.LocalSupremeTokens
import com.example.viewmodel.StudioUiState
import com.example.viewmodel.StudioViewModel

@Composable
fun AdminOverviewScreen(
    uiState: StudioUiState,
    viewModel: StudioViewModel,
    onNavigateMcp: () -> Unit,
    onNavigateOps: () -> Unit,
    onNavigateGov: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    val healthyCount = uiState.mcpServices.count { it.status == "healthy" }
    val activeWorkers = uiState.swarmWorkers.count { it.status == "active" }
    val totalMrr = uiState.customers.sumOf { it.mrr }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Admin Studio Overview", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Federated command plane for MCP Tower, Swarm Ops, FinOps, and Security.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricTile("MCP Nodes", "$healthyCount/${uiState.mcpServices.size}", tokens.success, Modifier.weight(1f))
                MetricTile("Swarm Active", "$activeWorkers/${uiState.swarmWorkers.size}", tokens.accent, Modifier.weight(1f))
                MetricTile("Monthly MRR", "$$totalMrr", tokens.accentSecondary, Modifier.weight(1f))
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Cluster Quick Actions", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { viewModel.probeCluster() }, enabled = !uiState.isProbingCluster, modifier = Modifier.weight(1f).testTag("admin_probe_btn")) {
                            Text(if (uiState.isProbingCluster) "Probing..." else "Probe Cluster")
                        }
                        OutlinedButton(onClick = { viewModel.retryAllDlq() }, modifier = Modifier.weight(1f)) {
                            Text("Retry DLQ")
                        }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = onNavigateMcp, modifier = Modifier.weight(1f)) { Text("MCP Tower") }
                        FilledTonalButton(onClick = onNavigateOps, modifier = Modifier.weight(1f)) { Text("Operations") }
                        FilledTonalButton(onClick = onNavigateGov, modifier = Modifier.weight(1f)) { Text("Governance") }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricTile(label: String, value: String, color: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier) {
    val tokens = LocalSupremeTokens.current
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun AdminMcpTowerScreen(
    uiState: StudioUiState,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("MCP Tower Services", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilledTonalButton(onClick = { viewModel.probeCluster() }, enabled = !uiState.isProbingCluster) {
                        Text(if (uiState.isProbingCluster) "..." else "Probe")
                    }
                    OutlinedButton(onClick = { viewModel.rebootAllMcpServices() }) { Text("Reboot All") }
                }
            }
        }
        items(uiState.mcpServices, key = { it.id }) { svc ->
            val statusColor = when (svc.status) {
                "healthy" -> tokens.success
                "degraded" -> tokens.warning
                else -> tokens.danger
            }
            Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(svc.displayName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        AssistChip(onClick = {}, label = { Text("${svc.status.uppercase()} · ${svc.latencyMs}ms", color = statusColor, style = MaterialTheme.typography.labelSmall) })
                    }
                    Text("${svc.endpoint} · CPU ${svc.cpuPercent}% · ${svc.memoryMb}MB", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    svc.logs.firstOrNull()?.let { log ->
                        Text("[${log.timestamp}] ${log.level}: ${log.message}", fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(onClick = { viewModel.rebootMcpService(svc.id) }, modifier = Modifier.align(Alignment.End)) {
                        Text("Restart Node")
                    }
                }
            }
        }
    }
}

@Composable
fun AdminOperationsScreen(
    uiState: StudioUiState,
    viewModel: StudioViewModel,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var tab by remember { mutableIntStateOf(0) }

    Column(modifier = modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Operations & Telemetry", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        ScrollableTabRow(selectedTabIndex = tab, edgePadding = 0.dp) {
            listOf("Swarm", "Task Queue", "Gateway", "Schema", "Flags", "Keys").forEachIndexed { idx, label ->
                Tab(selected = tab == idx, onClick = { tab = idx }, text = { Text(label) })
            }
        }

        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (tab) {
                0 -> items(uiState.swarmWorkers, key = { it.id }) { worker ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(worker.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(worker.currentTask, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${worker.status.uppercase()} · ${worker.processedCount} tasks · ${worker.successRate}% pass", style = MaterialTheme.typography.labelSmall, color = tokens.accent)
                            }
                            Switch(checked = worker.status == "active", onCheckedChange = { viewModel.toggleSwarmWorker(worker.id) })
                        }
                    }
                }
                1 -> {
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { viewModel.retryAllDlq() }) { Text("Retry All DLQ") }
                            OutlinedButton(onClick = { viewModel.clearCompletedJobs() }) { Text("Clear Completed") }
                        }
                    }
                    items(uiState.queueJobs, key = { it.id }) { job ->
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("${job.taskType} (${job.queueName})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text(job.payloadSummary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Status: ${job.status.uppercase()} · Attempts ${job.attempts}/${job.maxAttempts}", style = MaterialTheme.typography.labelSmall)
                                }
                                if (job.status == "dlq" || job.status == "failed") {
                                    TextButton(onClick = { viewModel.retryQueueJob(job.id) }) { Text("Retry") }
                                }
                            }
                        }
                    }
                }
                2 -> items(uiState.gatewayRoutes, key = { it.id }) { route ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(route.displayName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("${route.primaryProvider} -> ${route.fallbackProvider} · ${route.currentLatencyMs}ms", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = route.autoFailoverActive, onCheckedChange = { viewModel.toggleGatewayFailover(route.id) })
                        }
                    }
                }
                3 -> {
                    item {
                        Button(onClick = { viewModel.runSchemaParitySync() }, modifier = Modifier.fillMaxWidth()) {
                            Text("Run Parity Sync Across Local / Staging / Prod")
                        }
                    }
                    items(uiState.schemaTables, key = { it.id }) { tbl ->
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(tbl.tableName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("Cols L/S/P: ${tbl.localColumns}/${tbl.stagingColumns}/${tbl.prodColumns} · Drift: ${tbl.driftDetected}", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
                4 -> items(uiState.featureFlags, key = { it.key }) { flag ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(flag.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(flag.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = flag.enabled, onCheckedChange = { viewModel.toggleFeatureFlag(flag.key) })
                        }
                    }
                }
                else -> items(uiState.providerKeys, key = { it.id }) { pk ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("${pk.displayName} (${pk.status.uppercase()})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text("${pk.maskedKey} · ${pk.latencyMs}ms · ${pk.rateLimitTpm}", style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AdminGovernanceScreen(
    uiState: StudioUiState,
    viewModel: StudioViewModel,
    onOpenChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = LocalSupremeTokens.current
    var tab by remember { mutableIntStateOf(0) }
    var ipInput by remember { mutableStateOf("") }
    var ipReason by remember { mutableStateOf("") }

    Column(modifier = modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Governance & Security", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Customers") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Firewall") })
            Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text("Audit Log") })
        }

        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (tab) {
                0 -> items(uiState.customers, key = { it.id }) { cust ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${cust.name} (${cust.tier.name})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("${cust.email} · ${cust.tokensUsed / 1000}k/${cust.tokenLimit / 1000}k tokens", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            FilledTonalButton(onClick = {
                                viewModel.impersonateCustomer(cust)
                                onOpenChat()
                            }) {
                                Text("Impersonate")
                            }
                        }
                    }
                }
                1 -> {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Block IP Rule", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                OutlinedTextField(value = ipInput, onValueChange = { ipInput = it }, label = { Text("IPv4 / CIDR") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = ipReason, onValueChange = { ipReason = it }, label = { Text("Reason") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                Button(onClick = {
                                    viewModel.addBlockedIp(ipInput, ipReason)
                                    ipInput = ""; ipReason = ""
                                }, enabled = ipInput.isNotBlank()) { Text("Add Block Rule") }
                            }
                        }
                    }
                    items(uiState.blockedIps, key = { it.ip }) { b ->
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(b.ip, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                                    Text("${b.reason} · ${b.date}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                IconButton(onClick = { viewModel.removeBlockedIp(b.ip) }) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = "Unblock IP")
                                }
                            }
                        }
                    }
                    items(uiState.securityEvents, key = { it.id }) { ev ->
                        Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("${ev.severity.uppercase()} · ${ev.category} (${ev.sourceIp})", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = tokens.warning)
                                Text(ev.description, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
                else -> items(uiState.auditRecords, key = { it.id }) { rec ->
                    Card(colors = CardDefaults.cardColors(containerColor = tokens.glassSurface), border = BorderStroke(1.dp, tokens.glassBorder)) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text("${rec.action} · ${rec.resource}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(rec.details, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${rec.actor} · ${rec.timestamp} · ${rec.ipAddress}", style = MaterialTheme.typography.labelSmall, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}
