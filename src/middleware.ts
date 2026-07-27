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

function loginDaArea(prefixo: string) {
  if (prefixo === "/dono" || prefixo === "/api/dono") return "/admin";
  if (prefixo === "/restaurante" || prefixo === "/api/restaurante") {
    return "/login/restaurante";
  }
  if (prefixo === "/entregador") return "/login/entregador";
  if (prefixo === "/cliente") return "/login/cliente";
  return "/login";
}

/** Protege cada área pelo papel — Admin (dono) acessa todas */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessao = lerSessaoDoCookie(request);

  if (pathname === "/cliente" || pathname === "/cliente/") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const regras: { prefixo: string; papeis: SessaoUsuario["papel"][] }[] = [
    { prefixo: "/cliente", papeis: ["cliente", "dono"] },
    { prefixo: "/restaurante", papeis: ["restaurante", "dono"] },
    { prefixo: "/entregador", papeis: ["entregador", "dono"] },
    { prefixo: "/dono", papeis: ["dono"] },
    { prefixo: "/api/dono", papeis: ["dono"] },
    { prefixo: "/api/restaurante", papeis: ["restaurante", "dono"] },
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
        url.pathname = loginDaArea(regra.prefixo);
        if (url.pathname.startsWith("/login")) {
          url.searchParams.set("next", pathname);
        }
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
        url.pathname = loginDaArea(regra.prefixo);
        if (url.pathname.startsWith("/login")) {
          url.searchParams.set("erro", "sem_permissao");
        }
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
