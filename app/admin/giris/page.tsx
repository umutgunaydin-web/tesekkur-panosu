import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ yetki?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F2FB] px-4">
      <LoginForm denied={params.yetki === "yok"} />
    </main>
  );
}
