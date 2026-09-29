import DeploymentDetailsClient from './DeploymentDetailsClient';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function DeploymentDetailsPage() {
  return <DeploymentDetailsClient />;
}
