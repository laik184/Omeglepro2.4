class LoadBalancer {
  constructor() {
    this.servers = [];
    this.currentIndex = 0;
    this.userServerMap = new Map();
    this.serverLoads = new Map();
    this.healthChecks = new Map();
  }

  registerServer(serverId, capacity = 100) {
    this.servers.push({
      id: serverId,
      capacity,
      currentLoad: 0,
      healthy: true,
      lastHealthCheck: Date.now()
    });

    this.serverLoads.set(serverId, {
      users: new Set(),
      connections: 0,
      lastUpdate: Date.now()
    });

    console.log(`Server ${serverId} registered with capacity ${capacity}`);
  }

  getServerForUser(userId) {
    if (this.userServerMap.has(userId)) {
      const serverId = this.userServerMap.get(userId);
      const server = this.servers.find(s => s.id === serverId);
      if (server && server.healthy) {
        return serverId;
      }
    }

    const server = this.selectServer();
    if (server) {
      this.assignUserToServer(userId, server.id);
      return server.id;
    }

    return null;
  }

  selectServer() {
    const healthyServers = this.servers.filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      console.error('No healthy servers available!');
      return this.servers[0] || null;
    }

    healthyServers.sort((a, b) => {
      const loadA = a.currentLoad / a.capacity;
      const loadB = b.currentLoad / b.capacity;
      return loadA - loadB;
    });

    return healthyServers[0];
  }

  assignUserToServer(userId, serverId) {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    if (this.userServerMap.has(userId)) {
      const oldServerId = this.userServerMap.get(userId);
      this.removeUserFromServer(userId, oldServerId);
    }

    this.userServerMap.set(userId, serverId);
    server.currentLoad++;

    const serverLoad = this.serverLoads.get(serverId);
    serverLoad.users.add(userId);
    serverLoad.connections++;
    serverLoad.lastUpdate = Date.now();

    console.log(`User ${userId} assigned to server ${serverId}. Load: ${server.currentLoad}/${server.capacity}`);
  }

  removeUserFromServer(userId, serverId = null) {
    const targetServerId = serverId || this.userServerMap.get(userId);
    if (!targetServerId) return;

    const server = this.servers.find(s => s.id === targetServerId);
    if (server) {
      server.currentLoad = Math.max(0, server.currentLoad - 1);
    }

    const serverLoad = this.serverLoads.get(targetServerId);
    if (serverLoad) {
      serverLoad.users.delete(userId);
      serverLoad.connections = Math.max(0, serverLoad.connections - 1);
      serverLoad.lastUpdate = Date.now();
    }

    this.userServerMap.delete(userId);

    console.log(`User ${userId} removed from server ${targetServerId}. Load: ${server?.currentLoad || 0}/${server?.capacity || 0}`);
  }

  markServerHealth(serverId, healthy) {
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      server.healthy = healthy;
      server.lastHealthCheck = Date.now();
      
      if (!healthy) {
        console.warn(`Server ${serverId} marked as unhealthy`);
        this.redistributeUsers(serverId);
      }
    }
  }

  redistributeUsers(failedServerId) {
    const serverLoad = this.serverLoads.get(failedServerId);
    if (!serverLoad) return;

    const usersToRedistribute = Array.from(serverLoad.users);
    
    for (const userId of usersToRedistribute) {
      const newServer = this.selectServer();
      if (newServer && newServer.id !== failedServerId) {
        this.assignUserToServer(userId, newServer.id);
      }
    }

    console.log(`Redistributed ${usersToRedistribute.length} users from failed server ${failedServerId}`);
  }

  getServerStats(serverId = null) {
    if (serverId) {
      const server = this.servers.find(s => s.id === serverId);
      const load = this.serverLoads.get(serverId);
      
      return {
        server,
        load: load ? {
          users: Array.from(load.users),
          connections: load.connections,
          utilizationPercent: server ? (server.currentLoad / server.capacity * 100).toFixed(2) : 0
        } : null
      };
    }

    return {
      totalServers: this.servers.length,
      healthyServers: this.servers.filter(s => s.healthy).length,
      totalUsers: this.userServerMap.size,
      servers: this.servers.map(server => ({
        id: server.id,
        capacity: server.capacity,
        currentLoad: server.currentLoad,
        healthy: server.healthy,
        utilizationPercent: (server.currentLoad / server.capacity * 100).toFixed(2)
      }))
    };
  }

  autoScale(scaleUpThreshold = 0.8, scaleDownThreshold = 0.3) {
    const stats = this.getServerStats();
    const avgUtilization = stats.servers.reduce((sum, s) => 
      sum + parseFloat(s.utilizationPercent), 0) / stats.servers.length / 100;

    if (avgUtilization > scaleUpThreshold) {
      return {
        action: 'SCALE_UP',
        reason: `Average utilization ${(avgUtilization * 100).toFixed(2)}% exceeds threshold ${scaleUpThreshold * 100}%`,
        currentServers: stats.totalServers,
        recommendedServers: stats.totalServers + 1
      };
    }

    if (avgUtilization < scaleDownThreshold && stats.totalServers > 1) {
      return {
        action: 'SCALE_DOWN',
        reason: `Average utilization ${(avgUtilization * 100).toFixed(2)}% below threshold ${scaleDownThreshold * 100}%`,
        currentServers: stats.totalServers,
        recommendedServers: Math.max(1, stats.totalServers - 1)
      };
    }

    return {
      action: 'MAINTAIN',
      reason: `Utilization ${(avgUtilization * 100).toFixed(2)}% is optimal`,
      currentServers: stats.totalServers
    };
  }
}

const loadBalancer = new LoadBalancer();

loadBalancer.registerServer('primary-server', 1000);

if (process.env.ENABLE_MULTI_SERVER === 'true') {
  loadBalancer.registerServer('secondary-server', 1000);
  loadBalancer.registerServer('tertiary-server', 1000);
}

export { loadBalancer, LoadBalancer };
