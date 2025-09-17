import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");

  if (!userCookie) {
    return new Response(JSON.stringify({ user: null }), { status: 200 });
  }

  try {
    const user = JSON.parse(userCookie.value);
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ user: null }), { status: 200 });
  }
}
