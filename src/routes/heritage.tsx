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
  Mail,
  LogIn,
  UserPlus,
  LayoutDashboard,
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

function Section({
  id,
  icon: Icon,
  title,
  image,
  imageAlt,
  imageSide = "right",
  children,
}: {
  id?: string;
  icon: typeof Landmark;
  title: string;
  image?: string;
  imageAlt?: string;
  imageSide?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className={`grid gap-0 ${image ? "md:grid-cols-2" : ""}`}>
        {image && imageSide === "left" && (
          <div className="relative h-64 md:h-auto min-h-[280px]">
            <img
              src={image}
              alt={imageAlt ?? title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          </div>
          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>
        {image && imageSide === "right" && (
          <div className="relative h-64 md:h-auto min-h-[280px] order-first md:order-last">
            <img
              src={image}
              alt={imageAlt ?? title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
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
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/heritage" className="flex items-center shrink-0">
          <Logo variant="horizontal" className="h-14 w-auto max-w-[190px] object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector className="h-9 rounded-10 px-3 border-2" />

          {session ? (
            <Button asChild size="sm" className="h-9 rounded-10 px-4">
              <Link to="/">
                <LayoutDashboard className="h-4 w-4" />
                {t("land.enterApp", "Enter the hub")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex h-9 rounded-10 px-4 border-2"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  <LogIn className="h-4 w-4" />
                  {t("auth.login")}
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="hidden sm:inline-flex h-9 rounded-10 px-4 border-2"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  <UserPlus className="h-4 w-4" />
                  {t("auth.signup")}
                </Link>
              </Button>
            </>
          )}

          <button
            className="lg:hidden h-9 w-9 rounded-lg border p-0 flex items-center justify-center text-gray-600"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-white px-4 py-3 space-y-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-10 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {l.label}
            </a>
          ))}
          {!session && (
            <div className="pt-2 grid gap-2">
              <Button asChild variant="outline" className="w-full rounded-10 border-2">
                <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>
                  <LogIn className="h-4 w-4" />
                  {t("auth.login")}
                </Link>
              </Button>
              <Button asChild className="w-full rounded-10">
                <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                  <UserPlus className="h-4 w-4" />
                  {t("auth.signup")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function LandingFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2">
          <Logo
            variant="horizontal"
            className="h-15 w-auto max-w-[200px] object-contain bg-white/95 rounded-lg "
          />
          <p className="mt-4 text-sm leading-relaxed text-gray-400 max-w-sm">
            {t("auth.taglineSub")}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t("land.footer.modules", "Modules")}
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            {[
              { to: "/", label: t("nav.home") },
              { to: "/community", label: t("nav.community") },
              { to: "/marketplace", label: t("nav.marketplace") },
              { to: "/museum", label: t("nav.museum") },
            ].map((l) => (
              <li key={l.to} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <Link to={l.to} className="hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t("land.footer.explore", "Explore")}
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            {[
              { href: "#story", label: t("land.nav.story", "Our Story") },
              { href: "#origins", label: t("land.nav.origins", "Origins") },
              { href: "#lineages", label: t("land.nav.lineages", "Lineages") },
              { href: "#subtribes", label: t("land.nav.subtribes", "Subtribes") },
            ].map((l) => (
              <li key={l.href} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <a href={l.href} className="hover:text-white transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{t("land.footer.join", "Join us")}</h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="hover:text-white transition-colors"
              >
                {t("auth.createAccount")}
              </Link>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="hover:text-white transition-colors"
              >
                {t("auth.login")}
              </Link>
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <Phone className="h-3.5 w-3.5" />
              +1 (520) 736-1677
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <Mail className="h-3.5 w-3.5" />
              info@banyamulengehub.com
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-gray-500 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
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
  const LINEAGES = LINEAGE_NAMES.map((name, i) => [name, t(`heritage.lineage.${i + 1}`)] as const);

  const heritageOn = isVisible("heritage");
  useEffect(() => {
    if (!isLoading && !heritageOn) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [isLoading, heritageOn, navigate]);

  return (
    <div className="min-h-screen bg-gray-50/70 flex flex-col">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[420px] max-h-[640px] overflow-hidden">
          <img
            src={groupImg}
            alt={t("heritage.hero.imageAlt")}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 h-full flex flex-col justify-center items-start text-left text-white">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Landmark className="h-3.5 w-3.5" />
              {t("heritage.title")}
            </span>

            <h1 className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.05] max-w-3xl drop-shadow">
              {t("heritage.hero.title")}
            </h1>

            <p className="mt-4 max-w-2xl text-sm sm:text-lg text-white/90 leading-relaxed drop-shadow">
              {t("heritage.subtitle")}
            </p>

            <div className="mt-7 flex flex-wrap justify-start gap-3">
              <Button asChild size="lg" className="rounded-10 px-5">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("land.cta.join", "Create your free account")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-10 px-6 border-2 border-white/60 bg-white/10 text-white hover:bg-white hover:text-gray-900"
              >
                <a href="#story">{t("land.cta.read", "Read our story")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-6 flex-1">
        <Section
          id="story"
          icon={Landmark}
          title={t("heritage.intro.title")}
          image={gourdsImg}
          imageAlt={t("heritage.intro.imageAlt")}
          imageSide="right"
        >
          <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p1") }} />
          <p dangerouslySetInnerHTML={{ __html: t("heritage.intro.p2") }} />
        </Section>

        <Section
          id="origins"
          icon={Globe2}
          title={t("heritage.origins.title")}
          image={menHatsImg}
          imageAlt={t("heritage.origins.imageAlt")}
          imageSide="left"
        >
          <p dangerouslySetInnerHTML={{ __html: t("heritage.origins.p1") }} />
          <ul>
            <li>{t("heritage.origins.list1")}</li>
            <li>{t("heritage.origins.list2")}</li>
            <li>{t("heritage.origins.list3")}</li>
            <li>{t("heritage.origins.list4")}</li>
          </ul>
        </Section>

        <Section
          icon={Home}
          title={t("heritage.economy.title")}
          image={clappingImg}
          imageAlt={t("heritage.economy.imageAlt")}
          imageSide="right"
        >
          <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p1") }} />
          <p dangerouslySetInnerHTML={{ __html: t("heritage.economy.p2") }} />
        </Section>

        <Section
          icon={BookOpen}
          title={t("heritage.language.title")}
          image={womenImg}
          imageAlt={t("heritage.language.imageAlt")}
          imageSide="left"
        >
          <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p1") }} />
          <p dangerouslySetInnerHTML={{ __html: t("heritage.language.p2") }} />
        </Section>

        <Section
          id="culture"
          icon={Music2}
          title={t("heritage.culture.title")}
          image={danceImg}
          imageAlt={t("heritage.culture.imageAlt")}
          imageSide="right"
        >
          <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p1") }} />
          <p dangerouslySetInnerHTML={{ __html: t("heritage.culture.p2") }} />
        </Section>

        <Section id="lineages" icon={Users} title={t("heritage.lineages.title")}>
          <p dangerouslySetInnerHTML={{ __html: t("heritage.lineages.p1") }} />
          <div className="grid sm:grid-cols-2 gap-3 not-prose mt-4">
            {LINEAGES.map(([name, note], i) => (
              <div key={name} className="rounded-xl border bg-gray-50/50 p-3 flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{name}</div>
                  <div className="text-xs text-gray-500 leading-snug">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div id="subtribes" className="scroll-mt-24">
          <SubtribesSection />
        </div>

        <Section icon={HeartHandshake} title={t("heritage.hospitality.title")}>
          <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p1") }} />
          <p dangerouslySetInnerHTML={{ __html: t("heritage.hospitality.p2") }} />
        </Section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden rounded-3xl bg-gray-900 text-white p-8 sm:p-12 text-center">
          <div className="absolute inset-0 opacity-20">
            <img src={danceImg} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {t("land.cta.title", "Be part of the story")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
              {t(
                "land.cta.sub",
                "Create a free account to join the community, share your family history, explore the virtual museum and connect with Banyamulenge around the world.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-10 px-6">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("auth.createAccount")}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-10 px-6 border-2 border-white/50 bg-transparent text-white hover:bg-white hover:text-gray-900"
              >
                <Link to="/auth" search={{ mode: "signin" }}>
                  {t("auth.login")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
