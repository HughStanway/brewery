import BuildDetailsClient from './BuildDetailsClient';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function BuildDetailsPage() {
  return <BuildDetailsClient />;
}
