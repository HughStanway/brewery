import ArtifactDetailsClient from './ArtifactDetailsClient';

export function generateStaticParams() {
  return [{ name: 'placeholder', version: 'placeholder' }];
}

export default function ArtifactDetailsPage() {
  return <ArtifactDetailsClient />;
}
