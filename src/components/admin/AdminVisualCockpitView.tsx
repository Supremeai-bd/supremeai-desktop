import React from 'react';
import { AdminArchitectureTopologyView } from './AdminArchitectureTopologyView';
import { VisualQueueConveyor } from './VisualQueueConveyor';
import { ProviderRadar } from './ProviderRadar';

export const AdminVisualCockpitView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-200">
      <AdminArchitectureTopologyView />
      <VisualQueueConveyor />
      <ProviderRadar />
    </div>
  );
};

export default AdminVisualCockpitView;
