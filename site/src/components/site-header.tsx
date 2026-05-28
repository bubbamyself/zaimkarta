import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-xl font-bold tracking-normal">
          ZaimKarta
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
      </div>
    </header>
  );
}
