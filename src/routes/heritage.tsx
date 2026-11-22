import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Landmark,
  Users,
  BookOpen,
  Music2,
  HeartHandshake,
  Globe2,
  Home,
  Phone,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Mail,
  LogIn,
  UserPlus,
  LayoutDashboard,
  MapPin,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useModuleSettings } from "@/lib/module-visibility";
import { SubtribesSection } from "@/components/subtribes-section";
import { Logo } from "@/components/logo";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";

import gourdsImg from "@/assets/heritage/gourds.jpeg";
import womenImg from "@/assets/heritage/women.jpeg";
import groupImg from "@/assets/heritage/group.jpeg";
import menHatsImg from "@/assets/heritage/men-hats.jpeg";
import danceImg from "@/assets/heritage/dance.jpeg";
import clappingImg from "@/assets/heritage/clapping.jpeg";

export const Route = createFileRoute("/heritage")({
  head: () => ({
    meta: [
      { title: "Our Heritage - Banyamulenge Community Heritage Hub" },
      {
        name: "description",
        content:
          "Discover the history, culture, lineages and living traditions of the Banyamulenge people - open to everyone.",
      },
      { property: "og:title", content: "Our Heritage - Banyamulenge Community Heritage Hub" },
      {
        property: "og:description",
        content: "History, culture and lineages of the Banyamulenge people.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HeritageLanding,
});

const LINEAGE_NAMES = [
  "Abagorora",
  "Abasinzira",
  "Abega",
  "Abasita",
  "Abasegege",
  "Abanyabzinshi",
  "Abasama",
  "Abitira",
  "Abahondogo",
  "Abazigaba",
  "Abadasomera",
  "Abahima",
  "Abadahugwa",
  "Abazoza",
  "Abasinga",
  "Abapfurika",
  "Abashonga",
  "Abahinda",
  "Abatura",
  "Abatakure",
  "Abahiga",
  "Ababano",
  "Abagabika",
  "Abadinzi",
  "Abongera",
  "Abanyakarama",
  "Abaheto",
  "Abatwari",
];

const primaryButton =
  "rounded-full border-0 bg-heritage px-6 text-heritage-foreground shadow-lg shadow-heritage/20 hover:bg-heritage-deep";
const secondaryButton =
  "rounded-full border-heritage/20 bg-card/85 px-6 text-heritage shadow-none backdrop-blur hover:border-heritage/40 hover:bg-card hover:text-heritage-deep";

function splitHeroTitle(title: string) {
  const words = title.trim().split(" ");
  if (words.length === 1) return { lead: "", accent: title };
  return { lead: words.slice(0, -1).join(" "), accent: words.at(-1) ?? "" };
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div
        className={`flex items-center gap-3 ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        <span className="h-px w-8 bg-heritage" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-heritage">{eyebrow}</p>
        {align === "center" && <span className="h-px w-8 bg-heritage" />}
      </div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-heritage-ink sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7 text-heritage-muted sm:text-base">{description}</p>
      )}
    </div>
  );
}

function LandingNavbar() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#story", label: t("land.nav.story", "Our Story") },
    { href: "#origins", label: t("land.nav.origins", "Origins") },
    { href: "#culture", label: t("land.nav.culture", "Culture") },
    { href: "#lineages", label: t("land.nav.lineages", "Lineages") },
    { href: "#subtribes", label: t("land.nav.subtribes", "Subtribes") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-heritage/10 bg-card/95 backdrop-blur-xl">
      <div className="relative mx-auto flex h-[76px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/heritage" className="flex shrink-0 items-center" aria-label="Banyamulenge Heritage Hub">
          <Logo variant="horizontal" className="h-14 w-auto max-w-[190px] object-contain" />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 xl:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-heritage-muted transition hover:bg-heritage-soft hover:text-heritage"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="tel:+15207361677"
            aria-label="+1 (520) 736-1677"
            className="mr-1 hidden h-10 w-10 place-items-center rounded-full bg-heritage-soft text-heritage transition hover:bg-heritage hover:text-heritage-foreground min-[1700px]:grid"
          >
            <Phone className="h-4 w-4" />
          </a>
          <LanguageSelector className="h-10 rounded-full border-heritage/15 px-3 text-heritage-ink hover:border-heritage/35 hover:bg-heritage-soft" />

          {session ? (
            <Button asChild size="sm" className={`hidden h-10 sm:inline-flex ${primaryButton}`}>
              <Link to="/">
                <LayoutDashboard className="h-4 w-4" />
                {t("land.enterApp", "Enter the hub")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="hidden h-10 rounded-full px-3 text-heritage-ink hover:bg-heritage-soft hover:text-heritage sm:inline-flex"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  <LogIn className="h-4 w-4" />
                  {t("auth.login")}
                </Link>
              </Button>
              <Button asChild size="sm" className={`hidden h-10 sm:inline-flex ${primaryButton}`}>
                <Link to="/auth" search={{ mode: "signup" }}>
                  <UserPlus className="h-4 w-4" />
                  {t("auth.signup")}
                </Link>
              </Button>
            </>
          )}

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-heritage/15 p-0 text-heritage-ink transition hover:bg-heritage-soft xl:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-heritage/10 bg-card px-4 py-4 xl:hidden">
          <nav className="mx-auto max-w-7xl space-y-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-heritage-ink transition hover:bg-heritage-soft hover:text-heritage"
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ))}
            {!session && (
              <div className="grid grid-cols-2 gap-2 pt-3">
                <Button asChild variant="outline" className={`w-full ${secondaryButton}`}>
                  <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>
                    <LogIn className="h-4 w-4" />
                    {t("auth.login")}
                  </Link>
                </Button>
                <Button asChild className={`w-full ${primaryButton}`}>
                  <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                    <UserPlus className="h-4 w-4" />
                    {t("auth.signup")}
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function DiscoveryPanel() {
  const { t } = useI18n();
  const { session } = useAuth();
  const links = [
    { href: "#story", label: t("land.nav.story", "Our Story"), icon: Landmark },
    { href: "#origins", label: t("land.nav.origins", "Origins"), icon: Globe2 },
    { href: "#culture", label: t("land.nav.culture", "Culture"), icon: Music2 },
    { href: "#lineages", label: t("land.nav.lineages", "Lineages"), icon: Users },
    { href: "#subtribes", label: t("land.nav.subtribes", "Subtribes"), icon: HeartHandshake },
  ];

  return (
    <div className="relative z-20 mx-auto -mt-16 w-full max-w-7xl px-4 sm:-mt-20 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[26px] border border-heritage/10 bg-card shadow-2xl shadow-heritage-ink/10">
        <nav className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:grid-cols-5">
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="group flex items-center justify-center gap-2 rounded-2xl px-3 py-3.5 text-center text-xs font-semibold text-heritage-muted transition hover:bg-heritage-soft hover:text-heritage sm:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-heritage" />
              {label}
            </a>
          ))}
        </nav>
        <div className="grid gap-3 border-t border-heritage/10 bg-heritage-soft/45 px-5 py-4 text-xs sm:grid-cols-[1fr_1.3fr_auto] sm:items-center sm:px-6">
          <a
            href="tel:+15207361677"
            className="flex items-center gap-2 font-medium text-heritage-muted transition hover:text-heritage"
          >
            <Phone className="h-4 w-4 shrink-0 text-heritage" />
            +1 (520) 736-1677
          </a>
          <a
            href="mailto:info@banyamulengehub.com"
            className="flex min-w-0 items-center gap-2 break-all font-medium text-heritage-muted transition hover:text-heritage"
          >
            <Mail className="h-4 w-4 shrink-0 text-heritage" />
            info@banyamulengehub.com
          </a>
          <Button asChild size="sm" className={primaryButton}>
            {session ? (
              <Link to="/">
                {t("land.enterApp", "Enter the hub")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("auth.createAccount")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeritageHighlights() {
  const { t } = useI18n();
  const items = [
    { href: "#story", icon: BookOpen, label: t("heritage.intro.title") },
    { href: "#origins", icon: Globe2, label: t("heritage.origins.title") },
    { href: "#language", icon: Landmark, label: t("heritage.language.title") },
    { href: "#hospitality", icon: HeartHandshake, label: t("heritage.hospitality.title") },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-12">
      {items.map(({ href, icon: Icon, label }) => (
        <a key={href} href={href} className="group flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-heritage-soft text-heritage transition group-hover:bg-heritage group-hover:text-heritage-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold leading-5 text-heritage-ink transition group-hover:text-heritage">
            {label}
          </span>
        </a>
      ))}
    </div>
  );
}

function ChapterCard({
  id,
  number,
  icon: Icon,
  title,
  image,
  imageAlt,
  children,
}: {
  id?: string;
  number: string;
  icon: typeof Landmark;
  title: string;
  image: string;
  imageAlt: string;
  children: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="group scroll-mt-28 overflow-hidden rounded-[28px] border border-heritage/10 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-heritage-ink/10"
    >
      <div className="relative h-60 overflow-hidden sm:h-64">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/55 via-transparent to-transparent" />
        <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-card/50 bg-card/90 px-3 py-1.5 text-xs font-bold text-heritage shadow-sm backdrop-blur">
          <Icon className="h-3.5 w-3.5" />
          {number}
        </span>
      </div>
      <div className="p-6 sm:p-7">
        <h3 className="text-xl font-semibold tracking-tight text-heritage-ink sm:text-2xl">{title}</h3>
        <div className="mt-4 space-y-4 text-sm leading-7 text-heritage-muted [&_em]:text-heritage [&_strong]:font-semibold [&_strong]:text-heritage-ink">
          {children}
        </div>
      </div>
    </article>
  );
}

function LandingFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-heritage-ink text-card/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-6 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-2">
          <Logo
            variant="horizontal"
            className="h-16 w-auto max-w-[210px] rounded-xl bg-card object-contain p-1"
          />
          <p className="mt-5 max-w-sm text-sm leading-7 text-card/60">{t("auth.taglineSub")}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card">{t("land.footer.modules", "Modules")}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { to: "/", label: t("nav.home") },
              { to: "/community", label: t("nav.community") },
              { to: "/marketplace", label: t("nav.marketplace") },
              { to: "/museum", label: t("nav.museum") },
            ].map((link) => (
              <li key={link.to} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-heritage-glow" />
                <Link to={link.to} className="transition-colors hover:text-card">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card">{t("land.footer.explore", "Explore")}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { href: "#story", label: t("land.nav.story", "Our Story") },
              { href: "#origins", label: t("land.nav.origins", "Origins") },
              { href: "#lineages", label: t("land.nav.lineages", "Lineages") },
              { href: "#subtribes", label: t("land.nav.subtribes", "Subtribes") },
            ].map((link) => (
              <li key={link.href} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-heritage-glow" />
                <a href={link.href} className="transition-colors hover:text-card">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-card">{t("land.footer.join", "Join us")}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-heritage-glow" />
              <Link to="/auth" search={{ mode: "signup" }} className="transition-colors hover:text-card">
                {t("auth.createAccount")}
              </Link>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-heritage-glow" />
              <Link to="/auth" search={{ mode: "signin" }} className="transition-colors hover:text-card">
                {t("auth.login")}
              </Link>
            </li>
            <li>
              <a href="tel:+15207361677" className="flex items-center gap-2 transition-colors hover:text-card">
                <Phone className="h-3.5 w-3.5" />
                +1 (520) 736-1677
              </a>
            </li>
            <li>
              <a
                href="mailto:info@banyamulengehub.com"
                className="flex items-center gap-2 break-all transition-colors hover:text-card"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                info@banyamulengehub.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-card/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-card/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            © {year} Banyamulenge Heritage Hub. {t("land.footer.rights", "All rights reserved.")}
          </span>
          <span>{t("auth.tagline")}</span>
        </div>
      </div>
    </footer>
  );
}

function HeritageLanding() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isVisible, isLoading } = useModuleSettings();
  const [showAllLineages, setShowAllLineages] = useState(false);
  const lineages = LINEAGE_NAMES.map((name, index) => [name, t(`heritage.lineage.${index + 1}`)] as const);
  const heroTitle = splitHeroTitle(t("heritage.hero.title"));

  const heritageOn = isVisible("heritage");
  useEffect(() => {
    if (!isLoading && !heritageOn) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [isLoading, heritageOn, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-heritage text-heritage-ink">
      <LandingNavbar />

      <section className="relative isolate overflow-hidden bg-heritage-soft">
        <img
          src={groupImg}
          alt={t("heritage.hero.imageAlt")}
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-heritage-soft/35 via-transparent to-card/10" />

        <div className="relative z-10 mx-auto flex min-h-[610px] max-w-7xl items-center px-4 pb-32 pt-16 sm:min-h-[650px] sm:px-6 sm:pb-36 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-heritage/15 bg-card/85 px-4 py-2 text-xs font-semibold text-heritage shadow-sm backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              {t("heritage.title")}
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-heritage-ink sm:text-6xl lg:text-7xl">
              {heroTitle.lead && <span className="block">{heroTitle.lead}</span>}
              <span className="mt-1 block font-heritage-script text-[1.45em] font-normal leading-[0.95] tracking-normal text-heritage">
                {heroTitle.accent}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-heritage-muted sm:text-base">
              {t("heritage.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className={primaryButton}>
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("land.cta.join", "Create your free account")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={secondaryButton}>
                <a href="#story">
                  {t("land.cta.read", "Read our story")}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <DiscoveryPanel />
      <HeritageHighlights />

      <main className="flex-1">
        <section id="story" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading eyebrow={t("land.nav.story", "Our Story")} title={t("heritage.intro.title")} />
          <div className="mt-9 grid items-stretch gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center rounded-[28px] border border-heritage/10 bg-card p-7 shadow-sm sm:p-10">
              <div className="space-y-5 text-sm leading-8 text-heritage-muted sm:text-base [&_em]:text-heritage [&_strong]:font-semibold [&_strong]:text-heritage-ink">
                <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p1") }} />
                <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p2") }} />
              </div>
              <a
                href="#origins"
                className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-heritage transition hover:gap-3"
              >
                {t("land.nav.origins", "Origins")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="relative min-h-[360px] overflow-hidden rounded-[28px] shadow-xl shadow-heritage-ink/10 sm:min-h-[440px]">
              <img
                src={gourdsImg}
                alt={t("heritage.intro.imageAlt")}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/50 via-transparent to-transparent" />
              <span className="absolute bottom-5 left-5 grid h-12 w-12 place-items-center rounded-full bg-card text-heritage shadow-lg">
                <Landmark className="h-5 w-5" />
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading
            eyebrow={t("land.footer.explore", "Explore")}
            title={t("heritage.title")}
            description={t("heritage.subtitle")}
          />
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <ChapterCard
              id="origins"
              number="01"
              icon={Globe2}
              title={t("heritage.origins.title")}
              image={menHatsImg}
              imageAlt={t("heritage.origins.imageAlt")}
            >
              <p dangerouslySetInnerHTML={{ __html: t("heritage.origins.p1") }} />
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  t("heritage.origins.list1"),
                  t("heritage.origins.list2"),
                  t("heritage.origins.list3"),
                  t("heritage.origins.list4"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-2xl bg-heritage-soft/70 p-3 text-xs leading-5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-heritage" />
                    {item}
                  </li>
                ))}
              </ul>
            </ChapterCard>

            <ChapterCard
              id="economy"
              number="02"
              icon={Home}
              title={t("heritage.economy.title")}
              image={clappingImg}
              imageAlt={t("heritage.economy.imageAlt")}
            >
              <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p1") }} />
              <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p2") }} />
            </ChapterCard>

            <ChapterCard
              id="language"
              number="03"
              icon={BookOpen}
              title={t("heritage.language.title")}
              image={womenImg}
              imageAlt={t("heritage.language.imageAlt")}
            >
              <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p1") }} />
              <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p2") }} />
            </ChapterCard>

            <ChapterCard
              id="culture"
              number="04"
              icon={Music2}
              title={t("heritage.culture.title")}
              image={danceImg}
              imageAlt={t("heritage.culture.imageAlt")}
            >
              <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p1") }} />
              <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p2") }} />
            </ChapterCard>
          </div>
        </section>

        <section id="lineages" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <div className="rounded-[32px] border border-heritage/10 bg-heritage-soft/65 p-6 sm:p-9 lg:p-12">
            <SectionHeading eyebrow={t("land.nav.lineages", "Lineages")} title={t("heritage.lineages.title")} />
            <div
              className="mt-4 max-w-3xl text-sm leading-7 text-heritage-muted [&_em]:text-heritage [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: t("heritage.lineages.p1") }}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(showAllLineages ? lineages : lineages.slice(0, 4)).map(([name, note], index) => (
                <article
                  key={name}
                  className="group rounded-[22px] border border-heritage/10 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-heritage/30 hover:shadow-lg hover:shadow-heritage/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-heritage-soft text-xs font-bold text-heritage">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-heritage/35 transition group-hover:text-heritage" />
                  </div>
                  <h3 className="mt-5 font-semibold text-heritage-ink">{name}</h3>
                  <p className="mt-2 text-xs leading-6 text-heritage-muted">{note}</p>
                </article>
              ))}
            </div>
            {lineages.length > 4 && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  className={secondaryButton}
                  onClick={() => setShowAllLineages((value) => !value)}
                >
                  {showAllLineages
                    ? t("heritage.lineages.seeLess", "See fewer lineages")
                    : t("heritage.lineages.seeMore", "See more lineages")}
                  {showAllLineages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section id="subtribes" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <SubtribesSection />
        </section>

        <section id="hospitality" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionHeading eyebrow={t("heritage.title")} title={t("heritage.hospitality.title")} />
              <div className="mt-6 space-y-5 text-sm leading-8 text-heritage-muted sm:text-base [&_strong]:font-semibold [&_strong]:text-heritage-ink">
                <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p1") }} />
                <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p2") }} />
              </div>
            </div>
            <div className="relative min-h-[390px] overflow-hidden rounded-[30px] shadow-2xl shadow-heritage-ink/15">
              <img src={groupImg} alt={t("heritage.hero.imageAlt")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-heritage-ink/85 via-heritage-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-card sm:p-9">
                <HeartHandshake className="h-8 w-8 text-heritage-glow" />
                <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight">
                  {t("land.cta.title", "Be part of the story")}
                </h2>
                <Button asChild className="mt-6 rounded-full bg-card px-6 text-heritage hover:bg-heritage-soft">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {t("auth.createAccount")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-heritage to-heritage-deep px-6 py-10 text-card shadow-2xl shadow-heritage/20 sm:px-10 lg:px-14">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-card/5" />
            <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full border-[30px] border-card/5" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("land.cta.title", "Be part of the story")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-card/75">
                  {t(
                    "land.cta.sub",
                    "Create a free account to join the community, share your family history, explore the virtual museum and connect with Banyamulenge around the world.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-card px-6 text-heritage hover:bg-heritage-soft">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {t("auth.createAccount")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-card/35 bg-transparent px-6 text-card hover:bg-card/10 hover:text-card"
                >
                  <Link to="/auth" search={{ mode: "signin" }}>
                    {t("auth.login")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
