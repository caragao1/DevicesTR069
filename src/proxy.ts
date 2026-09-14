import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

const PUBLIC_PATHS = ["/login"];

// Consulta (leitura) é pública: qualquer pessoa pode navegar por
// fabricantes e modelos sem login. Cadastrar/editar/excluir continua
// exigindo sessão (e Server Actions revalidam isso de forma independente,
// como defesa em profundidade).
const MODEL_DETAIL_PATTERN = /^\/models\/[^/]+$/;

function isPublicReadPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/fabricantes/")) return true;
  if (pathname !== "/models/new" && MODEL_DETAIL_PATTERN.test(pathname)) {
    return true;
  }
  if (pathname === "/capacidades") return true;
  if (pathname.startsWith("/capacidades/registro/")) return true;
  if (
    pathname.startsWith("/capacidades/") &&
    pathname !== "/capacidades/registrar" &&
    !pathname.startsWith("/capacidades/registrar/")
  ) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    isPublicReadPath(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
