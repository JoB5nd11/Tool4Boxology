export function inferLinkCategory(fromData: any, toData: any): string | undefined {
  const isCard = (d: any) => d?.category === 'beamCard';
  return (isCard(fromData) || isCard(toData)) ? 'annotation' : undefined;
}
