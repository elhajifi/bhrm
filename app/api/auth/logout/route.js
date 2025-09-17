import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("user", { path: "/" });
  return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
}
