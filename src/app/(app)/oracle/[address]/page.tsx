import { OracleDetailsPage } from "@/components/explorer/oracle-details-page";

export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <OracleDetailsPage address={address} />;
}
