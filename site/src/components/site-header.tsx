import Link from "next/link";
import Image from "next/image";
import { RegionRegistrationControl } from "@/components/region-registration-control";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/ZK_Logo.png"
            alt="ZaimKarta"
            width={210}
            height={70}
            priority
            className="h-14 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <Link href="/#offers" className="hover:text-slate-950">
            Предложения
          </Link>
          <Link href="/#categories" className="hover:text-slate-950">
            Категории
          </Link>
          <Link href="/#services" className="hover:text-slate-950">
            Сервисы
          </Link>
          <Link href="/#articles" className="hover:text-slate-950">
            Статьи
          </Link>
        </nav>
        <RegionRegistrationControl />
      </div>
    </header>
  );
}
