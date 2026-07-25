import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, type SessaoUsuario } from "@/lib/auth";

function lerSessaoDoCookie(req: NextRequest): SessaoUsuario | null {
  const bruto = req.cookies.get(COOKIE_SESSAO)?.value;
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as SessaoUsuario;
  } catch {
    return null;
  }
}

/** Protege cada área pelo papel do usuário logado */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessao = lerSessaoDoCookie(request);

  const regras: { prefixo: string; papeis: SessaoUsuario["papel"][] }[] = [
    { prefixo: "/cliente", papeis: ["cliente"] },
    { prefixo: "/restaurante", papeis: ["restaurante"] },
    { prefixo: "/entregador", papeis: ["entregador"] },
    { prefixo: "/dono", papeis: ["dono"] },
    { prefixo: "/api/dono", papeis: ["dono"] },
    { prefixo: "/api/restaurante", papeis: ["restaurante"] },
  ];

  for (const regra of regras) {
    if (
      pathname === regra.prefixo ||
      pathname.startsWith(`${regra.prefixo}/`)
    ) {
      if (!sessao) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { erro: "Faça login para continuar." },
            { status: 401 },
          );
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }

      if (!regra.papeis.includes(sessao.papel)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { erro: "Você não tem permissão para esta área." },
            { status: 403 },
          );
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("erro", "sem_permissao");
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/cliente/:path*",
    "/restaurante/:path*",
    "/entregador/:path*",
    "/dono/:path*",
    "/api/dono/:path*",
    "/api/restaurante/:path*",
  ],
};
