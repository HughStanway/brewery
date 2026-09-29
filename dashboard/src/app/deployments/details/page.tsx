'use client';

import React, { Suspense } from 'react';
import DeploymentDetailsClient from '../[id]/DeploymentDetailsClient';

export default function DeploymentDetailsStaticPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading deployment details...</p>
      </div>
    }>
      <DeploymentDetailsClient />
    </Suspense>
  );
}
