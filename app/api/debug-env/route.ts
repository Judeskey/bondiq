export async function GET() {
    return Response.json({
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      HAS_SECRET: !!process.env.NEXTAUTH_SECRET,
    });
  }
  