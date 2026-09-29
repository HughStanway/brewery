import CascadeDetailsClient from './CascadeDetailsClient';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default function CascadeDetailsPage() {
  return <CascadeDetailsClient />;
}
