import OperationsNav from '@/components/OperationsNav';

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingBottom: '80px' }}>
      {children}
      <OperationsNav />
    </div>
  );
}
